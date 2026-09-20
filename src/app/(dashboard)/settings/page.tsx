// src/app/(dashboard)/settings/page.tsx
//
// REVISION: added a mobile-only Log Out entry. The mobile hamburger/drawer
// in Sidebar.tsx (which used to hold Log Out) was removed in favor of a
// full bottom nav, so this page is now where phone users sign out. Desktop
// is untouched — it still has Log Out in the sidebar, so this button is
// hidden at md: and up.
//
// REVISION 2: the "Privacy" tab card now also links to /cookie-policy,
// alongside the existing /privacy link. Added here rather than as a new
// tab — a 7th tab would risk breaking the one-line tab bar this page was
// specifically tuned for (see the max-w-* comment below). Terms isn't
// linked from this card either; only the Cookie Policy link was added,
// per what was actually asked for.
//
// REVISION 3: added a "Plans & Billing" card to the Clinic Info tab,
// linking to /settings/billing. That route already existed (linked from
// TrialBanner and TrialCountdown) but nothing on this page pointed to
// it. Same reasoning as REVISION 2 — a plain link in a card, not a 7th
// tab, matching the existing Privacy card's link style exactly.
//
// REVISION 4: compact desktop sizing. Base classes are the phone sizing and
// are unchanged; md: classes shrink the tab bar, card titles, body text and
// spacing to the app's desktop scale (13px body, 12px secondary, 11px small
// labels), matching the patients table and the Plans & Billing page. The
// desktop container is also capped at max-w-4xl so it lines up with the
// Plans & Billing page (it used to widen to max-w-5xl on xl screens).

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Building2, Users, Stethoscope, Lock, ShieldCheck, FileText, LogOut, Cookie } from 'lucide-react';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------
// Shared sizing (base = phone, md: = compact desktop)
// ------------------------------------------------------------

const CARD_TITLE = 'font-semibold md:text-[15px]';
const CARD_TEXT = 'text-sm text-gray-500 md:text-[13px]';

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
  const router = useRouter();

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

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
    // Mobile/tablet: max-w-2xl (viewport is already narrower than this, so no visual change).
    // Desktop (lg+): max-w-4xl, the same width as the Plans & Billing page, so the compact
    // 6-tab bar fits on one line without the internal horizontal scrollbar.
    <div className="max-w-2xl lg:max-w-4xl mx-auto space-y-5 md:space-y-4">

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 md:p-1 flex gap-1 overflow-x-auto">
        {BASE_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap relative',
                'md:gap-1.5 md:px-3 md:py-2 md:text-[13px]',
                active
                  ? 'bg-teal-700 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              <tab.icon className="w-4 h-4 md:w-3.5 md:h-3.5" />
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

      {/* Log Out — mobile only. The mobile drawer that used to hold this
          was removed in favor of a full bottom nav, so this is now the
          phone entry point for signing out. Desktop keeps its sidebar button. */}
      <button
        onClick={handleLogout}
        className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
          bg-white border border-gray-100 shadow-sm text-sm font-medium text-red-600
          active:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Log Out
      </button>

      {/* Loading */}
      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          {/* ── Clinic Info ── */}
          {activeTab === 'clinic' && clinic && clinicId && (
            <div className="space-y-4 md:space-y-3">
              <Card>
                <CardHeader><h3 className={CARD_TITLE}>Clinic Logo</h3></CardHeader>
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
                <CardHeader><h3 className={CARD_TITLE}>Clinic Information</h3></CardHeader>
                <CardBody>
                  <ClinicInfoForm clinic={clinic} onSuccess={setClinic} toast={toast} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader><h3 className={CARD_TITLE}>Plans & Billing</h3></CardHeader>
                <CardBody>
                  <p className={CARD_TEXT}>
                    View your current plan, trial status, and upgrade options on the{' '}
                    <Link href="/settings/billing" className="text-teal-700 underline hover:text-teal-800">
                      Plans & Billing page
                    </Link>.
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardHeader><h3 className={CARD_TITLE}>Help</h3></CardHeader>
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
              <CardHeader><h3 className={CARD_TITLE}>Dentists</h3></CardHeader>
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
              <CardHeader><h3 className={CARD_TITLE}>Staff</h3></CardHeader>
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
              <CardHeader><h3 className={CARD_TITLE}>Change Password</h3></CardHeader>
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
                  <h3 className={CARD_TITLE}>Clinic Verification</h3>
                  {verification && (
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full',
                      'md:text-[11px] md:px-2 md:py-0.5',
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
                <h3 className={CARD_TITLE}>Privacy Notice</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className={cn('flex items-center gap-1.5', CARD_TEXT)}>
                  <ShieldCheck className="w-4 h-4 md:w-3.5 md:h-3.5 text-teal-700 flex-shrink-0" />
                  <span>
                    View our full privacy notice on{' '}
                    <a
                      href="/privacy"
                      className="text-teal-700 underline hover:text-teal-800"
                    >
                      Privacy Notice page
                    </a>.
                  </span>
                </p>

                <p className={cn('flex items-center gap-1.5', CARD_TEXT)}>
                  <Cookie className="w-4 h-4 md:w-3.5 md:h-3.5 text-teal-700 flex-shrink-0" />
                  <span>
                    See what cookies we use on the{' '}
                    <a
                      href="/cookie-policy"
                      className="text-teal-700 underline hover:text-teal-800"
                    >
                      Cookie Policy page
                    </a>.
                  </span>
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}