import { useEffect, useState, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Layout from "../components/Layout";
import MonthSwitcher from "../components/MonthSwitcher";
import TransactionList from "../components/TransactionList";
import TransactionForm from "../components/TransactionForm";
import { currentMonthStr } from "../utils/format";

const Transactions = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonthStr());
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadCategories = useCallback(async () => {
    const { data } = await api.get("/categories");
    setCategories(data);
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (type) params.set("type", type);
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const { data } = await api.get(`/transactions?${params.toString()}`);
      setTransactions(data.transactions);
    } finally {
      setLoading(false);
    }
  }, [month, type, category, search]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timeout = setTimeout(loadTransactions, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [loadTransactions, search]);

  const handleCreate = async (payload) => {
    await api.post("/transactions", payload);
    await loadTransactions();
  };

  const handleUpdate = async (payload) => {
    await api.put(`/transactions/${editing._id}`, payload);
    await loadTransactions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    await api.delete(`/transactions/${id}`);
    await loadTransactions();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Transactions</h1>
          <p className="mt-1 text-sm text-slate">Every entry in your ledger, filterable by month.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <MonthSwitcher month={month} onChange={setMonth} />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ledger"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ledger"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search descriptions…"
            className="w-full rounded-md border border-ink/10 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-ledger"
          />
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate">Loading…</div>
        ) : (
          <TransactionList
            transactions={transactions}
            currency={user?.currency}
            onEdit={(t) => {
              setEditing(t);
              setShowForm(true);
            }}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          initialData={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </Layout>
  );
};

export default Transactions;
