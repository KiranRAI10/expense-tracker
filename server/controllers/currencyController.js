const axios = require("axios");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");

const FRANKFURTER_BASE = "https://frankfurter.app";

// Fallback rates relative to GBP (1.0 GBP base)
// Ensures instant response even when offline, rate-limited, or for currencies not on ECB (e.g. PKR, NPR)
const FALLBACK_RATES_FROM_GBP = {
  GBP: 1.0,
  USD: 1.28,
  EUR: 1.18,
  PKR: 358.0,
  INR: 107.2,
  NPR: 172.5,
  AUD: 1.94,
  CAD: 1.76,
  JPY: 198.5,
};

// In-memory rate cache with 1-hour TTL
const rateCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

const getFallbackRate = (from, to) => {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();
  if (fromUpper === toUpper) return 1;

  const fromGbp = FALLBACK_RATES_FROM_GBP[fromUpper];
  const toGbp = FALLBACK_RATES_FROM_GBP[toUpper];

  if (fromGbp && toGbp) {
    return toGbp / fromGbp;
  }
  return 1;
};

const fetchRate = async (from, to) => {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();
  if (fromUpper === toUpper) return 1;

  const cacheKey = `${fromUpper}_${toUpper}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rate;
  }

  // Fast timeout (1500ms) - if external API is slow or offline, fall back instantly
  try {
    const { data } = await axios.get(`${FRANKFURTER_BASE}/latest`, {
      params: { from: fromUpper, to: toUpper },
      timeout: 1500,
    });
    if (data?.rates && data.rates[toUpper]) {
      const rate = data.rates[toUpper];
      rateCache.set(cacheKey, { rate, timestamp: Date.now() });
      return rate;
    }
  } catch (_) {
    // External API unavailable, timed out, or currency not supported (e.g. PKR/NPR)
  }

  // Use reliable fallback rate
  const fallback = getFallbackRate(fromUpper, toUpper);
  rateCache.set(cacheKey, { rate: fallback, timestamp: Date.now() });
  return fallback;
};

// @desc    Convert an amount between currencies using live or cached rate
// @route   GET /api/currency/convert?from=GBP&to=USD&amount=100
// @access  Private
const convertCurrency = asyncHandler(async (req, res) => {
  const { from, to, amount } = req.query;
  if (!from || !to || amount === undefined) {
    res.status(400);
    throw new Error("from, to, and amount are required");
  }
  const amt = parseFloat(amount);
  if (isNaN(amt)) {
    res.status(400);
    throw new Error("Invalid amount");
  }
  const rate = await fetchRate(from, to);
  res.json({
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    amount: amt,
    rate,
    converted: amt * rate,
  });
});

// @desc    Get supported currencies
// @route   GET /api/currency/currencies
// @access  Private
const getCurrencies = asyncHandler(async (_req, res) => {
  try {
    const { data } = await axios.get(`${FRANKFURTER_BASE}/currencies`, { timeout: 1500 });
    // Augment with non-ECB common currencies if missing
    const merged = {
      ...data,
      PKR: "Pakistani Rupee",
      NPR: "Nepalese Rupee",
    };
    res.json(merged);
  } catch (_) {
    // Return standard fallback dictionary if network is offline
    res.json({
      GBP: "British Pound",
      USD: "United States Dollar",
      EUR: "Euro",
      PKR: "Pakistani Rupee",
      INR: "Indian Rupee",
      NPR: "Nepalese Rupee",
      AUD: "Australian Dollar",
      CAD: "Canadian Dollar",
      JPY: "Japanese Yen",
    });
  }
});

// @desc    Update authenticated user's preferred currency
// @route   PATCH /api/currency/user/currency or PATCH /api/user/currency
// @access  Private
const updateUserCurrency = asyncHandler(async (req, res) => {
  const { currency } = req.body;
  if (!currency || typeof currency !== "string") {
    res.status(400);
    throw new Error("currency is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { currency: currency.toUpperCase() },
    { new: true }
  ).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({ user });
});

module.exports = { convertCurrency, getCurrencies, updateUserCurrency, fetchRate };
