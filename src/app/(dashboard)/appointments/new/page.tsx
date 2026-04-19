'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppToast } from '@/app/(dashboard)/layout';
import { ArrowLeft } from 'lucide-react';

/* -------------------- CONTENT COMPONENT -------------------- */
function NewAppointmentContent() {
  const router = useRouter();
  const toast = useAppToast();
  const searchParams = useSearchParams();

  const prefillPatientId = searchParams.get('patient_id') ?? undefined;

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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-gray-500"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">New Appointment</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule a new patient appointment.
          </p>
        </CardHeader>

        <CardBody>
          {clinicId ? (
            <AppointmentForm
              clinicId={clinicId}
              prefillPatientId={prefillPatientId}
              toast={toast}
              onCancel={() => router.back()}
            />
          ) : (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* -------------------- DEFAULT EXPORT (WRAPPER) -------------------- */
export default function NewAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      }
    >
      <NewAppointmentContent />
    </Suspense>
  );
}