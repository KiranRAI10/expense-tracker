const express = require("express");
const router = express.Router();
const {
  convertCurrency,
  getCurrencies,
  updateUserCurrency,
} = require("../controllers/currencyController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/convert", convertCurrency);
router.get("/currencies", getCurrencies);
router.patch("/user/currency", updateUserCurrency);

module.exports = router;
