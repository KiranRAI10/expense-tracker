const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Get all categories available to the logged-in user (default + their own)
// @route   GET /api/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    $or: [{ userId: null }, { userId: req.user._id }],
  }).sort({ type: 1, name: 1 });

  res.json(categories);
});

// @desc    Create a custom category
// @route   POST /api/categories
// @access  Private
const createCategory = asyncHandler(async (req, res) => {
  const { name, type, color } = req.body;

  if (!name || !type) {
    res.status(400);
    throw new Error("Name and type are required");
  }

  const category = await Category.create({
    userId: req.user._id,
    name,
    type,
    color,
  });

  res.status(201).json(category);
});

// @desc    Update a custom category (default categories cannot be edited)
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  if (!category.userId || category.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can only edit your own custom categories");
  }

  const { name, color, type } = req.body;
  if (name) category.name = name;
  if (color) category.color = color;
  if (type) category.type = type;

  await category.save();
  res.json(category);
});

// @desc    Delete a custom category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  if (!category.userId || category.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can only delete your own custom categories");
  }

  const inUse = await Transaction.exists({ category: category._id });
  if (inUse) {
    res.status(400);
    throw new Error("Cannot delete a category that has transactions. Reassign or delete those transactions first.");
  }

  await category.deleteOne();
  res.json({ message: "Category deleted" });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
