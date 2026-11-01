const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const Contribution = require("../models/Contribution");
const asyncHandler = require("../middleware/asyncHandler");
const { monthRange } = require("./transactionController");

const currentMonth = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

// Extract a monetary amount from free text. Bare numbers (e.g. "25") are accepted
// and treated as the user's configured currency.
const extractAmount = (text) => {
  const patterns = [
    /(?:(?<=\s|^)\$(\d+(?:\.\d+)?)(?=\s|$|[.,!?]))/i,
    /(?:(?<=\s|^)Rs\s*(\d+(?:\.\d+)?)(?=\s|$|[.,!?]))/i,
    /(?:(?<=\s|^)(?:rupees?|dollars?|bucks?)\s*(\d+(?:\.\d+)?)(?=\s|$|[.,!?]))/i,
    /(?:(?<=\s|^)(\d+(?:\.\d+)?)\s*(?:rupees?|dollars?|bucks?)(?=\s|$|[.,!?]))/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return parseFloat(m[1]);
  }

  // Bare number fallback: "add 25 for lunch" -> 25
  const numbers = text.match(/\d+(?:\.\d+)?/g);
  if (numbers) {
    for (const raw of numbers) {
      const n = parseFloat(raw);
      // Skip 4-digit years like 2026
      if (raw.length === 4 && n >= 1000 && n <= 2100) continue;
      return n;
    }
  }
  return null;
};

// Extract a relative or absolute date from free text. Defaults to today.
const extractDate = (text) => {
  const lower = text.toLowerCase();
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  // ISO date: 2026-10-25
  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const d = new Date(Date.UTC(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)));
    if (!isNaN(d.getTime())) return d;
  }

  // Month day: "October 25", "oct 25"
  const monthNames = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const md = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})\b/);
  if (md) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), monthNames[md[1]], parseInt(md[2], 10)));
    if (!isNaN(d.getTime())) return d;
  }

  if (lower.match(/\byesterday\b/)) {
    const d = new Date(now); d.setUTCDate(now.getUTCDate() - 1); return d;
  }
  if (lower.match(/\btomorrow\b/)) {
    const d = new Date(now); d.setUTCDate(now.getUTCDate() + 1); return d;
  }
  if (lower.match(/\btoday\b/)) return now;

  const daysAgo = lower.match(/\b(\d+)\s+days?\s+ago\b/);
  if (daysAgo) {
    const d = new Date(now); d.setUTCDate(now.getUTCDate() - parseInt(daysAgo[1], 10)); return d;
  }
  if (lower.match(/\blast week\b/)) {
    const d = new Date(now); d.setUTCDate(now.getUTCDate() - 7); return d;
  }

  // Next weekday: "next monday"
  const weekdays = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const wd = lower.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (wd) {
    const target = weekdays[wd[1]];
    const d = new Date(now);
    let diff = target - d.getUTCDay();
    if (diff <= 0) diff += 7;
    d.setUTCDate(now.getUTCDate() + diff);
    return d;
  }

  return now;
};

// Detect a month reference: "this month", "last month", "October 2026", "2026-10"
const extractMonth = (text) => {
  const lower = text.toLowerCase();
  const now = new Date();
  const cur = currentMonth();

  if (lower.includes("this month")) return cur;
  if (lower.includes("last month")) {
    const [y, m] = cur.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const m = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})\b/);
  if (m) {
    const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const mon = months[m[1]];
    const year = parseInt(m[2], 10);
    return `${year}-${String(mon).padStart(2, "0")}`;
  }

  const m2 = text.match(/\b(\d{4})-(\d{1,2})\b/);
  if (m2) {
    const year = parseInt(m2[1], 10);
    const mon = parseInt(m2[2], 10);
    if (mon >= 1 && mon <= 12) return `${year}-${String(mon).padStart(2, "0")}`;
  }

  return cur;
};

const detectType = (text) => {
  const lower = text.toLowerCase();
  const incomeWords = ["income", "earned", "salary", "received", "deposit", "profit"];
  const expenseWords = ["expense", "spent", "spend", "paid", "purchase", "cost", "bought"];
  let income = 0, expense = 0;
  incomeWords.forEach((w) => { if (lower.includes(w)) income++; });
  expenseWords.forEach((w) => { if (lower.includes(w)) expense++; });
  if (income > expense) return "income";
  if (expense > income) return "expense";
  return null;
};

const findCategoryByName = (text, categories) => {
  const lower = text.toLowerCase();
  let best = null;
  categories.forEach((c) => {
    const name = c.name.toLowerCase();
    if (lower.includes(name) && (!best || name.length > best.name.length)) {
      best = c;
    }
  });
  return best;
};

const formatCurrency = (amount, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount || 0);
  } catch (e) {
    return `${amount || 0}`;
  }
};

