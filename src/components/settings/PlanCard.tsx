// src/components/settings/PlanCard.tsx
'use client';

import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  type PricingPlan,
  type BillingCycle,
  type Currency,
  CURRENCY_SYMBOLS,
  formatPrice,
} from '@/lib/pricingPlans';

interface PlanCardProps {
  plan: PricingPlan;
  cycle: BillingCycle;
  currency: Currency;
  onSelect: (planId: PricingPlan['id']) => void;
}

/** One plan limit: number on top, label underneath (label is read first by screen readers). */
function Limit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center gap-0.5 px-2 py-3 text-center">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}

export function PlanCard({ plan, cycle, currency, onSelect }: PlanCardProps) {
  const symbol = CURRENCY_SYMBOLS[currency];
  const price = plan.prices[currency];
  const amount = cycle === 'monthly' ? price.monthly : price.annual;

  return (
    <Card
      className={cn(
        'flex h-full flex-col rounded-2xl p-5 sm:p-6',
        plan.recommended && 'border-teal-400 shadow-sm ring-1 ring-teal-400/30'
      )}
    >
      {/* Name + badge */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-ink-900">{plan.name}</h3>
        {plan.recommended && (
          <span className="flex-shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-gray-500">{plan.tagline}</p>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-ink-900">
          <span className="mr-0.5 text-2xl font-medium text-gray-400">{symbol}</span>
          {formatPrice(amount, currency)}
        </span>
        <span className="text-sm text-gray-500">/{cycle === 'monthly' ? 'month' : 'year'}</span>
      </div>

      {/* Fixed-height row so cards don't shift when the cycle changes */}
      <div className="mb-6 mt-2 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
        {cycle === 'annual' ? (
          <>
            <span className="text-xs text-gray-500">
              {symbol}
              {formatPrice(price.annualMonthlyEquivalent, currency)}/month equivalent
            </span>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
              Save {price.annualSavingsPercent}%
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400">Billed monthly</span>
        )}
      </div>

      {/* Limits */}
      <dl className="mb-6 grid grid-cols-3 divide-x divide-porcelain-200 rounded-xl bg-gray-50">
        <Limit value={plan.limits.patients.toLocaleString()} label="patients" />
        <Limit
          value={String(plan.limits.dentists)}
          label={plan.limits.dentists === 1 ? 'dentist' : 'dentists'}
        />
        <Limit value={String(plan.limits.staff)} label="staff accounts" />
      </dl>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-3">
        {plan.features.map(feature => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-snug text-gray-700">
            <span
              className="mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-50"
              aria-hidden="true"
            >
              <Check className="h-3 w-3 text-teal-600" strokeWidth={3} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.recommended ? 'primary' : 'secondary'}
        className="min-h-[44px] w-full touch-manipulation"
        onClick={() => onSelect(plan.id)}
      >
        Choose {plan.name}
      </Button>
    </Card>
  );
}