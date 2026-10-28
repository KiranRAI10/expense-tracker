// Seeds a set of default categories shared by all users (userId: null)
// Run with: npm run seed
require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category");

const defaultCategories = [
  { name: "Salary", type: "income", color: "#3F7259" },
  { name: "Freelance", type: "income", color: "#6B9E7F" },
  { name: "Investments", type: "income", color: "#8FBFA0" },
  { name: "Other Income", type: "income", color: "#A9C9B9" },

  { name: "Groceries", type: "expense", color: "#C1533E" },
  { name: "Rent", type: "expense", color: "#8B3A2B" },
  { name: "Utilities", type: "expense", color: "#C98A2C" },
  { name: "Transport", type: "expense", color: "#B9773A" },
  { name: "Dining Out", type: "expense", color: "#D9885A" },
  { name: "Entertainment", type: "expense", color: "#9C5B8C" },
  { name: "Health", type: "expense", color: "#4E7EA6" },
  { name: "Shopping", type: "expense", color: "#A65D6E" },
  { name: "Subscriptions", type: "expense", color: "#7A6A9E" },
  { name: "Other Expense", type: "expense", color: "#7A7A7A" },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { userId: null, name: cat.name, type: cat.type },
        cat,
        { upsert: true, new: true }
      );
    }

    console.log(`Seeded ${defaultCategories.length} default categories.`);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
};

run();
