// src/components/booking/PublicBookingForm.tsx
//
// Client form for the public QR booking page (src/app/book/[clinicId]).
// Deliberately built from the same primitives as AppointmentForm.tsx and
// PatientForm.tsx (Input, Textarea, CustomSelect, DatePicker, TimePicker,
// Button) so it looks and behaves like the rest of the app, not like a
// bolted-on marketing form.
//
// Differences from the dashboard forms, on purpose:
//  - No `toast` prop — this page is outside the (dashboard) layout, so
//    useAppToast() isn't available. Success/error are shown inline instead.
//  - No UnsavedChangesModal / useUnsavedChanges — there's no in-app
//    navigation to protect against on a one-shot public page.
//  - Consent checkbox mirrors PatientForm's RA 10173 block, since this
//    form can create a new patients row on approval, same as PatientForm.
//  - Submits to /api/booking/submit (server route, service-role client)
//    instead of inserting from the browser — this form has no Supabase
//    client at all.

'use client';

import { useEffect, useState } from 'react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { TREATMENT_TYPES } from '@/lib/utils';
import { getBookingToday, isFutureBooking } from '@/lib/booking-time';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DentistJoin, PublicBookingFormData } from '@/types';

interface PublicBookingFormProps {
  clinicId: string;
  dentists: DentistJoin[];
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  contact_number?: string;
  email?: string;
  treatment_type?: string;
  requested_date?: string;
  requested_time?: string;
  consent?: string;
}

const EMPTY_FORM: PublicBookingFormData = {
  first_name: '',
  last_name: '',
  contact_number: '',
  email: '',
  treatment_type: '',
  requested_date: '',
  requested_time: '09:00',
  dentist_id: '',
  notes: '',
};

function parseDateString(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PublicBookingForm({ clinicId, dentists }: PublicBookingFormProps) {
  const [form, setForm] = useState<PublicBookingFormData>(() => ({
    ...EMPTY_FORM,
    requested_date: getBookingToday(),
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const today = getBookingToday(now);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    setForm(prev => {
      if (!prev.requested_date || !prev.requested_time ||
          isFutureBooking(prev.requested_date, prev.requested_time, now)) return prev;
      return { ...prev, requested_time: '' };
    });
  }, [now, form.requested_date, form.requested_time]);

  function set<K extends keyof PublicBookingFormData>(field: K, value: PublicBookingFormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required.';
    if (!form.last_name.trim()) e.last_name = 'Last name is required.';
    if (!form.contact_number.trim() || !/^[0-9+\-\s()]{7,15}$/.test(form.contact_number)) {
      e.contact_number = 'Enter a valid phone number.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address.';
    }
    if (!form.treatment_type) e.treatment_type = 'Please select a treatment.';
    if (!form.requested_date) e.requested_date = 'Please pick a date.';
    if (!form.requested_time) e.requested_time = 'Please pick a time.';
    if (form.requested_date && form.requested_date < getBookingToday()) {
      e.requested_date = 'Please choose today or a future date.';
    }
    if (form.requested_date && form.requested_time &&
        !isFutureBooking(form.requested_date, form.requested_time)) {
      e.requested_time = 'Please choose a future date and time.';
    }
    if (!consentGiven) e.consent = 'Please confirm before submitting.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/booking/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinicId,
          ...form,
          consent_given: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const treatmentOptions = TREATMENT_TYPES.map(t => ({ value: t, label: t }));
  const dentistOptions = [
    { value: '', label: 'No preference' },
    ...dentists.map(d => ({ value: d.id, label: d.name })),
  ];

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-50">
          <CheckCircle2 className="w-6 h-6 text-teal-600" />
        </span>
        <div>
          <p className="text-base font-semibold text-ink-900">Request sent</p>
          <p className="mt-1 text-sm text-gray-500 max-w-xs">
            The clinic will contact you at <strong>{form.contact_number}</strong> to confirm your
            appointment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First Name"
          placeholder="Juan"
          value={form.first_name}
          onChange={e => set('first_name', e.target.value)}
          error={errors.first_name}
          required
        />
        <Input
          label="Last Name"
          placeholder="Dela Cruz"
          value={form.last_name}
          onChange={e => set('last_name', e.target.value)}
          error={errors.last_name}
          required
        />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Contact Number"
          placeholder="09171234567"
          value={form.contact_number}
          onChange={e => set('contact_number', e.target.value)}
          error={errors.contact_number}
          required
        />
        <Input
          label="Email (optional)"
          type="email"
          placeholder="you@email.com"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email}
        />
      </div>

      {/* Treatment */}
      <CustomSelect
        label="What do you need?"
        value={form.treatment_type}
        onChange={(val: string) => set('treatment_type', val)}
        options={treatmentOptions}
        placeholder="Select treatment…"
        error={errors.treatment_type}
      />

      {/* Date + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <DatePicker
            label="Preferred Date"
            value={parseDateString(form.requested_date)}
            onChange={date => set('requested_date', date ? formatDateString(date) : '')}
            minDate={parseDateString(today)}
            fromYear={Number(today.slice(0, 4))}
            toYear={Number(today.slice(0, 4)) + 1}
          />
          {errors.requested_date && <p className="text-xs text-red-600">{errors.requested_date}</p>}
        </div>
        <TimePicker
          label="Preferred Time"
          value={form.requested_time}
          onChange={(val: string) => {
            if (isFutureBooking(form.requested_date, val)) set('requested_time', val);
            else setNow(Date.now());
          }}
          isTimeDisabled={time => !isFutureBooking(form.requested_date, time, now)}
          error={errors.requested_time}
        />
      </div>

      {/* Dentist preference */}
      <CustomSelect
        label="Preferred Dentist (optional)"
        value={form.dentist_id}
        onChange={(val: string) => set('dentist_id', val)}
        options={dentistOptions}
        placeholder="No preference"
      />

      <Textarea
        label="Anything else? (optional)"
        placeholder="Allergies, concerns, or anything the clinic should know…"
        value={form.notes}
        onChange={e => set('notes', e.target.value)}
        rows={3}
      />

      {/* Consent — mirrors PatientForm's RA 10173 block, since approval
          can create a real patients row from this data. */}
      <div className={cn(
        'rounded-xl border p-4 transition-colors',
        consentGiven
          ? 'bg-teal-50 border-teal-200'
          : errors.consent
          ? 'bg-red-50 border-red-200'
          : 'bg-gray-50 border-gray-200'
      )}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={e => {
              setConsentGiven(e.target.checked);
              if (errors.consent) setErrors(p => ({ ...p, consent: undefined }));
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-500 flex-shrink-0"
          />
          <span className="text-xs text-gray-700 leading-tight">
            I agree to let this clinic collect, store, and use my information to process this
            booking, in accordance with the{' '}
            <strong className="text-gray-800">Data Privacy Act of 2012 (RA 10173)</strong>.
          </span>
        </label>
        {consentGiven && (
          <div className="flex items-center gap-1.5 mt-2.5 ml-7 text-xs text-teal-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Consent will be recorded with today's date and time.
          </div>
        )}
        {errors.consent && <p className="mt-2 ml-7 text-xs text-red-500">{errors.consent}</p>}
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {submitError}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Request Appointment
      </Button>
    </form>
  );
}
