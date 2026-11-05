const express = require("express");
const router = express.Router();
const {
  getBudgetMonitor,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/budgetMonitorController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/monitor", getBudgetMonitor);
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

module.exports = router;
