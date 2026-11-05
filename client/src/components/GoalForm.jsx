import { useState } from "react";
import { X } from "lucide-react";
import { COMMON_CURRENCIES } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";

const GoalForm = ({ initialData, onSubmit, onClose }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: initialData?.name || "",
    targetAmount: initialData?.targetAmount ?? "",
    currency: initialData?.currency || user?.currency || "GBP",
    targetDate: initialData?.targetDate?.slice(0, 10) || "",
    description: initialData?.description || "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Goal name is required.");
      return;
    }
    if (!form.targetAmount || !Number.isFinite(Number(form.targetAmount)) || Number(form.targetAmount) <= 0) {
      setError("Enter a target amount greater than 0.");
      return;
    }
    if (!form.targetDate) {
      setError("Target date is required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        targetAmount: Number(form.targetAmount),
        currency: form.currency,
        targetDate: form.targetDate,
        description: form.description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save goal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-paper p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {initialData ? "Edit goal" : "New savings goal"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate hover:bg-ink/5 hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-rust/10 px-3 py-2 text-sm text-rust">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="Emergency fund"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
                Target amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
                Currency
              </label>
              <select
                required
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
              >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Target date
            </label>
            <input
              type="date"
              required
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="e.g. 3 months of living expenses"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
          >
            {submitting ? "Saving…" : initialData ? "Save changes" : "Create goal"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GoalForm;
