import React from 'react';
import { BucketMetric } from '../../types/analytics';

interface BucketDistributionBarProps {
  buckets: BucketMetric[];
  title?: string;
  subtitle?: string;
}

const bucketColors: Record<
  string,
  { bg: string; fill: string; text: string; border: string; label: string }
> = {
  '0-30': {
    bg: 'bg-emerald-500/10',
    fill: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    label: '0-30 Days (Early Stage)',
  },
  '31-60': {
    bg: 'bg-blue-500/10',
    fill: 'bg-blue-500',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    label: '31-60 Days (Mid Stage)',
  },
  '61-90': {
    bg: 'bg-amber-500/10',
    fill: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    label: '61-90 Days (Late Stage)',
  },
  '90+': {
    bg: 'bg-rose-500/10',
    fill: 'bg-rose-500',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    label: '90+ Days (NPA / Default)',
  },
};

export const BucketDistributionBar: React.FC<BucketDistributionBarProps> = ({
  buckets,
  title = 'Delinquency Portfolio by DPD Bucket',
  subtitle = 'Distribution across SMA0, SMA1, SMA2, and NPA default delinquency stages',
}) => {
  const totalCount = buckets.reduce((acc, b) => acc + (b.count || 0), 0);
  const totalOverdue = buckets.reduce((acc, b) => acc + (b.totalOverdue || 0), 0);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Total Overdue</span>
          <span className="text-base font-mono font-extrabold text-rose-400">
            ₹{totalOverdue.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5 gap-0.5">
          {buckets.map((b) => {
            const pct = totalCount > 0 ? (b.count / totalCount) * 100 : 0;
            if (pct <= 0) return null;
            const styling = bucketColors[b.bucket] || bucketColors['0-30'];

            return (
              <div
                key={b.bucket}
                style={{ width: `${Math.max(4, pct)}%` }}
                title={`${b.bucket} Bucket: ${b.count} accounts (${pct.toFixed(1)}%) - ₹${b.totalOverdue.toLocaleString('en-IN')} overdue`}
                className={`h-full rounded-sm ${styling.fill} transition-all duration-500 hover:opacity-90 cursor-pointer`}
              />
            );
          })}
        </div>
      </div>

      {/* 4-Column Bucket Metric Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {buckets.map((b) => {
          const styling = bucketColors[b.bucket] || bucketColors['0-30'];
          const pct = totalCount > 0 ? Number(((b.count / totalCount) * 100).toFixed(1)) : 0;

          return (
            <div
              key={b.bucket}
              className={`p-3.5 rounded-xl bg-slate-950/80 border ${styling.border} space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styling.bg} ${styling.text} ${styling.border}`}>
                  {b.bucket} Bucket
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">{pct}%</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-mono font-bold text-white">{b.count}</span>
                  <span className="text-[11px] text-slate-400">loans</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] flex justify-between items-center text-slate-400">
                <span>Overdue:</span>
                <span className="font-mono font-bold text-slate-200">
                  ₹{b.totalOverdue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BucketDistributionBar;
