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

/*
 * Sizing rule for this component:
 *  - Base classes = phone sizing (larger type, 44px button)
 *  - md: classes  = compact desktop sizing, in line with the app's table scale
 *                   (13px body, 12px secondary, 11px small labels)
 */

interface PlanCardProps {
  plan: PricingPlan;
  cycle: BillingCycle;
  currency: Currency;
  onSelect: (planId: PricingPlan['id']) => void;
}

/** One plan limit: number on top, label underneath (label is read first by screen readers). */
function Limit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center gap-0.5 px-2 py-3 text-center md:gap-0 md:py-2">
      <dt className="text-xs md:text-[11px]">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-ink-900 md:text-[13px]">{value}</dd>
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
        'flex h-full flex-col rounded-2xl p-5',
        plan.recommended && 'border-teal-400 shadow-sm ring-1 ring-teal-400/30'
      )}
    >
      {/* Name + badge */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-ink-900 md:text-[15px] md:tracking-normal">
          {plan.name}
        </h3>
        {plan.recommended && (
          <span className="flex-shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 md:px-2 md:py-0.5 md:text-[11px]">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-gray-500 md:mt-0.5 md:text-[12.5px] md:leading-5">
        {plan.tagline}
      </p>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1.5 md:mt-4 md:gap-1">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-ink-900 md:text-[26px]">
          <span className="mr-0.5 text-2xl font-medium text-gray-400 md:text-lg">{symbol}</span>
          {formatPrice(amount, currency)}
        </span>
        <span className="text-sm text-gray-500 md:text-xs">
          /{cycle === 'monthly' ? 'month' : 'year'}
        </span>
      </div>

      {/* Fixed-height row so cards don't shift when the cycle changes */}
      <div className="mb-6 mt-2 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 md:mb-4 md:mt-1 md:min-h-5">
        {cycle === 'annual' ? (
          <>
            <span className="text-xs text-gray-500 md:text-[11px]">
              {symbol}
              {formatPrice(price.annualMonthlyEquivalent, currency)}/month equivalent
            </span>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 md:px-1.5 md:text-[11px]">
              Save {price.annualSavingsPercent}%
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400 md:text-[11px]">Billed monthly</span>
        )}
      </div>

      {/* Limits */}
      <dl className="mb-6 grid grid-cols-3 divide-x divide-porcelain-200 rounded-xl bg-gray-50 text-gray-500 md:mb-4">
        <Limit value={plan.limits.patients.toLocaleString()} label="patients" />
        <Limit
          value={String(plan.limits.dentists)}
          label={plan.limits.dentists === 1 ? 'dentist' : 'dentists'}
        />
        <Limit value={String(plan.limits.staff)} label="staff accounts" />
      </dl>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-3 md:mb-5 md:space-y-2">
        {plan.features.map(feature => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm leading-snug text-gray-700 md:gap-2.5 md:text-[13px]"
          >
            <span
              className="mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 md:h-4 md:w-4"
              aria-hidden="true"
            >
              <Check className="h-3 w-3 text-teal-600 md:h-2.5 md:w-2.5" strokeWidth={3} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.recommended ? 'primary' : 'secondary'}
        className="min-h-[44px] w-full touch-manipulation md:h-9 md:min-h-0 md:text-[13px]"
        onClick={() => onSelect(plan.id)}
      >
        Choose {plan.name}
      </Button>
    </Card>
  );
}