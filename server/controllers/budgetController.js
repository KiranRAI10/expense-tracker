const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const asyncHandler = require("../middleware/asyncHandler");
const { monthRange } = require("./transactionController");

// @desc    Get budgets with actual spend progress for a given month
// @route   GET /api/budgets?month=YYYY-MM
// @access  Private
const getBudgets = asyncHandler(async (req, res) => {
  const month = req.query.month;
  if (!month) {
    res.status(400);
    throw new Error("A month query param (YYYY-MM) is required");
  }

  const budgets = await Budget.find({ userId: req.user._id, month }).populate(
    "category",
    "name color"
  );

  const { start, end } = monthRange(month);
  const spendByCategory = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);
  const spendMap = new Map(spendByCategory.map((s) => [s._id.toString(), s.total]));

  const result = budgets.map((b) => ({
    _id: b._id,
    category: b.category,
    month: b.month,
    monthlyLimit: b.monthlyLimit,
    spent: spendMap.get(b.category._id.toString()) || 0,
  }));

  res.json(result);
});

// @desc    Create or update a budget for a category/month
// @route   POST /api/budgets
// @access  Private
const upsertBudget = asyncHandler(async (req, res) => {
  const { category, monthlyLimit, month } = req.body;

  if (!category || monthlyLimit === undefined || !month) {
    res.status(400);
    throw new Error("Category, monthlyLimit, and month are required");
  }

  const budget = await Budget.findOneAndUpdate(
    { userId: req.user._id, category, month },
    { monthlyLimit },
    { new: true, upsert: true, runValidators: true }
  ).populate("category", "name color");

  res.status(201).json(budget);
});

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findById(req.params.id);
  if (!budget) {
    res.status(404);
    throw new Error("Budget not found");
  }
  if (budget.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  await budget.deleteOne();
  res.json({ message: "Budget deleted" });
});

module.exports = { getBudgets, upsertBudget, deleteBudget };
