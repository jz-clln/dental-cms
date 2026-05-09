'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Patient, PaymentFormData, PaymentMethod } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { getPatientName, getTodayString, formatPeso } from '@/lib/utils';
import { Search, Banknote, Smartphone, CreditCard, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'Cash',  label: 'Cash',  icon: <Banknote className="w-3.5 h-3.5" /> },
  { value: 'GCash', label: 'GCash', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'Maya',  label: 'Maya',  icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'Card',  label: 'Card',  icon: <CreditCard className="w-3.5 h-3.5" /> },
];

interface PaymentFormProps {
  clinicId: string;
  prefillPatientId?: string;
  prefillBalance?: number;
  onSuccess: () => void;
  onCancel: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

interface FormErrors {
  patient_id?: string;
  amount_paid?: string;
}

export function PaymentForm({
  clinicId, prefillPatientId, prefillBalance, onSuccess, onCancel, toast,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const [patientSearch, setPatientSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<PaymentFormData>({
    patient_id: prefillPatientId ?? '',
    amount_paid: prefillBalance ?? 0,
    payment_method: 'Cash',
    payment_date: getTodayString(),
    notes: '',
  });

  const isDirty = !submitted && (!!form.patient_id || form.amount_paid > 0 || !!form.notes);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('patients').select('*').order('last_name');
      const pats = (data ?? []) as Patient[];
      setPatients(pats);
      if (prefillPatientId) {
        const found = pats.find(p => p.id === prefillPatientId);
        if (found) setPatientSearch(getPatientName(found));
      }
    }
    load();
  }, [prefillPatientId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredPatients = patients
    .filter(p => getPatientName(p).toLowerCase().includes(patientSearch.toLowerCase()))
    .slice(0, 8);

  const selectedPatient = patients.find(p => p.id === form.patient_id);

  function set<K extends keyof PaymentFormData>(field: K, value: PaymentFormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.patient_id) e.patient_id = 'Please select a patient.';
    if (!form.amount_paid || form.amount_paid <= 0) e.amount_paid = 'Amount must be greater than ₱0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('payments').insert({
      clinic_id: clinicId,
      patient_id: form.patient_id,
      amount_paid: Number(form.amount_paid),
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      notes: form.notes.trim() || null,
    });
    if (error) {
      toast.error('Failed to record payment.');
    } else {
      setSubmitted(true);
      toast.success(`Payment of ${formatPeso(form.amount_paid)} recorded.`);
      onSuccess();
    }
    setLoading(false);
  }

  function handleCancel() {
    if (isDirty) setShowConfirm(true);
    else onCancel();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Patient search ── */}
        <div className="flex flex-col gap-1.5" ref={dropRef}>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Patient
          </label>

          {selectedPatient && !dropOpen ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-teal-200 bg-teal-50/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-teal-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-teal-700">
                    {selectedPatient.first_name?.[0] ?? ''}{selectedPatient.last_name?.[0] ?? ''}
                  </span>
                </div>
                <span className="text-[13px] font-semibold text-teal-800 truncate">
                  {getPatientName(selectedPatient)}
                </span>
                {selectedPatient.contact_number && (
                  <span className="text-[11px] text-teal-600/70 hidden sm:inline">
                    {selectedPatient.contact_number}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => { set('patient_id', ''); setPatientSearch(''); setDropOpen(true); }}
                className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold flex-shrink-0 ml-2 transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search patient…"
                value={patientSearch}
                onChange={e => {
                  setPatientSearch(e.target.value);
                  setDropOpen(true);
                  if (!e.target.value) set('patient_id', '');
                }}
                onFocus={() => {
                  setDropRect(dropRef.current?.getBoundingClientRect() ?? null);
                  setDropOpen(true);
                }}
                autoFocus={!prefillPatientId}
                className={cn(
                  'w-full pl-8 pr-3 py-2 rounded-xl border text-[13px] text-gray-800 placeholder:text-gray-300',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors bg-white',
                  errors.patient_id ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'
                )}
              />
            </div>
          )}

          {dropOpen && patientSearch && !selectedPatient && dropRect && (
            <div
              className="fixed z-[9999] bg-white rounded-xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden"
              style={{
                width: dropRect.width,
                top: dropRect.bottom + 4,
                left: dropRect.left,
              }}
            >
              <div className="py-1 max-h-48 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <p className="text-[12px] text-gray-400 px-4 py-3">No patients found.</p>
                ) : filteredPatients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { set('patient_id', p.id); setPatientSearch(getPatientName(p)); setDropOpen(false); }}
                    className="w-full flex items-center gap-2.5 text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-teal-700">
                        {p.first_name?.[0] ?? ''}{p.last_name?.[0] ?? ''}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate">{getPatientName(p)}</p>
                      {p.contact_number && <p className="text-[10px] text-gray-400">{p.contact_number}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {errors.patient_id && (
            <p className="text-[11px] text-red-500">{errors.patient_id}</p>
          )}
        </div>

        {/* ── Amount ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Amount Paid
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] font-semibold select-none">
              ₱
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={form.amount_paid || ''}
              onChange={e => set('amount_paid', Number(e.target.value))}
              className={cn(
                'w-full pl-7 pr-4 py-2 rounded-xl border text-[13px] text-gray-800 placeholder:text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors bg-white',
                errors.amount_paid ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'
              )}
            />
          </div>
          {errors.amount_paid && (
            <p className="text-[11px] text-red-500">{errors.amount_paid}</p>
          )}
          {prefillBalance && prefillBalance > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-amber-50/70 border border-amber-200/60 rounded-xl">
              <p className="text-[11px] text-amber-700 font-medium">
                Outstanding: <span className="font-bold">{formatPeso(prefillBalance)}</span>
              </p>
              <button
                type="button"
                onClick={() => set('amount_paid', prefillBalance)}
                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold transition-colors"
              >
                Pay in full →
              </button>
            </div>
          )}
        </div>

        {/* ── Payment method ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map(method => {
              const isActive = form.payment_method === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => set('payment_method', method.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[11px] font-semibold transition-all',
                    isActive
                      ? 'bg-teal-700 text-white border-teal-700 shadow-sm shadow-teal-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
                  )}
                >
                  {isActive && (
                    <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  {method.icon}
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Payment date ── */}
        <Input
          label="Payment Date"
          type="date"
          value={form.payment_date}
          onChange={e => set('payment_date', e.target.value)}
        />

        {/* ── Actions ── */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
            Record Payment
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>

      <UnsavedChangesModal
        open={showConfirm}
        onStay={() => setShowConfirm(false)}
        onLeave={() => { setShowConfirm(false); onCancel(); }}
      />
    </>
  );
}