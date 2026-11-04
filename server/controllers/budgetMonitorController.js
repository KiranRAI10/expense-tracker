const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const Notification = require("../models/Notification");
const asyncHandler = require("../middleware/asyncHandler");

const THRESHOLDS = [75, 90, 100];

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getDate();

// Build a date range for a given "YYYY-MM" month string (local copy to avoid circular dep with transactionController)
const monthRange = (month) => {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end, year, mon };
};

const monthBounds = (monthStr) => {
  const [year, mon] = monthStr.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end, year, mon };
};

const prevMonth = (monthStr) => {
  const [year, mon] = monthStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, mon - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
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

const statusFor = (pct, forecastOverLimit) => {
  if (pct >= 100) return "OVER";
  if (forecastOverLimit) return "AT_RISK";
  if (pct >= 90) return "CRITICAL";
  if (pct >= 75) return "WARNING";
  return "OK";
};

// Build a budget monitor entry for a single budget
const buildMonitorEntry = async (budget, spent, now, currency) => {
  const { start, end, year, mon } = monthRange(budget.month);
  const totalDays = daysInMonth(year, mon);
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysElapsed = Math.min(
    Math.ceil((todayUtc - start) / (1000 * 60 * 60 * 24)) + 1,
    totalDays
  );
  const daysRemaining = Math.max(totalDays - daysElapsed, 0);

  const limit = budget.monthlyLimit || 0;
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const remaining = limit - spent;

  const dailyPace = daysElapsed > 0 ? spent / daysElapsed : 0;
  const forecast = dailyPace * totalDays;
  const forecastOverLimit = forecast > limit && limit > 0;
  const safeDailyPace = daysRemaining > 0 ? remaining / daysRemaining : 0;

  const status = statusFor(pct, forecastOverLimit);

  return {
    _id: budget._id,
    category: budget.category,
    month: budget.month,
    monthlyLimit: limit,
    spent,
    remaining,
    pct: Math.round(pct * 100) / 100,
    status,
    daysElapsed,
    daysRemaining,
    totalDays,
    dailyPace: Math.round(dailyPace * 100) / 100,
    forecast: Math.round(forecast * 100) / 100,
    forecastOverLimit,
    safeDailyPace: Math.round(safeDailyPace * 100) / 100,
    recommendation:
      remaining <= 0
        ? `Budget exhausted. Stop ${budget.category?.name} spending for the rest of ${monthLabel(budget.month)}.`
        : daysRemaining > 0
        ? `Safe daily pace: ${formatCurrency(safeDailyPace, currency)}/day. You have ${formatCurrency(remaining, currency)} left over ${daysRemaining} day(s).`
        : `Month ends soon. Remaining: ${formatCurrency(remaining, currency)}.`,
  };
};

const monthLabel = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

// Generate threshold alerts, preventing duplicates
const generateAlerts = async (userId, entries, now, currency = "USD") => {
  const notifications = [];
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (const entry of entries) {
    if (!entry.category?._id) continue;

    for (const threshold of THRESHOLDS) {
      if (entry.pct < threshold) continue;

      const existing = await Notification.findOne({
        userId,
        category: entry.category._id,
        month: entry.month,
        threshold,
      });

      if (existing) continue;

      const statusLabel = entry.status === "OVER" ? "over" : entry.status === "AT_RISK" ? "at risk" : "near";
      notifications.push({
        userId,
        title: `Budget ${statusLabel}: ${entry.category.name}`,
        message: `You've spent ${formatCurrency(entry.spent, currency)} of ${formatCurrency(entry.monthlyLimit, currency)} (${entry.pct}%) for ${monthLabel(entry.month)}.`,
        type: "budget_alert",
        category: entry.category._id,
        budget: entry._id,
        month: entry.month,
        threshold,
        spent: entry.spent,
        limit: entry.monthlyLimit,
      });
    }
  }

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return notifications;
};

// @desc    Get budget monitoring dashboard with status, forecast, recommendations, MoM comparison
// @route   GET /api/budgets/monitor?month=YYYY-MM
// @access  Private
const getBudgetMonitor = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currency = req.user.currency || "USD";
  const month = req.query.month || currentMonthStr();
  const now = new Date();

  const { start, end } = monthRange(month);

  const budgets = await Budget.find({ userId, month }).populate("category", "name color").lean();
  if (budgets.length === 0) {
    return res.json({
      month,
      monthLabel: monthLabel(month),
      budgets: [],
      summary: { totalLimit: 0, totalSpent: 0, totalRemaining: 0, overallPct: 0, overallStatus: "OK" },
      alerts: [],
      previousMonth: null,
    });
  }

  const spendByCategory = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);
  const spendMap = new Map(spendByCategory.map((s) => [s._id.toString(), s.total]));

  const entries = [];
  let totalLimit = 0, totalSpent = 0;

  for (const b of budgets) {
    const spent = spendMap.get(b.category._id.toString()) || 0;
    totalLimit += b.monthlyLimit || 0;
    totalSpent += spent;
    entries.push(await buildMonitorEntry(b, spent, now, currency));
  }

  entries.sort((a, b) => b.pct - a.pct);

  const overallPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const overallStatus = statusFor(overallPct, totalSpent > totalLimit);

  // Generate threshold alerts (idempotent - no duplicates)
  const newAlerts = await generateAlerts(req.user._id, entries, now, currency);

  // MoM comparison
  const prev = prevMonth(month);
  const { start: prevStart, end: prevEnd } = monthRange(prev);
  const [prevAgg, curAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId, type: "expense", date: { $gte: prevStart, $lt: prevEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { userId, type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  const prevTotal = prevAgg[0]?.total || 0;
  const curTotal = curAgg[0]?.total || 0;
  const momDiff = curTotal - prevTotal;

  const summary = {
    totalLimit,
    totalSpent: curTotal,
    totalRemaining: totalLimit - curTotal,
    overallPct: Math.round(overallPct * 100) / 100,
    overallStatus,
    previousMonth: {
      month: prev,
      monthLabel: monthLabel(prev),
      total: prevTotal,
      difference: Math.round(momDiff * 100) / 100,
      trend: momDiff > 0 ? "up" : momDiff < 0 ? "down" : "same",
    },
  };

  res.json({
    month,
    monthLabel: monthLabel(month),
    budgets: entries,
    summary,
    alerts: newAlerts,
    previousMonth: summary.previousMonth,
  });
});

// @desc    Get notifications for authenticated user
// @route   GET /api/notifications?unreadOnly=true&limit=20
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const unreadOnly = req.query.unreadOnly === "true";
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const filter = { userId };
  if (unreadOnly) filter.read = false;

  const notifications = await Notification.find(filter)
    .populate("category", "name color")
    .sort({ createdAt: -1 })
    .limit(limit);

  const unreadCount = await Notification.countDocuments({ userId, read: false });

  res.json({ notifications, unreadCount });
});

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  notification.read = true;
  notification.readAt = new Date();
  await notification.save();

  res.json({ message: "Notification marked as read", notification });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );
  res.json({ message: "All notifications marked as read" });
});

// Recalculate budgets and generate alerts after a transaction change
const recalculateAfterTransaction = async (userId, monthStr, currency = "USD") => {
  if (!monthStr) return;
  const now = new Date();
  const { start, end } = monthRange(monthStr);

  const budgets = await Budget.find({ userId, month: monthStr }).populate("category", "name color").lean();
  if (budgets.length === 0) return;

  const spendByCategory = await Transaction.aggregate([
    {
      $match: { userId, type: "expense", date: { $gte: start, $lt: end } },
    },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);
  const spendMap = new Map(spendByCategory.map((s) => [s._id.toString(), s.total]));

  const entries = [];
  for (const b of budgets) {
    const spent = spendMap.get(b.category._id.toString()) || 0;
    entries.push(await buildMonitorEntry(b, spent, now, currency));
  }

  await generateAlerts(userId, entries, now, currency);
};

const currentMonthStr = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

module.exports = {
  getBudgetMonitor,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  recalculateAfterTransaction,
  THRESHOLDS,
};
