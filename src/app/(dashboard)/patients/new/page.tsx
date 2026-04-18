'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PatientForm } from '@/components/patients/PatientForm';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppToast } from '@/app/(dashboard)/layout';
import { ArrowLeft } from 'lucide-react';

export default function NewPatientPage() {
  const router = useRouter();
  const toast = useAppToast();
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    async function getClinicId() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('staff')
        .select('clinic_id')
        .eq('auth_user_id', user.id)
        .single();
      setClinicId(data?.clinic_id ?? null);
    }
    getClinicId();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-gray-500"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </Button>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">New Patient</h2>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the patient's personal information.</p>
        </CardHeader>
        <CardBody>
          {clinicId ? (
            <PatientForm
              clinicId={clinicId}
              toast={toast}
              onCancel={() => router.back()}
            />
          ) : (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
