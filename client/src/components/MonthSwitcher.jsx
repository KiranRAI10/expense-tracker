import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "../utils/format";

const MonthSwitcher = ({ month, onChange }) => {
  return (
    <div className="flex items-center gap-1 rounded-md border border-ink/10 bg-white px-1.5 py-1">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded p-1.5 text-slate transition hover:bg-paper-dim hover:text-ink"
        aria-label="Previous month"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="w-36 text-center font-mono text-sm text-ink">{monthLabel(month)}</span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded p-1.5 text-slate transition hover:bg-paper-dim hover:text-ink"
        aria-label="Next month"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default MonthSwitcher;
