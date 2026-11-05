import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const CurrencyContext = createContext(null);

export const COMMON_CURRENCIES = ["GBP", "USD", "EUR", "NPR", "INR", "PKR", "AUD", "CAD", "JPY"];

// Module-level cache shared across all renders — survives context re-renders
const rateCache = {};

export const CurrencyProvider = ({ children }) => {
  const { user } = useAuth();
  // Initialize from user's saved preference; default to GBP
  const [baseCurrency, setBaseCurrency] = useState(() => user?.currency || "GBP");
  // Bump this counter when a new rate is loaded so subscribers re-render
  const [ratesVersion, setRatesVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inflight = useRef({});

  // Keep baseCurrency in sync when user data loads
  useEffect(() => {
    if (user?.currency) {
      setBaseCurrency(user.currency);
    }
  }, [user?.currency]);

  // Fetch and cache a single exchange rate; deduplicate concurrent requests
  const fetchRate = useCallback(async (from, to) => {
    if (from === to) return 1;
    const key = `${from}_${to}`;
    if (rateCache[key] !== undefined) return rateCache[key];

    // Deduplicate: if already in-flight, wait for it
    if (inflight.current[key]) return inflight.current[key];

    const promise = api
      .get("/currency/convert", { params: { from, to, amount: 1 } })
      .then(({ data }) => {
        rateCache[key] = data.rate;
        delete inflight.current[key];
        setRatesVersion((v) => v + 1); // notify all subscribers
        return data.rate;
      })
      .catch((err) => {
        delete inflight.current[key];
        setError(err.response?.data?.message || "Failed to fetch exchange rate");
        return 1;
      });

    inflight.current[key] = promise;
    return promise;
  }, []);

  // Synchronous rate lookup from cache (returns null if not yet cached)
  // Re-computed when ratesVersion bumps so components re-render automatically
  const getRate = useCallback(
    (from, to) => {
      if (from === to) return 1;
      return rateCache[`${from}_${to}`] ?? null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ratesVersion]
  );

  // Async convert — still available for one-off use
  const convert = useCallback(
    async (amount, from, to) => {
      if (!amount || from === to) return amount || 0;
      const rate = await fetchRate(from, to);
      return (amount || 0) * rate;
    },
    [fetchRate]
  );

  const setCurrency = async (newCurrency) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.patch("/currency/user/currency", { currency: newCurrency });
      setBaseCurrency(data.user.currency);
      return data.user;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update currency");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    baseCurrency,
    loading,
    error,
    convert,
    fetchRate,
    getRate,
    setCurrency,
    COMMON_CURRENCIES,
  };

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
};
