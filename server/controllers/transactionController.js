const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const asyncHandler = require("../middleware/asyncHandler");

// Helper: build a date range for a given "YYYY-MM" month string
const monthRange = (month) => {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end };
};

// @desc    Get transactions for logged-in user (supports filters)
// @route   GET /api/transactions?month=YYYY-MM&category=&type=&search=&page=&limit=
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  const { month, category, type, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  const filter = { userId: req.user._id };

  if (month) {
    const { start, end } = monthRange(month);
    filter.date = { $gte: start, $lt: end };
  }
  if (category) filter.category = category;
  if (type) filter.type = type;
  if (search) filter.description = { $regex: search, $options: "i" };

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("category", "name type color")
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    transactions,
    page,
    totalPages: Math.ceil(total / limit),
    total,
  });
});

// @desc    Create a transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, description, date } = req.body;

  if (!amount || !type || !category) {
    res.status(400);
    throw new Error("Amount, type, and category are required");
  }

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    res.status(400);
    throw new Error("Selected category does not exist");
  }

  const transaction = await Transaction.create({
    userId: req.user._id,
    amount,
    type,
    category,
    description,
    date: date || Date.now(),
  });

  const populated = await transaction.populate("category", "name type color");
  res.status(201).json(populated);
});

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }
  if (transaction.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to edit this transaction");
  }

  const { amount, type, category, description, date } = req.body;
  if (amount !== undefined) transaction.amount = amount;
  if (type) transaction.type = type;
  if (category) transaction.category = category;
  if (description !== undefined) transaction.description = description;
  if (date) transaction.date = date;

  await transaction.save();
  const populated = await transaction.populate("category", "name type color");
  res.json(populated);
});

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }
  if (transaction.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this transaction");
  }

  await transaction.deleteOne();
  res.json({ message: "Transaction deleted" });
});

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  monthRange,
};