const HELP_TEXT = `Here's what I can help you with:

• "How much did I spend last month?" — monthly summary
• "Groceries spending in October" — spending by category
• "Show my income vs expense trend" — yearly trend
• "What are my categories?" — list your categories
• "Add 25 for lunch under Food" — log a new transaction (you confirm first)
• "Add 20 for dinner yesterday" — log with a past or future date
• "Did I spend more than last month?" — month-over-month comparison
• "Am I over budget on dining?" — budget check
• "Am I on track for my vacation goal?" — savings goal progress

Just type naturally and I'll look up your ledger.`;

// @desc    Chat with the finance assistant
// @route   POST /api/chat
// @access  Private
const chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  const userId = req.user._id;
  const currency = req.user.currency || "USD";
  const text = message.trim();
  const lower = text.toLowerCase();

  const categories = await Category.find({
    $or: [{ userId: null }, { userId }],
  }).lean();

  const month = extractMonth(text);
  const { start, end } = monthRange(month);

  let intent = "unknown";
  let entities = {};
  let response = "";
  let action = null;

  // ---- Help ----
  if (lower.match(/\b(help|what can you do|commands|instructions)\b/)) {
    intent = "help";
    response = HELP_TEXT;
  }
  // ---- Categories ----
  else if (lower.match(/\b(categories|category list|list categories|my categories)\b/)) {
    intent = "categories";
    if (categories.length === 0) {
      response = "You don't have any categories yet. Add some on the Categories page.";
    } else {
      const names = categories.map((c) => c.name).join(", ");
      response = `Your categories: ${names}.`;
    }
  }
  // ---- Add transaction (write intent - propose, don't execute) ----
  else if (
    lower.match(/\b(add|log|record|spent|spend|paid|earned|received|income of|expense of)\b/) &&
    extractAmount(text)
  ) {
    intent = "add";
    const amount = extractAmount(text);
    const type = detectType(text) || "expense";
    const category = findCategoryByName(text, categories);
    const description = text;

    const transDate = extractDate(text);
    const dateLabel = transDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

    entities = { amount, type, category: category ? category._id : null, categoryName: category ? category.name : null, description, date: transDate.toISOString() };

    if (!category) {
      response = `I found an amount of ${formatCurrency(amount, currency)} but couldn't match a category. Which category should this go under?`;
    } else {
      const verb = type === "income" ? "earned" : "spent";
      response = `Should I log ${formatCurrency(amount, currency)} as ${verb} on "${category.name}" (${type}) on ${dateLabel}? Confirm to add it.`;
      action = { type: "add_transaction", proposed: entities };
    }
  }
  // ---- Summary ----
  else if (lower.match(/\b(summary|balance|total|how much|income|expense|spent|spending)\b/)) {
    intent = "summary";
    const results = await Transaction.aggregate([
      { $match: { userId, date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const summary = { income: 0, expense: 0 };
    results.forEach((r) => { summary[r._id] = r.total; });
    const balance = summary.income - summary.expense;
    const label = monthLabel(month);
    response = `For ${label}: Income ${formatCurrency(summary.income, currency)}, Expense ${formatCurrency(summary.expense, currency)}, Balance ${formatCurrency(balance, currency)}.`;
  }
  // ---- By category ----
  else if (lower.match(/\b(by category|breakdown|category|where did|categories? spending)\b/)) {
    intent = "by_category";
    const type = lower.includes("income") ? "income" : "expense";
    const results = await Transaction.aggregate([
      { $match: { userId, type, date: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "ci" } },
      { $unwind: "$ci" },
      { $project: { _id: 0, name: "$ci.name", total: 1, color: "$ci.color" } },
      { $sort: { total: -1 } },
    ]);
    const label = monthLabel(month);
    if (results.length === 0) {
      response = `No ${type} transactions found for ${label}.`;
    } else {
      const lines = results.map((r) => `• ${r.name}: ${formatCurrency(r.total, currency)}`).join("\n");
      response = `${type.charAt(0).toUpperCase() + type.slice(1)} by category for ${label}:\n${lines}`;
    }
  }
  // ---- Trend ----
  else if (lower.match(/\b(trend|over time|monthly trend|yearly|income vs)\b/)) {
    intent = "trend";
    const year = parseInt(text.match(/\b(\d{4})\b/)?.[1] || new Date().getUTCFullYear(), 10);
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
    const results = await Transaction.aggregate([
      { $match: { userId, date: { $gte: yearStart, $lt: yearEnd } } },
      { $group: { _id: { month: { $month: "$date" }, type: "$type" }, total: { $sum: "$amount" } } },
    ]);
    const trend = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 }));
    results.forEach((r) => { trend[r._id.month - 1][r._id.type] = r.total; });
    const lines = trend.map((t, i) => {
      const m = new Date(Date.UTC(year, i, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      return `• ${m}: income ${formatCurrency(t.income, currency)}, expense ${formatCurrency(t.expense, currency)}`;
    }).join("\n");
    response = `Income vs expense trend for ${year}:\n${lines}`;
  }
  // ---- Recent transactions ----
  else if (lower.match(/\b(recent|latest|last few|previous transactions)\b/)) {
    intent = "recent";
    const limit = lower.match(/\b(\d+)\b/)?.[1] ? parseInt(lower.match(/\b(\d+)\b/)[1], 10) : 5;
    const txns = await Transaction.find({ userId })
      .populate("category", "name type color")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit);
    if (txns.length === 0) {
      response = "No recent transactions found.";
    } else {
      const lines = txns.map((t) => {
        const d = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        const cat = t.category ? t.category.name : "Uncategorized";
        return `• ${d} — ${t.type} ${formatCurrency(t.amount, currency)} (${cat})`;
      }).join("\n");
      response = `Your last ${txns.length} transactions:\n${lines}`;
    }
  }
  // ---- Budget check ----
  else if (lower.match(/\b(budget|over budget|limit|budgeted)\b/)) {
    intent = "budget";
    const budgets = await Budget.find({ userId, month }).populate("category", "name type color").lean();
    if (budgets.length === 0) {
      response = `No budgets set for ${monthLabel(month)}. Set one on the Budgets page.`;
    } else {
      const categoryIds = budgets.map((b) => b.category);
      const spentByCategory = await Transaction.aggregate([
        { $match: { userId, type: "expense", category: { $in: categoryIds }, date: { $gte: start, $lt: end } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
      ]);
      const spentMap = {};
      spentByCategory.forEach((s) => { spentMap[s._id.toString()] = s.total; });

      const lines = budgets.map((b) => {
        const spent = spentMap[b.category._id.toString()] || 0;
        const status = spent >= b.monthlyLimit ? "OVER" : (spent >= b.monthlyLimit * 0.8 ? "NEAR" : "OK");
        return `• ${b.category.name}: spent ${formatCurrency(spent, currency)} of ${formatCurrency(b.monthlyLimit, currency)} — ${status}`;
      }).join("\n");
      response = `Budget status for ${monthLabel(month)}:\n${lines}`;
    }
  }
  // ---- Comparisons ----
  else if (lower.match(/\b(compare|more than|less than|than last|vs last|this month vs|spending compared|did i spend)\b/)) {
    intent = "comparison";
    const curMonth = currentMonth();
    const [cy, cm] = curMonth.split("-").map(Number);
    const last = new Date(Date.UTC(cy, cm - 2, 1));
    const lastMonth = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`;

    const [curRes, lastRes] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId, type: "expense", date: { $gte: monthRange(curMonth).start, $lt: monthRange(curMonth).end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { userId, type: "expense", date: { $gte: monthRange(lastMonth).start, $lt: monthRange(lastMonth).end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    const curTotal = curRes[0]?.total || 0;
    const lastTotal = lastRes[0]?.total || 0;
    const diff = curTotal - lastTotal;
    const curLabel = monthLabel(curMonth);
    const lastLabel = monthLabel(lastMonth);
    if (diff > 0) {
      response = `You spent ${formatCurrency(diff, currency)} more in ${curLabel} (${formatCurrency(curTotal, currency)}) than ${lastLabel} (${formatCurrency(lastTotal, currency)}).`;
    } else if (diff < 0) {
      response = `You spent ${formatCurrency(Math.abs(diff), currency)} less in ${curLabel} (${formatCurrency(curTotal, currency)}) than ${lastLabel} (${formatCurrency(lastTotal, currency)}).`;
    } else {
      response = `You spent the same in ${curLabel} and ${lastLabel}: ${formatCurrency(curTotal, currency)}.`;
    }
  }
  // ---- Savings goals ----
  else if (lower.match(/\b(savings|goal|on track|vacation goal|target|progress)\b/)) {
    intent = "savings";
    const goals = await Goal.find({ userId, status: "active" }).lean();
    if (goals.length === 0) {
      response = "You don't have any active savings goals. Create one on the Savings page.";
    } else {
      const lines = await Promise.all(goals.map(async (g) => {
        const contribs = await Contribution.aggregate([
          { $match: { goalId: g._id } },
          { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ["$type", "actual"] }, "$amount", { $multiply: ["$amount", -1] }] } } } },
        ]);
        const contributed = contribs[0]?.total || 0;
        const remaining = g.targetAmount - contributed;
        const pct = g.targetAmount > 0 ? Math.round((contributed / g.targetAmount) * 100) : 0;
        return `• ${g.name}: ${formatCurrency(contributed, g.currency)} of ${formatCurrency(g.targetAmount, g.currency)} (${pct}%) — ${remaining > 0 ? `${formatCurrency(remaining, g.currency)} remaining` : "target reached"}`;
      }));
      response = `Your savings goals:\n${lines.join("\n")}`;
    }
  }
  // ---- Unknown ----
  else {
    response = "I'm not sure I understand. Try 'help' for what I can do, or ask about your spending, budget, or to add a transaction.";
  }

  res.json({ response, intent, action, month });
});

module.exports = { chat };
