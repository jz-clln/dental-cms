// src/lib/hooks/useTrialStatus.ts
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export type TrialState = 'trialing' | 'expired' | 'paid';

export interface TrialStatus {
  state: TrialState;
  daysLeft: number;
  daysTotal: number;
  patientLimit: number;
  canAddPatient: boolean;
  patientCount: number;
  loading: boolean;
}

const TRIAL_DAYS      = 30;
const TRIAL_LIMIT     = 300;
const FREE_TIER_LIMIT = 30;

export function useTrialStatus(): TrialStatus {
  const [status, setStatus] = useState<TrialStatus>({
    state: 'trialing',
    daysLeft: TRIAL_DAYS,
    daysTotal: TRIAL_DAYS,
    patientLimit: TRIAL_LIMIT,
    canAddPatient: true,
    patientCount: 0,
    loading: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setStatus(s => ({ ...s, loading: false })); return; }

        // FIX: .maybeSingle() instead of .single() — a deactivated staff
        // account (or one mid-onboarding) legitimately has zero visible
        // rows under RLS, and .single() throws on that instead of just
        // returning null.
        const { data: staff } = await supabase
          .from('staff')
          .select('clinic_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!staff?.clinic_id) { setStatus(s => ({ ...s, loading: false })); return; }

        // FIX: trial_started_at / trial_ends_at / subscription state live
        // on clinic_status now, not clinics — clinics.trial_ends_at no
        // longer exists, which is why this query used to fail outright.
        const [statusRes, countRes] = await Promise.all([
          supabase
            .from('clinic_status')
            .select('trial_started_at, trial_ends_at, subscription_status')
            .eq('clinic_id', staff.clinic_id)
            .maybeSingle(),
          supabase
            .from('patients')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', staff.clinic_id)
            .eq('archived', false),
        ]);

        const clinicStatus = statusRes.data;
        const patientCount = countRes.count ?? 0;

        // FIX: subscription_status is the authoritative state field on
        // clinic_status (trial/active/expired/cancelled) — use it
        // directly instead of inferring "paid" from a free-text plan
        // string on clinics.
        if (clinicStatus?.subscription_status === 'active') {
          setStatus({ state: 'paid', daysLeft: 0, daysTotal: TRIAL_DAYS,
            patientLimit: Infinity, canAddPatient: true, patientCount, loading: false });
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

        const state: TrialState = isTrialing ? 'trialing' : 'expired';
        const patientLimit = isTrialing ? TRIAL_LIMIT : FREE_TIER_LIMIT;

        setStatus({ state, daysLeft, daysTotal: TRIAL_DAYS, patientLimit,
          canAddPatient: patientCount < patientLimit, patientCount, loading: false });
      } catch (e) {
        console.error('useTrialStatus error:', e);
        setStatus(s => ({ ...s, loading: false }));
      }
    }
    load();
  }, []);

  return status;
}