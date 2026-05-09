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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3.5 py-3 flex flex-col gap-1.5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-semibold text-gray-400">
          {label}
        </span>
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconColor}`} />
      </div>
      <p className={`text-xl sm:text-2xl font-bold leading-none ${valueColor ?? 'text-gray-900'}`}>
        {loading
          ? <span className="inline-block w-12 h-6 bg-gray-100 rounded animate-pulse" />
          : (value ?? 0)}
      </p>
      <p className="text-[9px] sm:text-[10px] text-gray-400">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
});