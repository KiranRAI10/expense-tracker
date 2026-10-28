import { useEffect, useState } from "react";
import { Plus, Trash2, Lock } from "lucide-react";
import api from "../services/api";
import Layout from "../components/Layout";

const swatches = [
  "#3F7259", "#6B9E7F", "#C1533E", "#D9885A", "#C98A2C",
  "#4E7EA6", "#9C5B8C", "#A65D6E", "#7A6A9E", "#7A7A7A",
];

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [color, setColor] = useState(swatches[0]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/categories");
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    try {
      await api.post("/categories", { name: name.trim(), type, color });
      setName("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create category.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category? This only works if it has no transactions.")) return;
    try {
      await api.delete(`/categories/${id}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete category.");
    }
  };

  const grouped = {
    income: categories.filter((c) => c.type === "income"),
    expense: categories.filter((c) => c.type === "expense"),
  };

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold text-ink">Categories</h1>
      <p className="mt-1 text-sm text-slate">
        Default categories are shared by everyone. Add your own for anything specific to you.
      </p>

      <form onSubmit={handleCreate} className="mt-6 rounded-lg border border-ink/10 bg-white p-5">
        <h2 className="font-display text-base font-semibold text-ink">New category</h2>
        {error && <p className="mt-2 text-sm text-rust">{error}</p>}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger"
              placeholder="e.g. Pet care"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-ledger"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Color
            </label>
            <div className="flex gap-1.5">
              {swatches.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setColor(s)}
                  className={`h-7 w-7 rounded-full ring-offset-2 transition ${
                    color === s ? "ring-2 ring-ink" : ""
                  }`}
                  style={{ backgroundColor: s }}
                  aria-label={`Choose color ${s}`}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light"
          >
            <Plus size={16} /> Add category
          </button>
        </div>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {["income", "expense"].map((t) => (
            <div key={t} className="rounded-lg border border-ink/10 bg-white p-5">
              <h2 className="font-display text-base font-semibold capitalize text-ink">{t}</h2>
              <div className="mt-3 space-y-1">
                {grouped[t].map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-paper-dim/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-sm text-ink">{c.name}</span>
                    </div>
                    {c.userId ? (
                      <button
                        onClick={() => handleDelete(c._id)}
                        className="rounded p-1.5 text-slate hover:bg-rust/10 hover:text-rust"
                        aria-label="Delete category"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <Lock size={13} className="text-slate/50" aria-label="Default category" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Categories;
