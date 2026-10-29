const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  getContributions,
  addContribution,
  deleteContribution,
} = require("../controllers/contributionController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getContributions).post(addContribution);
router.route("/:contributionId").delete(deleteContribution);

module.exports = router;
