import { useEffect, useState } from "react";
import { X } from "lucide-react";

const emptyForm = {
  amount: "",
  type: "expense",
  category: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
};

const TransactionForm = ({ categories, initialData, onSubmit, onClose }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        amount: initialData.amount,
        type: initialData.type,
        category: initialData.category?._id || initialData.category,
        description: initialData.description || "",
        date: initialData.date?.slice(0, 10) || emptyForm.date,
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialData]);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  useEffect(() => {
    // Reset category selection when switching type if current category no longer matches
    if (form.category && !filteredCategories.some((c) => c._id === form.category)) {
      setForm((f) => ({ ...f, category: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!form.category) {
      setError("Select a category.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ ...form, amount: Number(form.amount) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-paper p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {initialData ? "Edit transaction" : "Add transaction"}
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
          <div className="flex rounded-md border border-ink/10 bg-white p-1">
            {["expense", "income"].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`flex-1 rounded py-1.5 text-sm font-medium capitalize transition ${
                  form.type === t
                    ? t === "expense"
                      ? "bg-rust text-white"
                      : "bg-ledger text-white"
                    : "text-slate hover:bg-paper-dim"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Category
            </label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
            >
              <option value="">Select a category</option>
              {filteredCategories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="Optional note"
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
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger focus:ring-1 focus:ring-ledger"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
          >
            {submitting ? "Saving…" : initialData ? "Save changes" : "Add transaction"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
