'use client';

import { memo, useMemo } from 'react';
import { formatPeso } from '@/lib/utils';
import type { Stats } from '@/types/dashboard';

interface Props {
  stats: Stats;
  loading: boolean;
}

const DAY_LABELS = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'] as const;

export const NetWorthCard = memo(function NetWorthCard({ stats, loading }: Props) {
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  // FIX: memoize max so it doesn't recompute on every render
  const maxRevenue = useMemo(
    () => Math.max(...stats.dailyRevenue, 1),
    [stats.dailyRevenue],
  );

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
          Revenue this week
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 leading-none">
          {loading
            ? <span className="inline-block w-32 h-8 bg-gray-100 rounded animate-pulse" />
            : formatPeso(stats.revenueThisWeek)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {loading
            ? '—'
            : stats.revenueAverage > 0
            ? `vs. ${formatPeso(stats.revenueAverage)} weekly avg`
            : 'No average data yet — keep going!'}
        </p>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-end gap-1 h-10">
          {DAY_LABELS.map((d, i) => {
            const isPast  = i < todayIdx;
            const isToday = i === todayIdx;
            const heightPct = isToday || isPast
              ? Math.max(8, Math.round((stats.dailyRevenue[i] / maxRevenue) * 100))
              : 8;
            return (
              <div key={d} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm transition-all ${
                    isToday  ? 'bg-[#1a3d2b]'
                    : isPast ? 'bg-teal-400/60'
                             : 'bg-gray-100'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className={`text-[9px] font-medium ${isToday ? 'text-[#1a3d2b]' : 'text-gray-300'}`}>
                  {d}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});