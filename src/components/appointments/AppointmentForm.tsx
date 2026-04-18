'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Appointment, AppointmentFormData, Patient, Dentist } from '@/types';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getTodayString, getPatientName, TREATMENT_TYPES } from '@/lib/utils';
import { Search } from 'lucide-react';

const STATUSES = ['Scheduled', 'Confirmed', 'Done', 'No-show', 'Cancelled'];

interface AppointmentFormProps {
  clinicId: string;
  existing?: Appointment;
  prefillPatientId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

interface FormErrors {
  patient_id?: string;
  treatment_type?: string;
  appointment_date?: string;
  appointment_time?: string;
  dentist_id?: string;
}

export function AppointmentForm({
  clinicId, existing, prefillPatientId, onSuccess, onCancel, toast,
}: AppointmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  // Patient search state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const patientRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<AppointmentFormData>({
    patient_id: prefillPatientId ?? existing?.patient_id ?? '',
    dentist_id: existing?.dentist_id ?? '',
    treatment_type: existing?.treatment_type ?? '',
    appointment_date: existing?.appointment_date ?? getTodayString(),
    appointment_time: existing?.appointment_time?.slice(0, 5) ?? '09:00',
    status: existing?.status ?? 'Scheduled',
    notes: existing?.notes ?? '',
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [pRes, dRes] = await Promise.all([
        supabase.from('patients').select('*').order('last_name'),
        supabase.from('dentists').select('*').order('name'),
      ]);
      const pats = (pRes.data ?? []) as Patient[];
      setPatients(pats);
      setDentists((dRes.data ?? []) as Dentist[]);

      // Pre-fill patient if coming from profile page or editing
      const targetId = prefillPatientId ?? existing?.patient_id;
      if (targetId) {
        const found = pats.find(p => p.id === targetId);
        if (found) {
          setSelectedPatient(found);
          setPatientSearch(getPatientName(found));
        }
      }
    }
    load();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) {
        setPatientDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredPatients = patients.filter(p =>
    getPatientName(p).toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.contact_number ?? '').includes(patientSearch)
  ).slice(0, 8);

  function set(field: keyof AppointmentFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.patient_id) e.patient_id = 'Please select a patient.';
    if (!form.treatment_type) e.treatment_type = 'Please select a treatment type.';
    if (!form.appointment_date) e.appointment_date = 'Please pick a date.';
    if (!form.appointment_time) e.appointment_time = 'Please pick a time.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const payload = {
      clinic_id: clinicId,
      patient_id: form.patient_id,
      dentist_id: form.dentist_id || null,
      treatment_type: form.treatment_type,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    if (existing) {
      const { error } = await supabase
        .from('appointments').update(payload).eq('id', existing.id);
      if (error) { toast.error('Failed to update appointment.'); setLoading(false); return; }
      toast.success('Appointment updated.');
    } else {
      const { error } = await supabase.from('appointments').insert(payload);
      if (error) { toast.error('Failed to create appointment.'); setLoading(false); return; }
      toast.success('Appointment created.');
    }

    setLoading(false);
    onSuccess?.();
    if (!existing) router.push('/appointments');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Patient search */}
      <div className="flex flex-col gap-1" ref={patientRef}>
        <label className="text-sm font-medium text-gray-700">Patient</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient name or phone…"
            value={patientSearch}
            onChange={e => {
              setPatientSearch(e.target.value);
              setPatientDropOpen(true);
              if (!e.target.value) { setSelectedPatient(null); set('patient_id', ''); }
            }}
            onFocus={() => setPatientDropOpen(true)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
              transition-colors ${errors.patient_id ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
          />
          {patientDropOpen && patientSearch && (
            <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
              {filteredPatients.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-3">No patients found.</p>
              ) : (
                filteredPatients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientSearch(getPatientName(p));
                      set('patient_id', p.id);
                      setPatientDropOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-teal-50 text-sm transition-colors"
                  >
                    <span className="font-medium text-gray-900">{getPatientName(p)}</span>
                    {p.contact_number && (
                      <span className="text-gray-400 ml-2 text-xs">{p.contact_number}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {errors.patient_id && <p className="text-xs text-red-600">{errors.patient_id}</p>}
      </div>

      {/* Treatment type */}
      <Select
        label="Treatment Type"
        value={form.treatment_type}
        onChange={e => set('treatment_type', e.target.value)}
        error={errors.treatment_type}
        placeholder="Select treatment…"
      >
        {TREATMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </Select>

      {/* Date + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={form.appointment_date}
          onChange={e => set('appointment_date', e.target.value)}
          error={errors.appointment_date}
        />
        <Input
          label="Time"
          type="time"
          value={form.appointment_time}
          onChange={e => set('appointment_time', e.target.value)}
          error={errors.appointment_time}
        />
      </div>

      {/* Dentist + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Assigned Dentist"
          value={form.dentist_id}
          onChange={e => set('dentist_id', e.target.value)}
          placeholder="Select dentist…"
        >
          {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select
          label="Status"
          value={form.status}
          onChange={e => set('status', e.target.value as AppointmentFormData['status'])}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {/* Notes */}
      <Textarea
        label="Notes (optional)"
        placeholder="Any special instructions, allergies, or reminders…"
        value={form.notes}
        onChange={e => set('notes', e.target.value)}
        rows={3}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
          {existing ? 'Save Changes' : 'Create Appointment'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
