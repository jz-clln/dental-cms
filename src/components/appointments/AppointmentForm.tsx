'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Appointment, AppointmentFormData, Patient, Dentist } from '@/types';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import { TimePicker } from '@/components/ui/TimePicker';
import { getTodayString, getPatientName, TREATMENT_TYPES } from '@/lib/utils';
import { Search, AlertTriangle } from 'lucide-react';

const STATUSES = ['Scheduled', 'Confirmed', 'Done', 'No-show', 'Cancelled'];
const ACTIVE_STATUSES = ['Scheduled', 'Confirmed'];

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

interface ConflictInfo {
  dentistName: string;
  time: string;
  patientName: string;
}

export function AppointmentForm({
  clinicId, existing, prefillPatientId, onSuccess, onCancel, toast,
}: AppointmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const patientRef = useRef<HTMLDivElement>(null);

  const initialForm: AppointmentFormData = {
    patient_id: prefillPatientId ?? existing?.patient_id ?? '',
    dentist_id: existing?.dentist_id ?? '',
    treatment_type: existing?.treatment_type ?? '',
    appointment_date: existing?.appointment_date ?? getTodayString(),
    appointment_time: existing?.appointment_time?.slice(0, 5) ?? '09:00',
    status: existing?.status ?? 'Scheduled',
    notes: existing?.notes ?? '',
  };

  const [form, setForm] = useState<AppointmentFormData>(initialForm);

  const isDirty = !submitted && (
    form.patient_id !== initialForm.patient_id ||
    form.dentist_id !== initialForm.dentist_id ||
    form.treatment_type !== initialForm.treatment_type ||
    form.appointment_date !== initialForm.appointment_date ||
    form.appointment_time !== initialForm.appointment_time ||
    form.notes !== initialForm.notes
  );

  const handleBack = useCallback(() => setShowConfirm(true), []);
  useUnsavedChanges(isDirty, handleBack);

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

      const targetId = prefillPatientId ?? existing?.patient_id;
      if (targetId) {
        const found = pats.find(p => p.id === targetId);
        if (found) { setSelectedPatient(found); setPatientSearch(getPatientName(found)); }
      }
    }
    load();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) {
        setPatientDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Conflict check ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!form.dentist_id || !form.appointment_date || !form.appointment_time) {
      setConflict(null);
      return;
    }

    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);

    conflictTimerRef.current = setTimeout(async () => {
      setCheckingConflict(true);
      const supabase = createClient();

      const query = supabase
        .from('appointments')
        .select('id, appointment_time, patient_id, patient:patients(first_name, last_name)')
        .eq('clinic_id', clinicId)
        .eq('dentist_id', form.dentist_id)
        .eq('appointment_date', form.appointment_date)
        .eq('appointment_time', form.appointment_time)
        .in('status', ACTIVE_STATUSES);

      if (existing?.id) query.neq('id', existing.id);

      const { data } = await query;

      if (data && data.length > 0) {
        const conflicting = data[0];
        const dentist = dentists.find(d => d.id === form.dentist_id);
        const patient = conflicting.patient as any;
        setConflict({
          dentistName: dentist ? `${dentist.first_name} ${dentist.last_name}`.trim() : 'This dentist',
          time: form.appointment_time,
          patientName: patient
            ? `${patient.first_name} ${patient.last_name}`
            : 'another patient',
        });
      } else {
        setConflict(null);
      }

      setCheckingConflict(false);
    }, 400);

    return () => { if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current); };
  }, [form.dentist_id, form.appointment_date, form.appointment_time, dentists, clinicId, existing?.id]);

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
    if (!form.dentist_id) e.dentist_id = 'Please assign a dentist.';
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
      const { error } = await supabase.from('appointments').update(payload).eq('id', existing.id);
      if (error) { toast.error('Failed to update appointment.'); setLoading(false); return; }
      toast.success('Appointment updated.');
    } else {
      const { error } = await supabase.from('appointments').insert(payload);
      if (error) { toast.error('Failed to create appointment.'); setLoading(false); return; }
      toast.success('Appointment created.');
    }

    setSubmitted(true);
    setLoading(false);
    onSuccess?.();
    if (!existing) router.push('/appointments');
  }

  function handleCancel() {
    if (isDirty) setShowConfirm(true);
    else onCancel?.();
  }

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // Build option arrays for CustomSelect
  const treatmentOptions = TREATMENT_TYPES.map(t => ({ value: t, label: t }));
  const dentistOptions = dentists.map(d => ({ value: d.id, label: d.name }));
  const statusOptions = STATUSES.map(s => ({ value: s, label: s }));

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

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
                    <button key={p.id} type="button"
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

        {/* Treatment Type */}
        <CustomSelect
          label="Treatment Type"
          value={form.treatment_type}
          onChange={(val: string) => set('treatment_type', val)}
          options={treatmentOptions}
          placeholder="Select treatment…"
          error={errors.treatment_type}
        />

        {/* Date + Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Date" type="date" value={form.appointment_date}
            onChange={e => set('appointment_date', e.target.value)} error={errors.appointment_date} />
          <TimePicker
            label="Time"
            value={form.appointment_time}
            onChange={(val: string) => set('appointment_time', val)}
            error={errors.appointment_time}
          />
        </div>

        {/* Dentist + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <CustomSelect
              label="Assigned Dentist"
              value={form.dentist_id}
              onChange={(val: string) => set('dentist_id', val)}
              options={dentistOptions}
              placeholder="Select dentist…"
              error={errors.dentist_id}
            />
            {checkingConflict && (
              <p className="text-xs text-gray-400">Checking availability…</p>
            )}
          </div>
          <CustomSelect
            label="Status"
            value={form.status}
            onChange={(val: string) => set('status', val)}
            options={statusOptions}
          />
        </div>

        {/* Conflict warning */}
        {conflict && (
          <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Scheduling conflict</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {conflict.dentistName} already has an appointment at{' '}
                <strong>{formatTime(conflict.time)}</strong> with{' '}
                <strong>{conflict.patientName}</strong>. Please choose a different time.
              </p>
            </div>
          </div>
        )}

        <Textarea
          label="Notes (optional)"
          placeholder="Any special instructions, allergies, or reminders…"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
        />

        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
            {existing ? 'Save Changes' : 'Create Appointment'}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
          )}
        </div>
      </form>

      <UnsavedChangesModal
        open={showConfirm}
        onStay={() => setShowConfirm(false)}
        onLeave={() => { setShowConfirm(false); onCancel?.(); }}
      />
    </>
  );
}