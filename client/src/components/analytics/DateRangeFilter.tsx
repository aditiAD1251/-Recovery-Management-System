import React from 'react';
import { Calendar, RotateCcw } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  onReset: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
  onReset,
}) => {
  const setPreset = (preset: 'ALL' | '7D' | '30D' | 'MONTH') => {
    const now = new Date();
    const eStr = now.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      onReset();
      return;
    }

    if (preset === '7D') {
      const s = new Date(Date.now() - 7 * 86400000);
      onChange({ startDate: s.toISOString().slice(0, 10), endDate: eStr });
      return;
    }

    if (preset === '30D') {
      const s = new Date(Date.now() - 30 * 86400000);
      onChange({ startDate: s.toISOString().slice(0, 10), endDate: eStr });
      return;
    }

    if (preset === 'MONTH') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      onChange({ startDate: s.toISOString().slice(0, 10), endDate: eStr });
      return;
    }
  };

  const isCustomOrActive = Boolean(startDate || endDate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md text-xs">
      {/* Preset Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          Period:
        </span>
        <button
          onClick={() => setPreset('ALL')}
          className={`px-2.5 py-1 rounded-lg font-semibold border transition ${
            !startDate && !endDate
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setPreset('30D')}
          className="px-2.5 py-1 rounded-lg font-semibold bg-slate-950 text-slate-400 border border-slate-800 hover:text-white transition"
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setPreset('7D')}
          className="px-2.5 py-1 rounded-lg font-semibold bg-slate-950 text-slate-400 border border-slate-800 hover:text-white transition"
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setPreset('MONTH')}
          className="px-2.5 py-1 rounded-lg font-semibold bg-slate-950 text-slate-400 border border-slate-800 hover:text-white transition"
        >
          This Month
        </button>
      </div>

      {/* Date Pickers */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChange({ startDate: e.target.value, endDate })}
            className="bg-transparent text-slate-200 text-xs focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChange({ startDate, endDate: e.target.value })}
            className="bg-transparent text-slate-200 text-xs focus:outline-none"
          />
        </div>

        {isCustomOrActive && (
          <button
            onClick={onReset}
            title="Reset Date Filter"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DateRangeFilter;
