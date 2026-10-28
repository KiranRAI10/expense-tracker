import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { formatCurrency } from "../utils/format";

const Card = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-lg border border-ink/10 bg-white p-5">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <Icon size={16} className={tone} strokeWidth={2} />
    </div>
    <p className={`mt-3 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
  </div>
);

const SummaryCards = ({ summary, currency }) => {
  const income = summary?.income || 0;
  const expense = summary?.expense || 0;
  const balance = summary?.balance ?? income - expense;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card
        label="Income"
        value={formatCurrency(income, currency)}
        icon={ArrowUpRight}
        tone="text-ledger"
      />
      <Card
        label="Expenses"
        value={formatCurrency(expense, currency)}
        icon={ArrowDownRight}
        tone="text-rust"
      />
      <Card
        label="Balance"
        value={formatCurrency(balance, currency)}
        icon={Scale}
        tone={balance >= 0 ? "text-ink" : "text-rust"}
      />
    </div>
  );
};

export default SummaryCards;
