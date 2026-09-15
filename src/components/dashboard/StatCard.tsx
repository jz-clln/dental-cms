// src/components/dashboard/StatCard.tsx
//
// FIXES APPLIED (REVISION 2 — reverting to Geist everywhere):
// - Stat numbers revert from `font-display font-semibold` to `font-sans
//   font-bold`, matching the weight now used in BiteyCard's stat numbers
//   — so every "big number in a card" across the dashboard uses the same
//   family and weight.
// - Border/shadow tokens (porcelain/shadow-card) kept as-is — unrelated
//   to the font issue.
'use client';

import Link from 'next/link';
import { memo } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
  loading: boolean;
  href?: string;
}

export const StatCard = memo(function StatCard({
  label, value, sub, icon: Icon, iconColor, valueColor, loading, href,
}: Props) {
  const inner = (
    <div className="bg-white rounded-2xl border border-porcelain-200 shadow-card px-3.5 py-3 flex flex-col gap-1.5 hover:shadow-card-hover transition-shadow duration-200 ease-out-quint">
      <div className="flex items-center justify-between">
        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-semibold text-gray-400">
          {label}
        </span>
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconColor}`} />
      </div>
      <p className={`text-xl sm:text-2xl font-sans font-bold leading-none ${valueColor ?? 'text-ink-900'}`}>
        {loading
          ? <span className="inline-block w-12 h-6 bg-porcelain-200 rounded animate-pulse" />
          : (value ?? 0)}
      </p>
      <p className="text-[9px] sm:text-[10px] text-gray-400">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
});