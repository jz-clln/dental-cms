// src/lib/pricingPlans.ts
//
// Static plan definitions for the billing page. PHP and USD are
// independent, predefined price sets — never derive one from the
// other via an exchange rate.

export type BillingCycle = 'monthly' | 'annual';
export type Currency = 'PHP' | 'USD';

export interface PlanPrice {
  monthly: number;
  annual: number;
  annualMonthlyEquivalent: number;
  annualSavingsPercent: number;
}

export interface PricingPlan {
  id: 'basic' | 'pro';
  name: string;
  tagline: string;
  recommended?: boolean;
  limits: {
    patients: number;
    dentists: number;
    staff: number;
  };
  features: string[];
  prices: Record<Currency, PlanPrice>;
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PHP: '₱',
  USD: '$',
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For solo dentists and small clinics.',
    limits: { patients: 300, dentists: 1, staff: 2 },
    features: [
      'Patient profiles',
      'Appointment scheduling',
      'Dental records & visit notes',
      'Patient billing & payment tracking',
      'Inventory management',
      'Dashboard',
      'Basic reports',
    ],
    prices: {
      PHP: { monthly: 349, annual: 2999, annualMonthlyEquivalent: 250, annualSavingsPercent: 28 },
      USD: { monthly: 7.99, annual: 68.99, annualMonthlyEquivalent: 5.75, annualSavingsPercent: 28 },
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing clinics and multi-dentist practices.',
    recommended: true,
    limits: { patients: 1000, dentists: 5, staff: 10 },
    features: [
      'Everything in Basic',
      'Multi-dentist scheduling',
      'Advanced reports & analytics',
      'Expanded staff management',
      'Priority support',
    ],
    prices: {
      PHP: { monthly: 499, annual: 4499, annualMonthlyEquivalent: 375, annualSavingsPercent: 25 },
      USD: { monthly: 10.99, annual: 94.99, annualMonthlyEquivalent: 7.92, annualSavingsPercent: 25 },
    },
  },
];

export function formatPrice(amount: number, currency: Currency): string {
  return currency === 'PHP' ? amount.toLocaleString('en-PH') : amount.toFixed(2);
}