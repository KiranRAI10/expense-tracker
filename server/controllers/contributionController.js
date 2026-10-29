const Goal = require("../models/Goal");
const Contribution = require("../models/Contribution");
const asyncHandler = require("../middleware/asyncHandler");
const { computeProgress } = require("./goalController");
const { getIO } = require("../socket");

const VALID_TYPES = ["actual", "withdrawal"];

// @desc    Get contributions for a goal
// @route   GET /api/goals/:goalId/contributions
// @access  Private
const getContributions = asyncHandler(async (req, res) => {
  const { goalId } = req.params;

  const goal = await Goal.findOne({ _id: goalId, userId: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  const contributions = await Contribution.find({
    goalId,
    userId: req.user._id,
  }).sort({ date: -1, createdAt: -1 });

  res.json(contributions);
});

// @desc    Record a contribution or withdrawal for a goal
// @route   POST /api/goals/:goalId/contributions
// @access  Private
const addContribution = asyncHandler(async (req, res) => {
  const { goalId } = req.params;
  const { amount, type, date, description } = req.body;

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !type) {
    res.status(400);
    throw new Error("A valid amount greater than 0 and a type are required");
  }
  if (!VALID_TYPES.includes(type)) {
    res.status(400);
    throw new Error("Invalid contribution type");
  }

  const goal = await Goal.findOne({ _id: goalId, userId: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  const contribution = await Contribution.create({
    userId: req.user._id,
    goalId,
    amount: numericAmount,
    type,
    date: date || Date.now(),
    description: description || "",
  });

  const all = await Contribution.find({
    goalId,
    userId: req.user._id,
  }).sort({ date: -1, createdAt: -1 });

  const progress = computeProgress(goal, all);
  if (
    (progress.reached && goal.status === "active") ||
    (!progress.reached && goal.status === "completed")
  ) {
    goal.status = progress.reached ? "completed" : "active";
    await goal.save();
    getIO().to(`user:${req.user._id}`).emit("goal:updated", goal.toObject());
  }

  getIO().to(`user:${req.user._id}`).emit("contribution:created", {
    goalId,
    contribution,
    progress,
  });

  res.status(201).json({ contribution, goal: goal.toObject(), progress });
});

// @desc    Delete a contribution
// @route   DELETE /api/goals/:goalId/contributions/:contributionId
// @access  Private
const deleteContribution = asyncHandler(async (req, res) => {
  const contribution = await Contribution.findOne({
    _id: req.params.contributionId,
    goalId: req.params.goalId,
    userId: req.user._id,
  });
  if (!contribution) {
    res.status(404);
    throw new Error("Contribution not found");
  }

  const goalId = contribution.goalId;
  const goal = await Goal.findOne({ _id: goalId, userId: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }
  await contribution.deleteOne();

  const all = await Contribution.find({
    goalId,
    userId: req.user._id,
  }).sort({ date: -1, createdAt: -1 });

  const progress = computeProgress(goal, all);
  if (!progress.reached && goal.status === "completed") {
    goal.status = "active";
    await goal.save();
    getIO().to(`user:${req.user._id}`).emit("goal:updated", goal.toObject());
  }
  getIO().to(`user:${req.user._id}`).emit("contribution:deleted", {
    contributionId: contribution._id,
    goalId,
    progress,
  });

  res.json({
    message: "Contribution deleted",
    contributionId: contribution._id,
    goalId,
    goal: goal.toObject(),
    progress,
  });
});

module.exports = { getContributions, addContribution, deleteContribution };
