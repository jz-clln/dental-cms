'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Patient, BillingFormData } from '@/types';
import { Button } from '@/components/ui/Button';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { getPatientName, TREATMENT_TYPES } from '@/lib/utils';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const [patientSearch, setPatientSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [treatmentRect, setTreatmentRect] = useState<DOMRect | null>(null);
  const treatmentRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<BillingFormData>({
    patient_id: prefillPatientId ?? '',
    appointment_id: '',
    treatment_description: '',
    amount_charged: 0,
  });

  const isDirty = !submitted && (
    !!form.patient_id || !!form.treatment_description || form.amount_charged > 0
  );

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
      if (treatmentRef.current && !treatmentRef.current.contains(e.target as Node)) setTreatmentOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredPatients = patients
    .filter(p => getPatientName(p).toLowerCase().includes(patientSearch.toLowerCase()))
    .slice(0, 8);

  const filteredTreatments = TREATMENT_TYPES.filter(t =>
    t.toLowerCase().includes(form.treatment_description.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.id === form.patient_id);

  function set<K extends keyof BillingFormData>(field: K, value: BillingFormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) setErrors(prev => ({ ...prev, [field]: undefined }));
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
      setSubmitted(true);
      toast.success('Charge added successfully.');
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

        {/* ── Treatment / Description ── */}
        <div className="flex flex-col gap-1.5" ref={treatmentRef}>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Treatment / Description
          </label>
          <input
            type="text"
            placeholder="Select or type a description…"
            value={form.treatment_description}
            onChange={e => {
              set('treatment_description', e.target.value);
              setTreatmentRect(treatmentRef.current?.getBoundingClientRect() ?? null);
              setTreatmentOpen(true);
            }}
            onFocus={() => {
              setTreatmentRect(treatmentRef.current?.getBoundingClientRect() ?? null);
              setTreatmentOpen(true);
            }}
            className={cn(
              'w-full px-3 py-2 rounded-xl border text-[13px] text-gray-800 placeholder:text-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors bg-white',
              errors.treatment_description ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'
            )}
          />

          {treatmentOpen && filteredTreatments.length > 0 && treatmentRect && (
            <div
              className="fixed z-[9999] bg-white rounded-xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden"
              style={{
                width: treatmentRect.width,
                top: treatmentRect.bottom + 4,
                left: treatmentRect.left,
              }}
            >
              <div className="py-1 max-h-48 overflow-y-auto">
                {filteredTreatments.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { set('treatment_description', t); setTreatmentOpen(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-[12px] transition-colors',
                      form.treatment_description === t
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errors.treatment_description && (
            <p className="text-[11px] text-red-500">{errors.treatment_description}</p>
          )}
        </div>

        {/* ── Amount ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Amount (₱)
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
              value={form.amount_charged || ''}
              onChange={e => set('amount_charged', Number(e.target.value))}
              className={cn(
                'w-full pl-7 pr-4 py-2 rounded-xl border text-[13px] text-gray-800 placeholder:text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors bg-white',
                errors.amount_charged ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'
              )}
            />
          </div>
          {errors.amount_charged && (
            <p className="text-[11px] text-red-500">{errors.amount_charged}</p>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
            Add Charge
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