//src\app\(dashboard)\billing\page.tsx

'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Patient, Billing, Payment, PatientBillingSummary } from '@/types';
import { BillingTable } from '@/components/billing/BillingTable';
import { ChargeForm } from '@/components/billing/ChargeForm';
import { PaymentForm } from '@/components/billing/PaymentForm';
import { PatientBillingDetail } from '@/components/billing/PatientBillingDetail';
import { Modal } from '@/components/ui/Modal';
import { useAppToast } from '@/app/(dashboard)/layout';
import { formatPeso, getBillingStatus, getTodayString } from '@/lib/utils';
import { TrendingUp, Receipt, AlertCircle, CheckCircle } from 'lucide-react';

// Reads ?action=new and opens the Add Charge modal. Isolated in its own
// component because useSearchParams() requires a Suspense boundary at
// the point it's called, or Next.js bails out of static prerendering
// for the whole page during build.
function OpenChargeModalOnQuery({ onTrigger }: { onTrigger: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      onTrigger();
      router.replace('/billing');
    }
  }, [searchParams, router, onTrigger]);

  return null;
}

// One stat card. Pulled out so the responsive sizing rules live in a
// single place instead of being repeated four times.
function StatCard({
  label,
  value,
  sublabel,
  icon,
  iconBg,
  valueColor = 'text-gray-900',
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm p-3 sm:p-5 min-w-0">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-sm text-gray-500 truncate">{label}</p>
          <p
            className={`text-base sm:text-2xl font-bold ${valueColor} mt-0.5 sm:mt-1 truncate tabular-nums`}
            title={value}
          >
            {value}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">
            {sublabel}
          </p>
        </div>
        <div
          className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function BillingPageContent() {
  const toast = useAppToast();

  const [summaries, setSummaries] = useState<PatientBillingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayCharges, setTodayCharges] = useState(0);

  // Modal state
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [prefillPatientId, setPrefillPatientId] = useState<string | undefined>();
  const [prefillBalance, setPrefillBalance] = useState<number | undefined>();
  const [selectedSummary, setSelectedSummary] = useState<PatientBillingSummary | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const today = getTodayString();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from('staff').select('clinic_id').eq('auth_user_id', user.id).single();
      setClinicId(staffData?.clinic_id ?? null);
    }

    const [patientsRes, billRes, payRes, todayPayRes, todayBillRes] = await Promise.all([
      supabase.from('patients').select('*').order('last_name'),
      supabase.from('billing').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('payments').select('amount_paid').eq('payment_date', today),
      supabase.from('billing').select('amount_charged')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`),
    ]);

    const patients = (patientsRes.data ?? []) as Patient[];
    const billing = (billRes.data ?? []) as Billing[];
    const payments = (payRes.data ?? []) as Payment[];

    // Today's revenue
    setTodayRevenue((todayPayRes.data ?? []).reduce((s, p) => s + p.amount_paid, 0));
    setTodayCharges((todayBillRes.data ?? []).reduce((s, b) => s + b.amount_charged, 0));

    // Build per-patient summaries (only patients with any billing activity)
    const billed = new Set(billing.map(b => b.patient_id));
    const paid = new Set(payments.map(p => p.patient_id));
    const patientIds = new Set(Array.from(billed).concat(Array.from(paid)));

    const built: PatientBillingSummary[] = [];
    for (const pid of patientIds) {
      const patient = patients.find(p => p.id === pid);
      if (!patient) continue;
      const totalCharged = billing.filter(b => b.patient_id === pid).reduce((s, b) => s + b.amount_charged, 0);
      const totalPaid = payments.filter(p => p.patient_id === pid).reduce((s, p) => s + p.amount_paid, 0);
      const balance = totalCharged - totalPaid;
      built.push({
        patient,
        total_charged: totalCharged,
        total_paid: totalPaid,
        balance,
        status: getBillingStatus(totalCharged, totalPaid),
      });
    }

    // Sort: Unpaid → Partial → Paid
    const order = { Unpaid: 0, Partial: 1, Paid: 2 };
    built.sort((a, b) => order[a.status] - order[b.status]);
    setSummaries(built);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCharge(patientId?: string) {
    setPrefillPatientId(patientId);
    setShowChargeModal(true);
    setShowDetailModal(false);
  }

  function openPayment(patientId?: string, balance?: number) {
    setPrefillPatientId(patientId);
    setPrefillBalance(balance);
    setShowPaymentModal(true);
    setShowDetailModal(false);
  }

  function handleSuccess() {
    setShowChargeModal(false);
    setShowPaymentModal(false);
    load();
    // If detail modal is about a patient, keep it open and refresh
    if (selectedSummary) {
      setShowDetailModal(true);
    }
  }

  const unpaidCount = summaries.filter(s => s.status === 'Unpaid').length;
  const partialCount = summaries.filter(s => s.status === 'Partial').length;

  return (
    <div className="space-y-4 sm:space-y-5">

      <Suspense fallback={null}>
        <OpenChargeModalOnQuery onTrigger={() => setShowChargeModal(true)} />
      </Suspense>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          label="Today's Revenue"
          value={formatPeso(todayRevenue)}
          sublabel="payments received today"
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          label="Billed Today"
          value={formatPeso(todayCharges)}
          sublabel="charges added today"
          icon={<Receipt className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Unpaid Patients"
          value={String(unpaidCount)}
          sublabel="no payment made yet"
          icon={<AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-500" />}
          iconBg="bg-red-50"
          valueColor="text-red-600"
        />
        <StatCard
          label="Partial Payments"
          value={String(partialCount)}
          sublabel="still have a balance"
          icon={<CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-500" />}
          iconBg="bg-amber-50"
          valueColor="text-amber-600"
        />
      </div>

      {/* Main billing table */}
      <BillingTable
        summaries={summaries}
        loading={loading}
        onAddCharge={openCharge}
        onRecordPayment={openPayment}
        onSelectPatient={s => {
          setSelectedSummary(s);
          setShowDetailModal(true);
        }}
      />

      {/* Add Charge Modal */}
      <Modal open={showChargeModal} onClose={() => setShowChargeModal(false)} title="Add Charge" size="md">
        {clinicId && (
          <ChargeForm
            clinicId={clinicId}
            prefillPatientId={prefillPatientId}
            onSuccess={handleSuccess}
            onCancel={() => setShowChargeModal(false)}
            toast={toast}
          />
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" size="md">
        {clinicId && (
          <PaymentForm
            clinicId={clinicId}
            prefillPatientId={prefillPatientId}
            prefillBalance={prefillBalance}
            onSuccess={handleSuccess}
            onCancel={() => setShowPaymentModal(false)}
            toast={toast}
          />
        )}
      </Modal>

      {/* Patient billing detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedSummary(null); }}
        title="Patient Billing"
        size="md"
      >
        {selectedSummary && clinicId && (
          <PatientBillingDetail
            summary={selectedSummary}
            onAddCharge={() => openCharge(selectedSummary.patient.id)}
            onRecordPayment={() => openPayment(selectedSummary.patient.id, selectedSummary.balance)}
            onRefresh={load}
            toast={toast}
          />
        )}
      </Modal>
    </div>
  );
}

export default function BillingPage() {
  return <BillingPageContent />;
}