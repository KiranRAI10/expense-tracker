const express = require("express");
const router = express.Router();
const { getSummary, getByCategory, getTrend } = require("../controllers/analyticsController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/summary", getSummary);
router.get("/by-category", getByCategory);
router.get("/trend", getTrend);

module.exports = router;
