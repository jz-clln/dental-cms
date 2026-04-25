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
import { ReplayTutorialButton } from '@/components/tutorial/ReplayTutorialButton';
import { useAppToast } from '@/app/(dashboard)/layout';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Building2, Users, Stethoscope, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'clinic' | 'dentists' | 'staff' | 'password';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'clinic',   label: 'Clinic Info', icon: Building2 },
  { id: 'dentists', label: 'Dentists',    icon: Stethoscope },
  { id: 'staff',    label: 'Staff',       icon: Users },
  { id: 'password', label: 'Password',    icon: Lock },
];

export default function SettingsPage() {
  const toast = useAppToast();
  const [activeTab, setActiveTab] = useState<Tab>('clinic');
  const [loading, setLoading] = useState(true);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staffData } = await supabase
      .from('staff').select('*').eq('auth_user_id', user.id).single();
    if (!staffData) return;

    setCurrentStaff(staffData as Staff);
    setClinicId(staffData.clinic_id);

    const [clinicRes, dentistsRes, staffRes] = await Promise.all([
      supabase.from('clinics').select('*').eq('id', staffData.clinic_id).single(),
      supabase.from('dentists').select('*').eq('clinic_id', staffData.clinic_id).order('name'),
      supabase.from('staff').select('*').eq('clinic_id', staffData.clinic_id).order('full_name'),
    ]);

    setClinic(clinicRes.data as Clinic);
    setDentists((dentistsRes.data ?? []) as Dentist[]);
    setStaff((staffRes.data ?? []) as Staff[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Tab navigation */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          {/* Clinic Info */}
          {activeTab === 'clinic' && clinic && clinicId && (
            <div className="space-y-4">

              {/* Logo upload */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Clinic Logo</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Your logo appears in the sidebar, login page, and printed schedules.
                  </p>
                </CardHeader>
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

              {/* Clinic info form */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Clinic Information</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    This information appears on receipts and documents.
                  </p>
                </CardHeader>
                <CardBody>
                  <ClinicInfoForm
                    clinic={clinic}
                    onSuccess={updated => setClinic(updated)}
                    toast={toast}
                  />
                </CardBody>
              </Card>

              {/* Help & Tutorial */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Help</h3>
                </CardHeader>
                <CardBody className="space-y-3">
                  <ReplayTutorialButton />
                  <p className="text-xs text-gray-400">
                    Replays the onboarding tour that shows how to use each section of the app.
                  </p>
                </CardBody>
              </Card>

              {/* Data backup notice */}
              <DataBackupNotice />
            </div>
          )}

          {/* Dentists */}
          {activeTab === 'dentists' && clinicId && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Dentists</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Manage your dental professionals and their schedules.
                </p>
              </CardHeader>
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

          {/* Staff */}
          {activeTab === 'staff' && clinicId && currentStaff && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Staff Accounts</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Manage who has access to this clinic's system.
                </p>
              </CardHeader>
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

          {/* Password */}
          {activeTab === 'password' && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Change Password</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Update your login password. You will not be logged out.
                </p>
              </CardHeader>
              <CardBody>
                <ChangePasswordForm toast={toast} />
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
