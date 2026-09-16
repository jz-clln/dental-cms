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

export function PlanCard({ plan, cycle, currency, onSelect }: PlanCardProps) {
  const symbol = CURRENCY_SYMBOLS[currency];
  const price = plan.prices[currency];
  const amount = cycle === 'monthly' ? price.monthly : price.annual;

  return (
    <Card
      className={cn(
        'p-6 flex flex-col',
        plan.recommended && 'border-teal-300 ring-1 ring-teal-100'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-semibold text-ink-900">{plan.name}</h3>
        {plan.recommended && (
          <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
            Recommended
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">{plan.tagline}</p>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-ink-900">
          {symbol}
          {formatPrice(amount, currency)}
        </span>
        <span className="text-sm text-gray-500">/{cycle === 'monthly' ? 'month' : 'year'}</span>
      </div>

      <div className="h-6 flex items-center gap-2 mt-1 mb-4">
        {cycle === 'annual' && (
          <>
            <span className="text-xs text-gray-500">
              {symbol}
              {formatPrice(price.annualMonthlyEquivalent, currency)}/month equivalent
            </span>
            <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
              Save {price.annualSavingsPercent}%
            </span>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 pb-4 mb-4 border-b border-porcelain-200">
        Up to {plan.limits.patients.toLocaleString()} patients &middot;{' '}
        {plan.limits.dentists} {plan.limits.dentists === 1 ? 'dentist' : 'dentists'} &middot;{' '}
        {plan.limits.staff} staff accounts
      </p>

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map(feature => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.recommended ? 'primary' : 'secondary'}
        className="w-full"
        onClick={() => onSelect(plan.id)}
      >
        Choose {plan.name}
      </Button>
    </Card>
  );
}