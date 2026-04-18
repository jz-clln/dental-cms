'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Patient, BillingFormData } from '@/types';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getPatientName, TREATMENT_TYPES } from '@/lib/utils';
import { Search } from 'lucide-react';

interface ChargeFormProps {
  clinicId: string;
  prefillPatientId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

interface FormErrors {
  patient_id?: string;
  treatment_description?: string;
  amount_charged?: string;
}

export function ChargeForm({ clinicId, prefillPatientId, onSuccess, onCancel, toast }: ChargeFormProps) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const [patientSearch, setPatientSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<BillingFormData>({
    patient_id: prefillPatientId ?? '',
    appointment_id: '',
    treatment_description: '',
    amount_charged: 0,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('patients').select('*').order('last_name');
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
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredPatients = patients
    .filter(p => getPatientName(p).toLowerCase().includes(patientSearch.toLowerCase()))
    .slice(0, 8);

  function set<K extends keyof BillingFormData>(field: K, value: BillingFormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.patient_id) e.patient_id = 'Please select a patient.';
    if (!form.treatment_description.trim()) e.treatment_description = 'Treatment description is required.';
    if (!form.amount_charged || form.amount_charged <= 0) e.amount_charged = 'Amount must be greater than ₱0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from('billing').insert({
      clinic_id: clinicId,
      patient_id: form.patient_id,
      appointment_id: form.appointment_id || null,
      treatment_description: form.treatment_description.trim(),
      amount_charged: Number(form.amount_charged),
    });

    if (error) {
      toast.error('Failed to add charge.');
    } else {
      toast.success('Charge added successfully.');
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
            onFocus={() => setPatientSearch(s => { setDropOpen(true); return s; })}
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

      {/* Treatment description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Treatment / Description</label>
        <input
          list="treatment-list"
          placeholder="Select or type a description…"
          value={form.treatment_description}
          onChange={e => set('treatment_description', e.target.value)}
          className={`w-full px-3.5 py-2 rounded-lg border text-sm
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors
            ${errors.treatment_description ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
        />
        <datalist id="treatment-list">
          {TREATMENT_TYPES.map(t => <option key={t} value={t} />)}
        </datalist>
        {errors.treatment_description && <p className="text-xs text-red-600">{errors.treatment_description}</p>}
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Amount (₱)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={form.amount_charged || ''}
            onChange={e => set('amount_charged', Number(e.target.value))}
            className={`w-full pl-7 pr-4 py-2 rounded-lg border text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors
              ${errors.amount_charged ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
          />
        </div>
        {errors.amount_charged && <p className="text-xs text-red-600">{errors.amount_charged}</p>}
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none">Add Charge</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
