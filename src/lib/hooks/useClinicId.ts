'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useClinicId() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClinicId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('staff')
        .select('clinic_id')
        .eq('auth_user_id', user.id)
        .single();

      setClinicId(data?.clinic_id ?? null);
      setLoading(false);
    };
    fetchClinicId();
  }, []);

  return { clinicId, loading };
}
