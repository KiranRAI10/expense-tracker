import { useEffect, memo } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { formatCurrency } from "../utils/format";

/**
 * Displays a monetary amount converted from GBP to the user's baseCurrency.
 *
 * Performance notes:
 *  - Uses a module-level rate cache via getRate() (synchronous).
 *  - If the rate is already cached the component renders immediately — no "—" flash.
 *  - If the rate is not yet cached, fetchRate() is triggered once from context;
 *    when it resolves, ratesVersion bumps and ALL FormattedAmount instances
 *    re-render together without individual async waterfalls.
 */
const FormattedAmount = memo(({ amount, className }) => {
  const { baseCurrency, getRate, fetchRate } = useCurrency();

  // Kick off rate fetch when base currency changes (no-op if cached)
  useEffect(() => {
    if (baseCurrency !== "GBP") {
      fetchRate("GBP", baseCurrency);
    }
  }, [baseCurrency, fetchRate]);

  const rate = baseCurrency === "GBP" ? 1 : getRate("GBP", baseCurrency);

  // Show a placeholder only on the very first render before the first rate loads
  if (rate === null) {
    return <span className={className}>—</span>;
  }

  const displayAmount = (amount || 0) * rate;
  return <span className={className}>{formatCurrency(displayAmount, baseCurrency)}</span>;
});

FormattedAmount.displayName = "FormattedAmount";

export default FormattedAmount;
