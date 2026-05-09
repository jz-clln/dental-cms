'use client';

import { useState } from 'react';
import { useTrialStatus } from '@/lib/hooks/useTrialStatus';
import { X, Sparkles, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function TrialBanner() {
  const { state, daysLeft, loading } = useTrialStatus();
  const [dismissed, setDismissed] = useState(false);

  // Only show trialing banner when 10 or fewer days remain
  if (loading || dismissed || state === 'paid') return null;
  if (state === 'trialing' && daysLeft > 10) return null;

  const isUrgent = state === 'trialing' && daysLeft <= 3;

  if (state === 'trialing') {
    return (
      <div
        className={`
          relative flex items-center gap-3 overflow-hidden
          rounded-2xl px-4 py-3
          border
          ${isUrgent
            ? 'bg-amber-50/80 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-800/40'
            : 'bg-emerald-50/70 border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/40'
          }
          shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)]
          backdrop-blur-sm
          transition-all duration-300
        `}
      >
        {/* Subtle shimmer line at top */}
        <div
          className={`
            absolute top-0 left-0 right-0 h-px
            ${isUrgent
              ? 'bg-gradient-to-r from-transparent via-amber-400/50 to-transparent'
              : 'bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent'
            }
          `}
        />

        {/* Pulse dot */}
        <span className="relative flex-shrink-0">
          <span
            className={`
              block w-2 h-2 rounded-full
              ${isUrgent ? 'bg-amber-500' : 'bg-emerald-500'}
            `}
          />
          <span
            className={`
              absolute inset-0 -m-1 rounded-full opacity-30 animate-ping
              ${isUrgent ? 'bg-amber-500' : 'bg-emerald-500'}
            `}
          />
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <p
            className={`
              text-[12.5px] font-semibold tracking-tight
              ${isUrgent
                ? 'text-amber-900 dark:text-amber-200'
                : 'text-emerald-900 dark:text-emerald-200'
              }
            `}
          >
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in your trial
          </p>
          <span
            className={`
              hidden sm:inline text-[12px]
              ${isUrgent
                ? 'text-amber-700/80 dark:text-amber-400/80'
                : 'text-emerald-700/80 dark:text-emerald-400/80'
              }
            `}
          >
            &mdash;
            <Link
              href="/settings/billing"
              className={`
                ml-1 font-medium underline-offset-2 decoration-dotted underline
                transition-opacity hover:opacity-70
                ${isUrgent
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-emerald-800 dark:text-emerald-300'
                }
              `}
            >
              Upgrade to keep full access
            </Link>
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/settings/billing"
            className={`
              hidden sm:flex items-center gap-1.5
              text-[11.5px] font-semibold tracking-wide
              px-3 py-1.5 rounded-lg
              transition-all duration-150
              ${isUrgent
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200 dark:shadow-amber-900'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200 dark:shadow-emerald-900'
              }
            `}
          >
            <Sparkles className="w-3 h-3" />
            Upgrade
          </Link>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className={`
              w-6 h-6 rounded-full flex items-center justify-center
              transition-colors duration-150
              ${isUrgent
                ? 'text-amber-600/60 hover:text-amber-800 hover:bg-amber-200/50 dark:text-amber-400/60 dark:hover:text-amber-200 dark:hover:bg-amber-800/40'
                : 'text-emerald-600/60 hover:text-emerald-800 hover:bg-emerald-200/50 dark:text-emerald-400/60 dark:hover:text-emerald-200 dark:hover:bg-emerald-800/40'
              }
            `}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Trial expired
  return (
    <div
      className="
        relative flex items-center gap-3 overflow-hidden
        rounded-2xl px-4 py-3
        bg-red-50/80 border border-red-200/60
        dark:bg-red-950/30 dark:border-red-800/40
        shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.04)]
        backdrop-blur-sm
        transition-all duration-300
      "
    >
      {/* Shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />

      {/* Icon */}
      <span className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0 border border-red-200/60 dark:border-red-700/40">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <p className="text-[12.5px] font-semibold tracking-tight text-red-900 dark:text-red-200">
          Trial ended
        </p>
        <span className="hidden sm:inline text-[12px] text-red-700/80 dark:text-red-400/80">
          &mdash; Limited to 30 patients.{' '}
          <Link
            href="/settings/billing"
            className="font-medium underline decoration-dotted underline-offset-2 text-red-800 dark:text-red-300 hover:opacity-70 transition-opacity"
          >
            Upgrade to restore full access
          </Link>
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/settings/billing"
          className="
            hidden sm:flex items-center gap-1.5
            text-[11.5px] font-semibold tracking-wide
            px-3 py-1.5 rounded-lg
            bg-red-600 text-white hover:bg-red-700
            shadow-sm shadow-red-200 dark:shadow-red-900
            transition-all duration-150
          "
        >
          <Sparkles className="w-3 h-3" />
          Upgrade now
        </Link>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="
            w-6 h-6 rounded-full flex items-center justify-center
            text-red-500/60 hover:text-red-700 hover:bg-red-200/50
            dark:text-red-400/60 dark:hover:text-red-200 dark:hover:bg-red-800/40
            transition-colors duration-150
          "
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}