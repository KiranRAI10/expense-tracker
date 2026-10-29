import { useState } from "react";
import { X } from "lucide-react";

const ContributionForm = ({ goal, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    amount: "",
    type: "actual",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        amount: Number(form.amount),
        type: form.type,
        date: form.date,
        description: form.description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record contribution.");
    } finally {
      setSubmitting(false);
    }
  };

  const adds = form.type === "actual";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-paper p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Record contribution</h2>
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
          <div className="flex rounded-md border border-ink/10 bg-white p-1">
            {["actual", "withdrawal"].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 rounded py-1.5 text-sm font-medium capitalize transition ${
                  form.type === t
                    ? adds
                      ? "bg-ledger text-white"
                      : "bg-rust text-white"
                    : "text-slate hover:bg-paper-dim"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Amount ({goal.currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Date
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
              placeholder="Optional note"
            />
          </div>

          <p className="text-xs text-slate">
            {adds ? "Adds to your saved amount." : "Reduces your saved amount."}
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
          >
            {submitting ? "Recording…" : "Record"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContributionForm;
