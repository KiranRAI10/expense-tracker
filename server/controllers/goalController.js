const Goal = require("../models/Goal");
const Contribution = require("../models/Contribution");
const asyncHandler = require("../middleware/asyncHandler");
const { getIO } = require("../socket");

const ADD_TYPES = new Set(["actual"]);
const SUB_TYPES = new Set(["withdrawal", "correction"]);

const computeProgress = (goal, contributions) => {
  const saved = contributions
    .filter((c) => ADD_TYPES.has(c.type))
    .reduce((sum, c) => sum + c.amount, 0);
  const withdrawn = contributions
    .filter((c) => SUB_TYPES.has(c.type))
    .reduce((sum, c) => sum + c.amount, 0);
  const totalSaved = Math.max(0, saved - withdrawn);
  const target = Number(goal.targetAmount) || 0;
  const remaining = Math.max(0, target - totalSaved);
  const percentage = target > 0 ? Math.min(100, Math.round((totalSaved / target) * 100)) : 0;

  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const msRemaining = targetDate - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000));
  const weeksRemaining = Math.max(1, daysRemaining / 7);
  const monthsRemaining = Math.max(1, daysRemaining / 30);

  const weeklyNeeded =
    remaining > 0 && daysRemaining > 0 ? Math.round((remaining / weeksRemaining) * 100) / 100 : 0;
  const monthlyNeeded =
    remaining > 0 && daysRemaining > 0 ? Math.round((remaining / monthsRemaining) * 100) / 100 : 0;

  return {
    saved: totalSaved,
    withdrawn,
    remaining,
    percentage,
    daysRemaining,
    weeklyNeeded,
    monthlyNeeded,
    reached: totalSaved >= target && target > 0,
  };
};

const emitToUser = (userId, event, data) => {
  try {
    getIO().to(`user:${userId}`).emit(event, data);
  } catch (err) {
    // socket.io may not be initialized in some contexts
  }
};

// @desc    Get all goals for logged-in user with progress
// @route   GET /api/goals?status=
// @access  Private
const getGoals = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;

  const goals = await Goal.find(filter).sort({ createdAt: -1 });
  const contributions = await Contribution.find({ userId: req.user._id }).sort({ date: -1 });

  const byGoal = {};
  contributions.forEach((c) => {
    const key = c.goalId.toString();
    if (!byGoal[key]) byGoal[key] = [];
    byGoal[key].push(c);
  });

  const result = goals.map((g) => {
    const cons = byGoal[g._id.toString()] || [];
    const progress = computeProgress(g, cons);
    const goalObj = g.toObject();
    return { ...goalObj, progress, contributions: cons };
  });

  res.json(result);
});

// @desc    Get a single goal with its contributions and progress
// @route   GET /api/goals/:id
// @access  Private
const getGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }
  const contributions = await Contribution.find({
    goalId: goal._id,
    userId: req.user._id,
  }).sort({ date: -1, createdAt: -1 });

  const progress = computeProgress(goal, contributions);
  res.json({ ...goal.toObject(), progress, contributions });
});

// @desc    Create a savings goal
// @route   POST /api/goals
// @access  Private
const createGoal = asyncHandler(async (req, res) => {
  const { name, targetAmount, currency, targetDate, description } = req.body;

  const numericTarget = Number(targetAmount);
  if (!name || !Number.isFinite(numericTarget) || numericTarget <= 0 || !targetDate) {
    res.status(400);
    throw new Error("Name, a target amount greater than 0, and target date are required");
  }

  const goal = await Goal.create({
    userId: req.user._id,
    name,
    targetAmount: numericTarget,
    currency: currency || req.user.currency || "USD",
    targetDate,
    description: description || "",
  });

  emitToUser(req.user._id, "goal:created", {
    ...goal.toObject(),
    progress: computeProgress(goal, []),
  });
  res.status(201).json(goal);
});

// @desc    Update a savings goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  const { name, targetAmount, currency, targetDate, description, status } = req.body;
  if (name !== undefined) goal.name = name;
  if (targetAmount !== undefined) {
    const numericTarget = Number(targetAmount);
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      res.status(400);
      throw new Error("Target amount must be greater than 0");
    }
    goal.targetAmount = numericTarget;
  }
  if (currency !== undefined) goal.currency = currency;
  if (targetDate !== undefined) goal.targetDate = targetDate;
  if (description !== undefined) goal.description = description;
  if (status !== undefined) goal.status = status;

  await goal.save();
  const contributions = await Contribution.find({
    goalId: goal._id,
    userId: req.user._id,
  });
  const progress = computeProgress(goal, contributions);
  if (
    (progress.reached && goal.status === "active") ||
    (!progress.reached && goal.status === "completed")
  ) {
    goal.status = progress.reached ? "completed" : "active";
    await goal.save();
  }
  emitToUser(req.user._id, "goal:updated", {
    ...goal.toObject(),
    progress,
  });
  res.json(goal);
});

// @desc    Delete a savings goal and its contributions
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  await Contribution.deleteMany({ goalId: goal._id, userId: req.user._id });
  await goal.deleteOne();
  emitToUser(req.user._id, "goal:deleted", { _id: goal._id });
  res.json({ message: "Goal deleted" });
});

module.exports = { getGoals, getGoal, createGoal, updateGoal, deleteGoal, computeProgress };
