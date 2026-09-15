// src/lib/hooks/useClinicId.ts
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useClinicId() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClinicId = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // FIX: .single() throws whenever zero rows come back — which now
        // happens for ANY deactivated staff account, since RLS hides the
        // row entirely once is_active = false. That error used to get
        // swallowed by the catch block below with no way for the UI to
        // tell "deactivated" apart from a real failure. .maybeSingle()
        // returns null instead of throwing on 0 rows.
        const { data, error: queryError } = await supabase
          .from('staff')
          .select('clinic_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (queryError) throw queryError;

        if (!data) {
          // No visible staff row for this login: either never linked to
          // a clinic, or the account was deactivated.
          setError('No active staff record found for this account.');
          return;
        }

        setClinicId(data.clinic_id);
      } catch (err) {
        console.error('useClinicId error:', err);
        setError('Failed to load clinic information.');
      } finally {
        setLoading(false);
      }
    };

    fetchClinicId();
  }, []);

  return { clinicId, loading, error };
}