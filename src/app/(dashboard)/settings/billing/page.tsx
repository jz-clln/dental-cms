// src/app/(dashboard)/settings/billing/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { useTrialStatus } from '@/lib/hooks/useTrialStatus';
import { useAppToast } from '@/app/(dashboard)/layout';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { PlanCard } from '@/components/settings/PlanCard';
import { PRICING_PLANS, type BillingCycle, type Currency, type PricingPlan } from '@/lib/pricingPlans';

type TrialStatus = ReturnType<typeof useTrialStatus>;
type StatusPanelProps = Pick<TrialStatus, 'state' | 'daysLeft' | 'patientCount' | 'patientLimit'>;

/* ------------------------------------------------------------------ */
/* Usage bar                                                           */
/* ------------------------------------------------------------------ */

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const fill = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-ink-900';

  return (
    <div className="w-full sm:w-64">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-gray-500">Patients used</span>
        <span className="font-medium tabular-nums text-ink-900">
          {used} <span className="font-normal text-gray-400">/ {limit}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Patients used"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status panel — the one prominent element on the page                */
/* ------------------------------------------------------------------ */

function StatusPanel({ state, daysLeft, patientCount, patientLimit }: StatusPanelProps) {
  const content =
    state === 'paid'
      ? {
          icon: CheckCircle2,
          tone: 'bg-emerald-50 text-emerald-600',
          title: 'Subscription active',
          body: 'You have an active subscription.',
          showUsage: false,
        }
      : state === 'trialing'
        ? {
            icon: Clock,
            tone: 'bg-gray-100 text-ink-900',
            title: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your trial`,
            body: 'Choose a plan any time before your trial ends.',
            showUsage: true,
          }
        : {
            icon: AlertCircle,
            tone: 'bg-amber-50 text-amber-600',
            title: 'Your trial has ended',
            body: "You're on the free tier.",
            showUsage: true,
          };

  const Icon = content.icon;

  return (
    <section
      aria-label="Subscription status"
      className="flex flex-col gap-5 rounded-2xl border border-porcelain-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${content.tone}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink-900 sm:text-lg">{content.title}</p>
          <p className="mt-0.5 text-sm text-gray-500">{content.body}</p>
        </div>
      </div>

      {content.showUsage && <UsageBar used={patientCount} limit={patientLimit} />}
    </section>
  );
}

function StatusPanelSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col gap-5 rounded-2xl border border-porcelain-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-gray-100" />
        <div className="space-y-2">
          <div className="h-4 w-44 rounded bg-gray-100" />
          <div className="h-3 w-32 rounded bg-gray-100" />
        </div>
      </div>
      <div className="h-8 w-full rounded bg-gray-100 sm:w-64" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const { state, daysLeft, patientCount, patientLimit, loading } = useTrialStatus();
  const toast = useAppToast();

  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [currency, setCurrency] = useState<Currency>('PHP');
  const [showBitey, setShowBitey] = useState(true);

  function handleSelectPlan(planId: PricingPlan['id']) {
    const plan = PRICING_PLANS.find(p => p.id === planId);
    toast.info(`${plan?.name ?? 'Plan'} selected — payment isn't connected yet.`);
  }

  // Full class strings so Tailwind can detect them at build time.
  const gridCols =
    PRICING_PLANS.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/settings"
          className="-ml-2 inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-500 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/20"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Plans &amp; Billing
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 sm:text-base">
          Compare plans and choose what fits.
        </p>
      </header>

      {/* Status */}
      {loading ? (
        <StatusPanelSkeleton />
      ) : (
        <StatusPanel
          state={state}
          daysLeft={daysLeft}
          patientCount={patientCount}
          patientLimit={patientLimit}
        />
      )}

      {/* Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedToggle
          ariaLabel="Billing cycle"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'annual', label: 'Annual' },
          ]}
        />
        <SegmentedToggle
          ariaLabel="Currency"
          value={currency}
          onChange={setCurrency}
          options={[
            { value: 'PHP', label: 'PHP' },
            { value: 'USD', label: 'USD' },
          ]}
        />
      </div>

      {/* Plan cards */}
      <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${gridCols}`}>
        {PRICING_PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            currency={currency}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      {/* Bitey note — hides entirely (no empty gap) until /public/bitey/proud.png exists */}
      {showBitey && (
        <aside className="flex items-center gap-4 rounded-2xl border border-porcelain-200 bg-white p-4 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bitey/proud.png"
            alt=""
            className="h-14 w-14 flex-shrink-0 object-contain sm:h-16 sm:w-16"
            onError={() => setShowBitey(false)}
          />
          <p className="text-sm leading-relaxed text-gray-600">
            Upgrade anytime with confidence. All your data, patients, and records will carry over
            automatically.
          </p>
        </aside>
      )}
    </div>
  );
}