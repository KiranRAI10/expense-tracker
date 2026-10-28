import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Layout from "../components/Layout";
import MonthSwitcher from "../components/MonthSwitcher";
import { currentMonthStr, formatCurrency } from "../utils/format";

const Budgets = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonthStr());
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [budgetsRes, categoriesRes] = await Promise.all([
      api.get(`/budgets?month=${month}`),
      api.get("/categories"),
    ]);
    setBudgets(budgetsRes.data);
    setCategories(categoriesRes.data.filter((c) => c.type === "expense"));
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!category || !limit || Number(limit) <= 0) {
      setError("Choose a category and a limit greater than 0.");
      return;
    }
    try {
      await api.post("/budgets", { category, monthlyLimit: Number(limit), month });
      setCategory("");
      setLimit("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save budget.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    await api.delete(`/budgets/${id}`);
    await load();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Budgets</h1>
          <p className="mt-1 text-sm text-slate">Set a monthly limit per category and track progress.</p>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      <form onSubmit={handleCreate} className="mt-6 rounded-lg border border-ink/10 bg-white p-5">
        <h2 className="font-display text-base font-semibold text-ink">Set a budget</h2>
        {error && <p className="mt-2 text-sm text-rust">{error}</p>}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Monthly limit
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-32 rounded-md border border-ink/10 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-ledger"
              placeholder="0.00"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light"
          >
            <Plus size={16} /> Save budget
          </button>
        </div>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading…</p>
      ) : budgets.length === 0 ? (
        <div className="mt-6 flex h-32 items-center justify-center rounded-lg border border-dashed border-ink/15 text-sm text-slate">
          No budgets set for this month yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {budgets.map((b) => {
            const pct = Math.min(100, Math.round((b.spent / b.monthlyLimit) * 100));
            const over = b.spent > b.monthlyLimit;
            const barColor = over ? "#C1533E" : pct >= 80 ? "#C98A2C" : "#3F7259";
            return (
              <div key={b._id} className="rounded-lg border border-ink/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: b.category?.color }}
                    />
                    <span className="text-sm font-medium text-ink">{b.category?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-slate">
                      {formatCurrency(b.spent, user?.currency)} /{" "}
                      {formatCurrency(b.monthlyLimit, user?.currency)}
                    </span>
                    <button
                      onClick={() => handleDelete(b._id)}
                      className="rounded p-1.5 text-slate hover:bg-rust/10 hover:text-rust"
                      aria-label="Delete budget"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-paper-dim">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                {over && (
                  <p className="mt-1.5 text-xs text-rust">
                    Over budget by {formatCurrency(b.spent - b.monthlyLimit, user?.currency)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default Budgets;
