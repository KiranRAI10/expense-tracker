import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import Layout from "../components/Layout";
import MonthSwitcher from "../components/MonthSwitcher";
import { currentMonthStr } from "../utils/format";
import FormattedAmount from "../components/FormattedAmount";

const STATUS_CONFIG = {
  OK: { label: "On track", color: "#3F7259", icon: CheckCircle2 },
  WARNING: { label: "Caution", color: "#C98A2C", icon: AlertTriangle },
  CRITICAL: { label: "Critical", color: "#B9773A", icon: AlertTriangle },
  OVER: { label: "Over budget", color: "#C1533E", icon: AlertTriangle },
  AT_RISK: { label: "At risk", color: "#C98A2C", icon: Clock },
};

const Budgets = () => {
  const [month, setMonth] = useState(currentMonthStr());
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [monitorRes, categoriesRes] = await Promise.all([
        api.get(`/budget-monitor/monitor?month=${month}`),
        api.get("/categories"),
      ]);
      setData(monitorRes.data);
      setCategories(categoriesRes.data.filter((c) => c.type === "expense"));
    } catch (err) {
      setError(err.response?.data?.message || "Could not load budgets.");
    } finally {
      setLoading(false);
    }
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
    try {
      await api.delete(`/budgets/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete budget.");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="mt-6 text-sm text-slate">Loading…</div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="mt-6 text-sm text-slate">Error loading budgets.</div>
      </Layout>
    );
  }

  const { budgets, summary, previousMonth, monthLabel } = data;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Budgets</h1>
          <p className="mt-1 text-sm text-slate">
            Monthly limits with spending forecasts, pace, and risk alerts.
          </p>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      {summary && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-ink/10 bg-white p-4">
            <p className="text-xs text-slate uppercase tracking-wide">Total limit</p>
            <p className="font-mono text-lg font-semibold text-ink">
              <FormattedAmount amount={summary.totalLimit} />
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-4">
            <p className="text-xs text-slate uppercase tracking-wide">Spent this month</p>
            <p className="font-mono text-lg font-semibold text-ink">
              <FormattedAmount amount={summary.totalSpent} />
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-4">
            <p className="text-xs text-slate uppercase tracking-wide">Remaining</p>
            <p className={`font-mono text-lg font-semibold ${summary.overallStatus === "OVER" ? "text-rust" : "text-ink"}`}>
              <FormattedAmount amount={summary.totalRemaining} />
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-ink/10 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-base font-semibold text-ink">Monthly progress</h2>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              summary.overallStatus === "OK"
                ? "bg-ledger/10 text-ledger"
                : summary.overallStatus === "OVER"
                ? "bg-rust/10 text-rust"
                : "bg-amber/10 text-amber"
            }`}
          >
            Overall: {summary.overallStatus} ({summary.overallPct}%)
          </span>
        </div>
        {previousMonth && (
          <p className="text-xs text-slate mb-3">
            vs {previousMonth.monthLabel}: {previousMonth.total === 0 ? "N/A" : `${previousMonth.trend} by `}<FormattedAmount amount={Math.abs(previousMonth.difference)} />
          </p>
        )}
        <div className="h-1 w-full overflow-hidden rounded-full bg-paper-dim">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, summary.overallPct)}%`,
              backgroundColor:
                summary.overallStatus === "OVER"
                  ? "#C1533E"
                  : summary.overallPct >= 75
                  ? "#C98A2C"
                  : "#3F7259",
            }}
          />
        </div>
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

      {budgets.length === 0 ? (
        <div className="mt-6 flex h-32 items-center justify-center rounded-lg border border-dashed border-ink/15 text-sm text-slate">
          No budgets set for {monthLabel} yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {budgets.map((b) => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.OK;
            const Icon = cfg.icon;
            return (
              <div key={b._id} className="rounded-lg border border-ink/10 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: b.category?.color }}
                    />
                    <span className="text-sm font-medium text-ink">{b.category?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        cfg.color === "#C1533E"
                          ? "bg-rust/10 text-rust"
                          : cfg.color === "#C98A2C"
                          ? "bg-amber/10 text-amber"
                          : "bg-ledger/10 text-ledger"
                      }`}
                    >
                      <Icon size={12} strokeWidth={1.75} /> {cfg.label}
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
                <div className="flex items-center gap-3 text-xs font-mono text-slate mb-1">
                  <span>
                    <FormattedAmount amount={b.spent} /> /{" "}
                    <FormattedAmount amount={b.monthlyLimit} />
                  </span>
                  <span>{b.pct}% used</span>
                  <span><FormattedAmount amount={b.remaining} /> left</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-paper-dim mb-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, b.pct)}%`,
                      backgroundColor:
                        b.status === "OVER"
                          ? "#C1533E"
                          : b.status === "AT_RISK" || b.status === "CRITICAL"
                          ? "#C98A2C"
                          : "#3F7259",
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded bg-paper-dim p-2">
                    <p className="text-slate uppercase tracking-wide">Forecast</p>
                    <p className={`font-mono text-sm ${b.forecastOverLimit ? "text-rust font-semibold" : "text-ink"}`}>
                      <FormattedAmount amount={b.forecast} />
                      {b.forecastOverLimit ? " (over)" : ""}
                    </p>
                  </div>
                  <div className="rounded bg-paper-dim p-2">
                    <p className="text-slate uppercase tracking-wide">Daily pace</p>
                    <p className="font-mono text-sm text-ink">
                      <FormattedAmount amount={b.safeDailyPace} />/day
                    </p>
                  </div>
                  <div className="rounded bg-paper-dim p-2">
                    <p className="text-slate uppercase tracking-wide">Days left</p>
                    <p className="font-mono text-sm text-ink">{b.daysRemaining}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate">{b.recommendation}</p>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default Budgets;
