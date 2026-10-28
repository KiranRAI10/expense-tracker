import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency, MONTH_NAMES_SHORT } from "../utils/format";

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ink/10 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink">{MONTH_NAMES_SHORT[label - 1]}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.fill }}>
          {p.dataKey === "income" ? "Income" : "Expense"}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
};

const TrendChart = ({ data, currency }) => {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1B2430" strokeOpacity={0.08} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={(m) => MONTH_NAMES_SHORT[m - 1]}
          tick={{ fontSize: 11, fill: "#6B7785" }}
          axisLine={{ stroke: "#1B2430", strokeOpacity: 0.1 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6B7785" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "#1B2430", opacity: 0.04 }} />
        <Legend
          formatter={(value) => (value === "income" ? "Income" : "Expense")}
          wrapperStyle={{ fontSize: "12px" }}
        />
        <Bar dataKey="income" fill="#3F7259" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="expense" fill="#C1533E" radius={[3, 3, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TrendChart;
