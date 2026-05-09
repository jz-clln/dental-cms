'use client';

import { useTrialStatus } from '@/lib/hooks/useTrialStatus';
import Link from 'next/link';

export function TrialCountdown() {
  const { state, daysLeft, daysTotal, loading } = useTrialStatus();

  if (loading || state === 'paid') return null;

  const progress = Math.min(100, ((daysTotal - daysLeft) / daysTotal) * 100);
  const activeDots = Math.round((daysLeft / daysTotal) * daysTotal);

  if (state === 'expired') {
    return (
      <div className="mx-3 mb-3 p-[14px] rounded-[14px] bg-white dark:bg-background-primary border border-[#F09595]/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.06] to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
            Free trial
          </span>
          <span className="text-[11px] font-medium text-[#993C1D] bg-[#FAECE7] px-2 py-0.5 rounded-full">
            Ended
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-[22px] font-medium leading-none tracking-tight text-[#D85A30]">0</span>
          <span className="text-[12px] text-muted-foreground">days remaining</span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mb-2.5">Your trial has ended</p>
        <div className="w-full h-[3px] rounded-full bg-border overflow-hidden mb-2.5">
          <div className="h-[3px] rounded-full w-full bg-gradient-to-r from-[#D85A30] to-[#F0997B]" />
        </div>
        <Link
          href="/settings/billing"
          className="flex items-center justify-between pt-2.5 border-t border-border group"
        >
          <span className="text-[12px] font-medium text-[#993C1D]">Upgrade to continue</span>
          <span className="w-5 h-5 rounded-full bg-[#FAECE7] flex items-center justify-center text-[#D85A30] text-[12px] group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3 p-[14px] rounded-[14px] bg-white dark:bg-background-primary border border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.06] to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
          Free trial
        </span>
        <span className="text-[11px] font-medium text-[#0F6E56] bg-[#E1F5EE] px-2 py-0.5 rounded-full">
          {daysLeft}d left
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="text-[22px] font-medium leading-none tracking-tight">{daysLeft}</span>
        <span className="text-[12px] text-muted-foreground">days remaining</span>
      </div>
      <p className="text-[11px] text-muted-foreground/60 mb-2.5">of {daysTotal}-day trial</p>
      <div className="w-full h-[3px] rounded-full bg-border overflow-hidden mb-2">
        <div
          className="h-[3px] rounded-full bg-gradient-to-r from-[#1D9E75] to-[#5DCAA5] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-[3px] mt-2">
        {Array.from({ length: daysTotal }).map((_, i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors ${
              i < activeDots ? 'bg-[#1D9E75]' : 'bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}