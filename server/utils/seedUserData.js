require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const Contribution = require("../models/Contribution");

const userEmail = process.argv[2];
if (!userEmail) {
  console.error("Usage: node utils/seedUserData.js <your-email>");
  process.exit(1);
}

const daysAgo = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const user = await User.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      console.error(`No user found with email: ${userEmail}`);
      process.exit(1);
    }
    console.log(`Seeding data for user: ${user.name} (${user.email})`);

    // ---- User-specific categories ----
    const userCategories = [
      { name: "Food", type: "expense", color: "#C1533E" },
      { name: "Transport", type: "expense", color: "#B9773A" },
      { name: "Shopping", type: "expense", color: "#A65D6E" },
      { name: "Salary", type: "income", color: "#3F7259" },
    ];

    const categoryDocs = {};
    for (const c of userCategories) {
      const doc = await Category.findOneAndUpdate(
        { userId: user._id, name: c.name, type: c.type },
        { ...c, userId: user._id },
        { upsert: true, new: true }
      );
      categoryDocs[c.name] = doc._id;
    }

    // ---- Transactions (mix of dates to test date parsing) ----
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterday = daysAgo(1);
    const lastWeek = daysAgo(7);
    const threeDaysAgo = daysAgo(3);

    const transactions = [
      { amount: 1200, type: "income", category: categoryDocs.Salary, description: "Monthly salary", date: today },
      { amount: 250, type: "expense", category: categoryDocs.Food, description: "Groceries yesterday", date: yesterday },
      { amount: 80, type: "expense", category: categoryDocs.Transport, description: "Uber last week", date: lastWeek },
      { amount: 150, type: "expense", category: categoryDocs.Food, description: "Dinner 3 days ago", date: threeDaysAgo },
      { amount: 300, type: "expense", category: categoryDocs.Shopping, description: "New shoes", date: today },
      { amount: 60, type: "expense", category: categoryDocs.Food, description: "Lunch today", date: today },
    ];

    for (const t of transactions) {
      await Transaction.create({ userId: user._id, ...t });
    }

    // ---- Current month string for budgets ----
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // ---- Budgets ----
    const budgets = [
      { category: categoryDocs.Food, monthlyLimit: 1000, month: currentMonth },
      { category: categoryDocs.Transport, monthlyLimit: 500, month: currentMonth },
      { category: categoryDocs.Shopping, monthlyLimit: 2000, month: currentMonth },
    ];

    for (const b of budgets) {
      await Budget.findOneAndUpdate(
        { userId: user._id, category: b.category, month: b.month },
        { ...b, userId: user._id },
        { upsert: true, new: true }
      );
    }

    // ---- Savings goal with contributions ----
    const goal = await Goal.findOneAndUpdate(
      { userId: user._id, name: "Vacation Fund" },
      {
        userId: user._id,
        name: "Vacation Fund",
        targetAmount: 5000,
        currency: user.currency || "PKR",
        targetDate: new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)),
        description: "Saving for next year's vacation",
        status: "active",
      },
      { upsert: true, new: true }
    );

    await Contribution.findOneAndUpdate(
      { userId: user._id, goalId: goal._id, type: "actual" },
      { userId: user._id, goalId: goal._id, amount: 1200, type: "actual", description: "Initial deposit" },
      { upsert: true, new: true }
    );

    console.log("✅ Seed complete:");
    console.log(`   - ${transactions.length} transactions`);
    console.log(`   - ${budgets.length} budgets for ${currentMonth}`);
    console.log(`   - 1 savings goal (Vacation Fund) with Rs 1,200 contributed`);
    console.log(`   - Categories: Food, Transport, Shopping, Salary`);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
};

run();
