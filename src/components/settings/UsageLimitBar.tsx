// src/components/settings/UsageLimitBar.tsx
'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageLimitBarProps {
  label: string; // e.g. "Dentists", "Staff accounts"
  current: number;
  limit: number;
}

export function UsageLimitBar({ label, current, limit }: UsageLimitBarProps) {
  const pct = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
  const atCap = current >= limit;
  const nearCap = !atCap && pct >= 90;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className={cn(
          'font-medium tabular-nums',
          atCap ? 'text-red-500' : nearCap ? 'text-amber-600' : 'text-gray-600'
        )}>
          {current}/{limit}
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            atCap ? 'bg-red-400' : nearCap ? 'bg-amber-400' : 'bg-teal-600'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {atCap && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <Lock className="w-3 h-3" />
          Limit reached —{' '}
          <Link href="/settings/billing" className="underline font-medium">
            upgrade to add more
          </Link>.
        </p>
      )}

      {nearCap && (
        <p className="text-xs text-amber-600">
          Approaching your limit —{' '}
          <Link href="/settings/billing" className="underline font-medium">
            consider upgrading
          </Link>.
        </p>
      )}
    </div>
  );
}