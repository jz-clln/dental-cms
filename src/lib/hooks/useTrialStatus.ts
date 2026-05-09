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

        const { data: staff } = await supabase
          .from('staff')
          .select('clinic_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!staff?.clinic_id) { setStatus(s => ({ ...s, loading: false })); return; }

        const [clinicRes, countRes] = await Promise.all([
          supabase
            .from('clinics')
            .select('trial_started_at, trial_ends_at, plan')
            .eq('id', staff.clinic_id)
            .single(),
          supabase
            .from('patients')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', staff.clinic_id)
            .eq('archived', false),
        ]);

        const clinic = clinicRes.data;
        const patientCount = countRes.count ?? 0;
        const plan = (clinic as any)?.plan ?? 'free';

        if (plan && plan !== 'free') {
          setStatus({ state: 'paid', daysLeft: 0, daysTotal: TRIAL_DAYS,
            patientLimit: Infinity, canAddPatient: true, patientCount, loading: false });
          return;
        }

        const now = new Date();
        const trialEndsAt = clinic?.trial_ends_at ? new Date(clinic.trial_ends_at) : null;
        const isTrialing = trialEndsAt ? now < trialEndsAt : true;

        let daysLeft = 0;
        if (trialEndsAt && isTrialing) {
          daysLeft = Math.max(0, Math.ceil(
            (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          ));
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