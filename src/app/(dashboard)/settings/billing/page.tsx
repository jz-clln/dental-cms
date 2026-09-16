// src/app/(dashboard)/settings/billing/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTrialStatus } from '@/lib/hooks/useTrialStatus';
import { useAppToast } from '@/app/(dashboard)/layout';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { PlanCard } from '@/components/settings/PlanCard';
import { PRICING_PLANS, type BillingCycle, type Currency, type PricingPlan } from '@/lib/pricingPlans';

export default function BillingPage() {
  const { state, daysLeft, patientCount, patientLimit, loading } = useTrialStatus();
  const toast = useAppToast();

  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [currency, setCurrency] = useState<Currency>('PHP');

  function handleSelectPlan(planId: PricingPlan['id']) {
    const plan = PRICING_PLANS.find(p => p.id === planId);
    toast.info(`${plan?.name ?? 'Plan'} selected — payment isn't connected yet.`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Settings
        </Link>
        <h1 className="text-lg font-semibold text-ink-900">Plans & Billing</h1>
        {!loading && (
          <p className="text-sm text-gray-500 mt-1">
            {state === 'paid' && 'You have an active subscription.'}
            {state === 'trialing' &&
              `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your trial · ${patientCount}/${patientLimit} patients used`}
            {state === 'expired' &&
              `Your trial has ended · ${patientCount}/${patientLimit} patients used on the free tier`}
          </p>
        )}
      </div>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Bitey note — image slot; hides gracefully until /public/bitey/proud.png exists */}
      <div className="flex items-center gap-4 rounded-xl border border-porcelain-200 bg-white p-4">
        <img
          src="/bitey/proud.png"
          alt="Bitey"
          className="w-14 h-14 object-contain flex-shrink-0"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <p className="text-sm text-gray-600">
          Upgrade anytime with confidence. All your data, patients, and records will carry over automatically.
        </p>
      </div>
    </div>
  );
}