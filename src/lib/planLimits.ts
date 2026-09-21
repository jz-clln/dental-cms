// src/lib/planLimits.ts
//
// Pure plan-limit logic shared between client hooks (useTrialStatus) and
// server actions (staffActions). No React, no browser-only APIs — safe to
// import from either side.

import { PRICING_PLANS } from '@/lib/pricingPlans';

export type PlanTier = 'free' | 'trial' | 'basic' | 'pro';

export interface UsageLimits {
  patients: number;
  dentists: number;
  staff: number;
}

export const TRIAL_DAYS = 30;

// Free tier: hits a wall fast on patient volume, one dentist, one staff seat.
export const FREE_LIMITS: UsageLimits = { patients: 40, dentists: 1, staff: 1 };

// Trial gets generous (Pro-level) limits so people evaluate the full product,
// not a crippled version of it.
export const TRIAL_LIMITS: UsageLimits = { patients: 1000, dentists: 5, staff: 10 };

/**
 * Limits for an ACTIVE (paid) subscription, keyed by clinics.plan.
 *
 * An unrecognized or missing plan value defaults to Basic limits — an
 * active subscription must never silently fall back to unlimited just
 * because `plan` wasn't set. (This was the bug: the old code granted
 * Infinity to any 'active' status regardless of which plan was purchased.)
 */
export function limitsForPlan(planId: string | null): UsageLimits {
  const plan = PRICING_PLANS.find(p => p.id === planId);
  return plan?.limits ?? PRICING_PLANS.find(p => p.id === 'basic')!.limits;
}