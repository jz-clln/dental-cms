'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrialStatus } from '@/lib/hooks/useTrialStatus';
import { Button } from '@/components/ui/Button';
import { Clock, AlertTriangle, X } from 'lucide-react';

export function TrialBanner() {
  const { state, daysLeft, loading } = useTrialStatus();
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  // Only show the trialing banner once 10 or fewer days remain
  if (loading || dismissed || state === 'paid') return null;
  if (state === 'trialing' && daysLeft > 10) return null;

  const isExpired = state === 'expired';
  const isUrgent = state === 'trialing' && daysLeft <= 3;

  const tone = isExpired
    ? { border: 'border-red-200', bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-900' }
    : isUrgent
    ? { border: 'border-amber-200', bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-900' }
    : { border: 'border-teal-200', bg: 'bg-teal-50', icon: 'text-teal-700', text: 'text-teal-900' };

  const message = isExpired
    ? 'Your trial has ended. Patient records are limited to 30.'
    : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your trial.`;

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${tone.border} ${tone.bg}`}
    >
      {isExpired || isUrgent ? (
        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${tone.icon}`} />
      ) : (
        <Clock className={`w-4 h-4 flex-shrink-0 ${tone.icon}`} />
      )}

      <p className={`flex-1 min-w-0 truncate text-sm font-medium ${tone.text}`}>
        {message}
      </p>

      <Button
        variant={isExpired ? 'danger' : 'primary'}
        size="sm"
        className="flex-shrink-0"
        onClick={() => router.push('/settings/billing')}
      >
        {isExpired ? 'Upgrade now' : 'Upgrade'}
      </Button>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className={`flex-shrink-0 rounded-md p-2 -m-1 transition-colors hover:bg-black/5 ${tone.icon}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}