'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Patient, PaymentFormData, PaymentMethod } from '@/types';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getPatientName, getTodayString, formatPeso } from '@/lib/utils';
import { Search, Banknote, Smartphone, CreditCard } from 'lucide-react';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'Cash',  label: 'Cash',  icon: <Banknote className="w-4 h-4" /> },
  { value: 'GCash', label: 'GCash', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'Maya',  label: 'Maya',  icon: <Smartphone className="w-4 h-4" /> },
  { value: 'Card',  label: 'Card',  icon: <CreditCard className="w-4 h-4" /> },
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const [patientSearch, setPatientSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<PaymentFormData>({
    patient_id: prefillPatientId ?? '',
    amount_paid: prefillBalance ?? 0,
    payment_method: 'Cash',
    payment_date: getTodayString(),
    notes: '',
  });

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
      toast.success(`Payment of ${formatPeso(form.amount_paid)} recorded.`);
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient search */}
      <div className="flex flex-col gap-1" ref={dropRef}>
        <label className="text-sm font-medium text-gray-700">Patient</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient…"
            value={patientSearch}
            onChange={e => {
              setPatientSearch(e.target.value);
              setDropOpen(true);
              if (!e.target.value) set('patient_id', '');
            }}
            onFocus={() => setDropOpen(true)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors
              ${errors.patient_id ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
          />
          {dropOpen && patientSearch && (
            <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
              {filteredPatients.length === 0
                ? <p className="text-sm text-gray-400 px-4 py-3">No patients found.</p>
                : filteredPatients.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => {
                      set('patient_id', p.id);
                      setPatientSearch(getPatientName(p));
                      setDropOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-teal-50 text-sm transition-colors"
                  >
                    <span className="font-medium text-gray-900">{getPatientName(p)}</span>
                    {p.contact_number && <span className="text-gray-400 ml-2 text-xs">{p.contact_number}</span>}
                  </button>
                ))
              }
            </div>
          )}
        </div>
        {errors.patient_id && <p className="text-xs text-red-600">{errors.patient_id}</p>}
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Amount Paid (₱)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={form.amount_paid || ''}
            onChange={e => set('amount_paid', Number(e.target.value))}
            className={`w-full pl-7 pr-4 py-2 rounded-lg border text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors
              ${errors.amount_paid ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
          />
        </div>
        {errors.amount_paid && <p className="text-xs text-red-600">{errors.amount_paid}</p>}
        {prefillBalance && prefillBalance > 0 && (
          <p className="text-xs text-gray-500">
            Outstanding balance: {formatPeso(prefillBalance)}
            <button
              type="button"
              onClick={() => set('amount_paid', prefillBalance)}
              className="ml-2 text-teal-600 hover:underline font-medium"
            >
              Pay full balance
            </button>
          </p>
        )}
      </div>

      {/* Payment method */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Payment Method</label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(method => (
            <button
              key={method.value}
              type="button"
              onClick={() => set('payment_method', method.value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all
                ${form.payment_method === method.value
                  ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              {method.icon}
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <Input
        label="Payment Date"
        type="date"
        value={form.payment_date}
        onChange={e => set('payment_date', e.target.value)}
      />

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none">Record Payment</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
