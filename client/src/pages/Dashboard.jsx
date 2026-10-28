import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Layout from "../components/Layout";
import MonthSwitcher from "../components/MonthSwitcher";
import SummaryCards from "../components/SummaryCards";
import CategoryPieChart from "../components/CategoryPieChart";
import TrendChart from "../components/TrendChart";
import { currentMonthStr } from "../utils/format";

const Dashboard = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonthStr());
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const year = month.split("-")[0];

    const load = async () => {
      setLoading(true);
      try {
        const [summaryRes, categoryRes, trendRes] = await Promise.all([
          api.get(`/analytics/summary?month=${month}`),
          api.get(`/analytics/by-category?month=${month}&type=expense`),
          api.get(`/analytics/trend?year=${year}`),
        ]);
        if (!cancelled) {
          setSummary(summaryRes.data);
          setByCategory(categoryRes.data);
          setTrend(trendRes.data.trend);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate">Here's how your money moved this month.</p>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      <div className="mt-6">
        <SummaryCards summary={summary} currency={user?.currency} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-lg border border-ink/10 bg-white p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink">Spending by category</h2>
          <p className="text-xs text-slate">Where this month's expenses went</p>
          <div className="mt-2">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate">
                Loading…
              </div>
            ) : (
              <CategoryPieChart data={byCategory} currency={user?.currency} />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-5 lg:col-span-3">
          <h2 className="font-display text-base font-semibold text-ink">
            Income vs. expenses, {month.split("-")[0]}
          </h2>
          <p className="text-xs text-slate">Monthly trend for the year</p>
          <div className="mt-2">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate">
                Loading…
              </div>
            ) : (
              <TrendChart data={trend} currency={user?.currency} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
