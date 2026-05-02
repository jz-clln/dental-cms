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

const TABS = [
  { id: 'clinic', label: 'Clinic Info', icon: Building2 },
  { id: 'dentists', label: 'Dentists', icon: Stethoscope },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'password', label: 'Password', icon: Lock },
] as const;

export default function SettingsPage() {
  const toast = useAppToast();

  const [activeTab, setActiveTab] = useState<Tab>('clinic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Get user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // 2. Get staff record
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (staffError || !staffData) {
        throw new Error('Staff record not found');
      }

      setCurrentStaff(staffData);
      setClinicId(staffData.clinic_id);

      // 3. Fetch all related data
      const [clinicRes, dentistsRes, staffRes] = await Promise.all([
        supabase
          .from('clinics')
          .select('*')
          .eq('id', staffData.clinic_id)
          .single(),

        supabase
          .from('dentists')
          .select('*')
          .eq('clinic_id', staffData.clinic_id)
          .order('name'),

        supabase
          .from('staff')
          .select('*')
          .eq('clinic_id', staffData.clinic_id)
          .order('full_name'),
      ]);

      if (clinicRes.error) throw clinicRes.error;
      if (dentistsRes.error) throw dentistsRes.error;
      if (staffRes.error) throw staffRes.error;

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

  useEffect(() => {
    load();
  }, [load]);

  // 🔴 ERROR STATE
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-teal-700 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          {/* Clinic */}
          {activeTab === 'clinic' && clinic && clinicId && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Clinic Logo</h3>
                </CardHeader>
                <CardBody>
                  <LogoUpload
                    clinicId={clinicId}
                    currentLogoUrl={(clinic as any).logo_url ?? null}
                    clinicName={clinic.name}
                    onUpdated={url =>
                      setClinic(prev =>
                        prev ? { ...prev, logo_url: url } as any : prev
                      )
                    }
                    toast={toast}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Clinic Information</h3>
                </CardHeader>
                <CardBody>
                  <ClinicInfoForm
                    clinic={clinic}
                    onSuccess={setClinic}
                    toast={toast}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Help</h3>
                </CardHeader>
                <CardBody className="space-y-3">
                  <ReplayTutorialButton />
                </CardBody>
              </Card>

              <DataBackupNotice />
            </div>
          )}

          {/* Dentists */}
          {activeTab === 'dentists' && clinicId && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Dentists</h3>
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
                <h3 className="font-semibold">Staff</h3>
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
                <h3 className="font-semibold">Change Password</h3>
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