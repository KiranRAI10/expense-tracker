const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Goal name is required"],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [0, "Target amount cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      default: "PKR",
    },
    targetDate: {
      type: Date,
      required: [true, "Target date is required"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Goal", goalSchema);
