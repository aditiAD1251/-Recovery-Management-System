import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';
  badge?: {
    text: string;
    variant?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  };
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    valueText: 'text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    valueText: 'text-blue-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    valueText: 'text-purple-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    valueText: 'text-amber-400',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    valueText: 'text-rose-400',
  },
  slate: {
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    text: 'text-slate-400',
    valueText: 'text-white',
  },
};

const badgeMap = {
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'blue',
  badge,
}) => {
  const styles = colorMap[iconColor] || colorMap.blue;

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 hover:border-slate-700 transition">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${styles.bg} ${styles.border} ${styles.text}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
          {value}
        </span>
        {badge && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              badgeMap[badge.variant || 'blue']
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
          <span>{subtitle}</span>
        </p>
      )}
    </div>
  );
};

export default StatCard;
