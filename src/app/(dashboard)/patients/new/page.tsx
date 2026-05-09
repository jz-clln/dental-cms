'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PatientForm } from '@/components/patients/PatientForm';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppToast } from '@/app/(dashboard)/layout';
import { useTrialStatus } from '@/lib/hooks/useTrialStatus';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

export default function NewPatientPage() {
  const router = useRouter();
  const toast = useAppToast();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const { state, patientLimit, canAddPatient, loading: trialLoading } = useTrialStatus();

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

  // Show upgrade wall when expired and at/above patient limit
  const showUpgradeWall = !trialLoading && state === 'expired' && !canAddPatient;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/patients')}
        className="text-gray-500"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </Button>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">New Patient</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Fill in the patient's personal information.
          </p>
        </CardHeader>
        <CardBody>
          {/* Upgrade wall */}
          {showUpgradeWall ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <Lock className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">Patient limit reached</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your free tier is limited to{' '}
                  <span className="font-medium text-gray-700">{patientLimit} patients</span>.
                  Upgrade to add more.
                </p>
              </div>
              <Link
                href="/settings/billing"
                className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800
                  text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Upgrade now
              </Link>
              <button
                onClick={() => router.push('/patients')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Go back to patients
              </button>
            </div>
          ) : trialLoading || !clinicId ? (
            /* Loading skeleton */
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            /* Normal form */
            <PatientForm
              clinicId={clinicId}
              toast={toast}
              onCancel={() => router.push('/patients')}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}