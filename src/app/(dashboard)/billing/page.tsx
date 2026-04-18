'use client';

import { useEffect, useState, useCallback } from 'react';
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

export default function BillingPage() {
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
    const patientIds = new Set([...billed, ...paid]);

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
    <div className="space-y-5">

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPeso(todayRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">payments received today</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Billed Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPeso(todayCharges)}</p>
              <p className="text-xs text-gray-400 mt-1">charges added today</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Unpaid Patients</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{unpaidCount}</p>
              <p className="text-xs text-gray-400 mt-1">no payment made yet</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Partial Payments</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{partialCount}</p>
              <p className="text-xs text-gray-400 mt-1">still have a balance</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
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
