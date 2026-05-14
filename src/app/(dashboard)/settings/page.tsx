'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clinic, Staff, Dentist } from '@/types';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { ClinicInfoForm } from '@/components/settings/ClinicInfoForm';
import { DentistsPanel } from '@/components/settings/DentistsPanel';
import { StaffPanel } from '@/components/settings/StaffPanel';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { DataBackupNotice } from '@/components/settings/DataBackupNotice';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { VerifyClinicPanel } from '@/components/settings/VerifyClinicPanel';
import { ReplayTutorialButton } from '@/components/tutorial/ReplayTutorialButton';
import { useAppToast } from '@/app/(dashboard)/layout';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useVerification } from '@/lib/hooks/useVerification';
import { Building2, Users, Stethoscope, Lock, ShieldCheck, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------
// Tabs
// ------------------------------------------------------------

type Tab = 'clinic' | 'dentists' | 'staff' | 'password' | 'verify' | 'privacy';

// Base tabs — verify tab label/icon is dynamic based on status
const BASE_TABS = [
  { id: 'clinic',    label: 'Clinic Info', icon: Building2  },
  { id: 'dentists',  label: 'Dentists',    icon: Stethoscope },
  { id: 'staff',     label: 'Staff',       icon: Users       },
  { id: 'password',  label: 'Password',    icon: Lock        },
  { id: 'verify',    label: 'Verify',      icon: ShieldCheck },
  { id: 'privacy',   label: 'Privacy',     icon: FileText    },
] as const;

// ------------------------------------------------------------
// Verify tab badge — small dot indicator for unverified/rejected
// ------------------------------------------------------------

function VerifyTabLabel({
  status,
  active,
}: {
  status: string | undefined;
  active: boolean;
}) {
  const showDot = status === 'unverified' || status === 'rejected';
  return (
    <span className="relative inline-flex items-center gap-1">
      Verify
      {showDot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-2.5',
          active ? 'bg-white' : 'bg-red-500'
        )} />
      )}
    </span>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function SettingsPage() {
  const toast = useAppToast();

  const [activeTab, setActiveTab]     = useState<Tab>('clinic');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [clinic, setClinic]           = useState<Clinic | null>(null);
  const [dentists, setDentists]       = useState<Dentist[]>([]);
  const [staff, setStaff]             = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [clinicId, setClinicId]       = useState<string | null>(null);

  // Verification status — used only for the tab dot indicator
  const { verification } = useVerification(clinicId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (staffError || !staffData) throw new Error('Staff record not found');

      setCurrentStaff(staffData);
      setClinicId(staffData.clinic_id);

      const [clinicRes, dentistsRes, staffRes] = await Promise.all([
        supabase.from('clinics').select('*').eq('id', staffData.clinic_id).single(),
        supabase.from('dentists').select('*').eq('clinic_id', staffData.clinic_id).order('name'),
        supabase.from('staff').select('*').eq('clinic_id', staffData.clinic_id).order('full_name'),
      ]);

      if (clinicRes.error)    throw clinicRes.error;
      if (dentistsRes.error)  throw dentistsRes.error;
      if (staffRes.error)     throw staffRes.error;

      setClinic(clinicRes.data);
      setDentists(dentistsRes.data ?? []);
      setStaff(staffRes.data ?? []);
    } catch (err: any) {
      console.error('Settings load error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 🔴 ERROR STATE
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {BASE_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap relative',
                active
                  ? 'bg-teal-700 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.id === 'verify' ? (
                <VerifyTabLabel
                  status={verification?.verification_status}
                  active={active}
                />
              ) : (
                tab.label
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          {/* ── Clinic Info ── */}
          {activeTab === 'clinic' && clinic && clinicId && (
            <div className="space-y-4">
              <Card>
                <CardHeader><h3 className="font-semibold">Clinic Logo</h3></CardHeader>
                <CardBody>
                  <LogoUpload
                    clinicId={clinicId}
                    currentLogoUrl={(clinic as any).logo_url ?? null}
                    clinicName={clinic.name}
                    onUpdated={url => setClinic(prev => prev ? { ...prev, logo_url: url } as any : prev)}
                    toast={toast}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader><h3 className="font-semibold">Clinic Information</h3></CardHeader>
                <CardBody>
                  <ClinicInfoForm clinic={clinic} onSuccess={setClinic} toast={toast} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader><h3 className="font-semibold">Help</h3></CardHeader>
                <CardBody className="space-y-3">
                  <ReplayTutorialButton />
                </CardBody>
              </Card>
              <DataBackupNotice />
            </div>
          )}

          {/* ── Dentists ── */}
          {activeTab === 'dentists' && clinicId && (
            <Card>
              <CardHeader><h3 className="font-semibold">Dentists</h3></CardHeader>
              <CardBody>
                <DentistsPanel
                  dentists={dentists}
                  clinicId={clinicId}
                  onRefresh={load}
                  toast={toast}
                />
              </CardBody>
            </Card>
          )}

          {/* ── Staff ── */}
          {activeTab === 'staff' && clinicId && currentStaff && (
            <Card>
              <CardHeader><h3 className="font-semibold">Staff</h3></CardHeader>
              <CardBody>
                <StaffPanel
                  staff={staff}
                  currentStaffId={currentStaff.id}
                  clinicId={clinicId}
                  onRefresh={load}
                  toast={toast}
                />
              </CardBody>
            </Card>
          )}

          {/* ── Password ── */}
          {activeTab === 'password' && (
            <Card>
              <CardHeader><h3 className="font-semibold">Change Password</h3></CardHeader>
              <CardBody>
                <ChangePasswordForm toast={toast} />
              </CardBody>
            </Card>
          )}

          {/* ── Verify Clinic ── */}
          {activeTab === 'verify' && clinicId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Clinic Verification</h3>
                  {verification && (
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full',
                      verification.verification_status === 'verified'  && 'bg-teal-100 text-teal-700',
                      verification.verification_status === 'pending'   && 'bg-amber-100 text-amber-700',
                      verification.verification_status === 'rejected'  && 'bg-red-100 text-red-600',
                      verification.verification_status === 'unverified'&& 'bg-gray-100 text-gray-600',
                    )}>
                      {{
                        verified:   'Verified',
                        pending:    'Under Review',
                        rejected:   'Rejected',
                        unverified: 'Unverified',
                      }[verification.verification_status] ?? 'Unverified'}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <VerifyClinicPanel clinicId={clinicId} toast={toast} />
              </CardBody>
            </Card>
          )}

          {/* ── Privacy ── */}
          {activeTab === 'privacy' && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Privacy Notice</h3>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-500">
                  View our full privacy notice on the{' '}
                  <a href="/privacy" className="text-teal-700 underline hover:text-teal-800">
                    Privacy Notice page
                  </a>.
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}