const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const asyncHandler = require("../middleware/asyncHandler");
const { monthRange } = require("./transactionController");

const currentMonth = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

// @desc    Get income/expense/balance summary for a given month
// @route   GET /api/analytics/summary?month=YYYY-MM
// @access  Private
const getSummary = asyncHandler(async (req, res) => {
  const month = req.query.month || currentMonth();
  const { start, end } = monthRange(month);

  const results = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const summary = { income: 0, expense: 0 };
  results.forEach((r) => {
    summary[r._id] = r.total;
  });

  res.json({
    month,
    income: summary.income,
    expense: summary.expense,
    balance: summary.income - summary.expense,
  });
});

// @desc    Get expense/income breakdown by category for a given month
// @route   GET /api/analytics/by-category?month=YYYY-MM&type=expense
// @access  Private
const getByCategory = asyncHandler(async (req, res) => {
  const month = req.query.month || currentMonth();
  const type = req.query.type === "income" ? "income" : "expense";
  const { start, end } = monthRange(month);

  const results = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        type,
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    { $unwind: "$categoryInfo" },
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        name: "$categoryInfo.name",
        color: "$categoryInfo.color",
        total: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.json(results);
});

// @desc    Get monthly income vs expense trend for a given year
// @route   GET /api/analytics/trend?year=YYYY
// @access  Private
const getTrend = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const results = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { month: { $month: "$date" }, type: "$type" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const trend = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
  }));

  results.forEach((r) => {
    const idx = r._id.month - 1;
    trend[idx][r._id.type] = r.total;
  });

  res.json({ year, trend });
});

module.exports = { getSummary, getByCategory, getTrend };
