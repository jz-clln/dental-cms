'use client';

import Link from 'next/link';
import { useTrialStatus } from '@/lib/hooks/useTrialStatus';
import { Card } from '@/components/ui/Card';

export function TrialCountdown() {
  const { state, daysLeft, daysTotal, loading } = useTrialStatus();

  if (loading || state === 'paid') return null;

  const isExpired = state === 'expired';
  const progress = isExpired
    ? 100
    : Math.min(100, ((daysTotal - daysLeft) / daysTotal) * 100);

  return (
    <Card className="mx-3 mb-3 p-4">
      <p className={`text-sm font-medium ${isExpired ? 'text-red-700' : 'text-ink-900'}`}>
        {isExpired
          ? 'Your trial has ended'
          : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your trial`}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        {isExpired ? 'Upgrade to restore full access.' : `Day ${daysTotal - daysLeft} of ${daysTotal}`}
      </p>

      <div className="mt-3 h-1 w-full rounded-full bg-porcelain-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isExpired ? 'bg-red-500' : 'bg-teal-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <Link
        href="/settings/billing"
        className={`mt-3 block text-xs font-medium hover:underline underline-offset-2 ${
          isExpired ? 'text-red-700' : 'text-teal-700'
        }`}
      >
        {isExpired ? 'Upgrade to continue' : 'Upgrade plan'}
      </Link>
    </Card>
  );
}