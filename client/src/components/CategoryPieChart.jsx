import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "../utils/format";

const CustomTooltip = ({ active, payload, currency }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border border-ink/10 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{item.name}</p>
      <p className="font-mono text-slate">{formatCurrency(item.total, currency)}</p>
    </div>
  );
};

const CategoryPieChart = ({ data, currency }) => {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate">
        No expenses recorded for this month yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          strokeWidth={2}
          stroke="#F7F5F0"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color || "#3F7259"} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", color: "#1B2430" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;
