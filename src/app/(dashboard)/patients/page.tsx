'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Patient } from '@/types';
import { PatientTable } from '@/components/patients/PatientTable';
import { useAppToast } from '@/app/(dashboard)/layout';

export default function PatientsPage() {
  const toast = useAppToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('patients')
      .select('*')
      .order('last_name', { ascending: true });
    setPatients((data ?? []) as Patient[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PatientTable
      patients={patients}
      loading={loading}
      onRefresh={load}
      toast={toast}
    />
  );
}
