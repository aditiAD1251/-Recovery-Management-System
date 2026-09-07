import React from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

interface DonutChartProps {
  title: string;
  subtitle?: string;
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  segments,
  centerLabel,
  centerValue,
}) => {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);

  // Calculate SVG arc strokes
  let accumulatedPercent = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
        {/* SVG Ring Chart */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#0f172a"
              strokeWidth="12"
            />

            {total > 0 &&
              segments.map((seg, idx) => {
                const percent = (seg.value / total) * 100;
                if (percent <= 0) return null;

                const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += percent;

                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="12"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 hover:opacity-80"
                  />
                );
              })}
          </svg>

          {/* Centered Metric */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-mono font-extrabold text-white">
              {centerValue !== undefined ? centerValue : total}
            </span>
            {centerLabel && (
              <span className="text-[9px] uppercase tracking-wider text-slate-400">
                {centerLabel}
              </span>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-2 text-xs">
          {segments.map((seg, idx) => {
            const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0';

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-300 font-medium">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-white">
                    {seg.formattedValue || seg.value}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DonutChart;
