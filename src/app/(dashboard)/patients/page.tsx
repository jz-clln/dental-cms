'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Patient } from '@/types';
import { PatientTable } from '@/components/patients/PatientTable';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('patients')
        .select('*')
        .order('last_name', { ascending: true });
      setPatients((data ?? []) as Patient[]);
      setLoading(false);
    }
    load();
  }, []);

  return <PatientTable patients={patients} loading={loading} />;
}
