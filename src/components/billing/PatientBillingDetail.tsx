'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PatientBillingSummary, Billing, Payment } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatPeso, formatDateShort, getPatientName, getBillingStatus } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/Modal';
import { Receipt, CreditCard, Trash2, Banknote, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

const METHOD_ICONS: Record<string, React.ReactNode> = {
  Cash:  <Banknote className="w-3.5 h-3.5" />,
  GCash: <Smartphone className="w-3.5 h-3.5" />,
  Maya:  <Smartphone className="w-3.5 h-3.5" />,
  Card:  <CreditCard className="w-3.5 h-3.5" />,
};

interface PatientBillingDetailProps {
  summary: PatientBillingSummary;
  onAddCharge: () => void;
  onRecordPayment: () => void;
  onRefresh: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function PatientBillingDetail({
  summary, onAddCharge, onRecordPayment, onRefresh, toast,
}: PatientBillingDetailProps) {
  const [billingRows, setBillingRows] = useState<Billing[]>([]);
  const [paymentRows, setPaymentRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'billing' | 'payment'; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, [summary.patient.id]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [billRes, payRes] = await Promise.all([
      supabase.from('billing').select('*').eq('patient_id', summary.patient.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('patient_id', summary.patient.id).order('payment_date', { ascending: false }),
    ]);
    setBillingRows((billRes.data ?? []) as Billing[]);
    setPaymentRows((payRes.data ?? []) as Payment[]);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const table = deleteTarget.type === 'billing' ? 'billing' : 'payments';
    const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete record.');
    } else {
      toast.success('Record deleted.');
      load();
      onRefresh();
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const totalCharged = billingRows.reduce((s, b) => s + b.amount_charged, 0);
  const totalPaid = paymentRows.reduce((s, p) => s + p.amount_paid, 0);
  const balance = totalCharged - totalPaid;
  const status = getBillingStatus(totalCharged, totalPaid);

  return (
    <div className="space-y-5">
      {/* Patient summary header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <span className="text-teal-700 font-semibold">
              {summary.patient.first_name[0]}{summary.patient.last_name[0]}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{getPatientName(summary.patient)}</p>
            <p className="text-xs text-gray-400">{summary.patient.contact_number ?? ''}</p>
          </div>
        </div>
        <Badge label={status} />
      </div>

      {/* Balance tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-xs text-gray-400">Billed</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{formatPeso(totalCharged)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs text-gray-400">Paid</p>
          <p className="text-base font-bold text-green-600 mt-0.5">{formatPeso(totalPaid)}</p>
        </div>
        <div className={cn('rounded-xl p-3 border', balance > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100')}>
          <p className="text-xs text-gray-400">Balance</p>
          <p className={cn('text-base font-bold mt-0.5', balance > 0 ? 'text-red-600' : 'text-gray-400')}>
            {formatPeso(balance)}
          </p>
        </div>
      </div>

      {loading ? <SkeletonTable rows={3} /> : (
        <>
          {/* Charges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-gray-400" /> Charges
              </p>
              <Button size="sm" variant="ghost" onClick={onAddCharge} className="text-xs text-teal-700">
                + Add Charge
              </Button>
            </div>
            <div className="space-y-1.5">
              {billingRows.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center">No charges yet.</p>
              ) : billingRows.map(row => (
                <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{row.treatment_description}</p>
                    <p className="text-xs text-gray-400">{formatDateShort(row.created_at.split('T')[0])}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatPeso(row.amount_charged)}</p>
                  <button
                    onClick={() => setDeleteTarget({ type: 'billing', id: row.id, label: row.treatment_description })}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-gray-400" /> Payments
              </p>
              <Button size="sm" variant="ghost" onClick={onRecordPayment} className="text-xs text-teal-700">
                + Record Payment
              </Button>
            </div>
            <div className="space-y-1.5">
              {paymentRows.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center">No payments yet.</p>
              ) : paymentRows.map(row => (
                <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 bg-green-50 rounded-lg group">
                  <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                    {METHOD_ICONS[row.payment_method] ?? <Banknote className="w-3.5 h-3.5" />}
                    <span className="text-xs">{row.payment_method}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{formatDateShort(row.payment_date)}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600 flex-shrink-0">{formatPeso(row.amount_paid)}</p>
                  <button
                    onClick={() => setDeleteTarget({ type: 'payment', id: row.id, label: `${row.payment_method} payment` })}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Record"
        message={`Are you sure you want to delete this ${deleteTarget?.type === 'billing' ? 'charge' : 'payment'}: "${deleteTarget?.label}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
}
