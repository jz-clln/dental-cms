// src/lib/hooks/useTrialStatus.ts
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  type PlanTier,
  type UsageLimits,
  TRIAL_DAYS,
  FREE_LIMITS,
  TRIAL_LIMITS,
  limitsForPlan,
} from '@/lib/planLimits';

export type TrialState = 'trialing' | 'expired' | 'paid';

export interface TrialStatus {
  state: TrialState;
  tier: PlanTier;
  daysLeft: number;
  daysTotal: number;
  limits: UsageLimits;
  usage: UsageLimits;
  canAddPatient: boolean;
  canAddDentist: boolean;
  canAddStaff: boolean;
  // Kept for existing callers (e.g. patients/new/page.tsx) — do not remove.
  patientLimit: number;
  patientCount: number;
  loading: boolean;
}

const INITIAL: TrialStatus = {
  state: 'trialing',
  tier: 'trial',
  daysLeft: TRIAL_DAYS,
  daysTotal: TRIAL_DAYS,
  limits: TRIAL_LIMITS,
  usage: { patients: 0, dentists: 0, staff: 0 },
  canAddPatient: true,
  canAddDentist: true,
  canAddStaff: true,
  patientLimit: TRIAL_LIMITS.patients,
  patientCount: 0,
  loading: true,
};

export function useTrialStatus(): TrialStatus {
  const [status, setStatus] = useState<TrialStatus>(INITIAL);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setStatus(s => ({ ...s, loading: false })); return; }

        const { data: staff } = await supabase
          .from('staff')
          .select('clinic_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!staff?.clinic_id) { setStatus(s => ({ ...s, loading: false })); return; }

        const [statusRes, clinicRes, patientsRes, dentistsRes, staffRes] = await Promise.all([
          supabase
            .from('clinic_status')
            .select('trial_started_at, trial_ends_at, subscription_status')
            .eq('clinic_id', staff.clinic_id)
            .maybeSingle(),
          supabase
            .from('clinics')
            .select('plan')
            .eq('id', staff.clinic_id)
            .maybeSingle(),
          supabase
            .from('patients')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', staff.clinic_id)
            .eq('archived', false),
          supabase
            .from('dentists')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', staff.clinic_id),
          supabase
            .from('staff')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', staff.clinic_id),
        ]);

        const clinicStatus = statusRes.data;
        const usage: UsageLimits = {
          patients: patientsRes.count ?? 0,
          dentists: dentistsRes.count ?? 0,
          staff: staffRes.count ?? 0,
        };

        const commit = (state: TrialState, tier: PlanTier, limits: UsageLimits, daysLeft: number) =>
          setStatus({
            state,
            tier,
            daysLeft,
            daysTotal: TRIAL_DAYS,
            limits,
            usage,
            canAddPatient: usage.patients < limits.patients,
            canAddDentist: usage.dentists < limits.dentists,
            canAddStaff: usage.staff < limits.staff,
            patientLimit: limits.patients,
            patientCount: usage.patients,
            loading: false,
          });

        if (clinicStatus?.subscription_status === 'active') {
          const planId = clinicRes.data?.plan ?? null;
          const tier: PlanTier = planId === 'pro' ? 'pro' : 'basic';
          commit('paid', tier, limitsForPlan(planId), 0);
          return;
        }

        const now = new Date();
        const trialEndsAt = clinicStatus?.trial_ends_at ? new Date(clinicStatus.trial_ends_at) : null;
        const isTrialing =
          clinicStatus?.subscription_status === 'trial' &&
          (trialEndsAt ? now < trialEndsAt : true);

        let daysLeft = 0;
        if (trialEndsAt && isTrialing) {
          const diffMs = trialEndsAt.getTime() - now.getTime();
          daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }

        if (isTrialing) {
          commit('trialing', 'trial', TRIAL_LIMITS, daysLeft);
        } else {
          commit('expired', 'free', FREE_LIMITS, 0);
        }
      } catch (e) {
        console.error('useTrialStatus error:', e);
        setStatus(s => ({ ...s, loading: false }));
      }
    }
    load();
  }, []);

  return status;
}