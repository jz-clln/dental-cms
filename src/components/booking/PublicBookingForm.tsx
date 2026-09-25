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

import { useEffect, useRef, useState } from 'react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { TREATMENT_TYPES, formatDate, formatTime } from '@/lib/utils';
import { getBookingToday, isFutureBooking, isBookingDentistAvailable } from '@/lib/booking-time';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dentist, PublicBookingFormData } from '@/types';

interface PublicBookingFormProps {
  clinicId: string;
  dentists: Pick<Dentist, 'id' | 'name' | 'schedule_days'>[];
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  contact_number?: string;
  email?: string;
  treatment_type?: string;
  requested_date?: string;
  requested_time?: string;
  dentist_id?: string;
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
  const [submittedBooking, setSubmittedBooking] = useState<PublicBookingFormData | null>(null);
  const [reviewBooking, setReviewBooking] = useState<PublicBookingFormData | null>(null);
  const reviewRef = useRef<HTMLDialogElement>(null);
  const reviewButtonRef = useRef<HTMLButtonElement>(null);
  const sendingRef = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const today = getBookingToday(now);
  const noTimesToday = form.requested_date === today && !isFutureBooking(today, '23:30', now);
  const availableDentists = dentists.filter(d => isBookingDentistAvailable(d.schedule_days, form.requested_date));
  const noDentistsAvailable = !!form.requested_date && availableDentists.length === 0;

  useEffect(() => {
    const dialog = reviewRef.current;
    if (!reviewBooking || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [reviewBooking]);

  function closeReview() {
    if (sendingRef.current) return;
    setReviewBooking(null);
    reviewButtonRef.current?.focus();
  }

  useEffect(() => {
    setForm(prev => {
      if (!prev.dentist_id || dentists.some(d => d.id === prev.dentist_id &&
          isBookingDentistAvailable(d.schedule_days, prev.requested_date))) return prev;
      return { ...prev, dentist_id: '' };
    });
  }, [dentists, form.requested_date]);

  useEffect(() => {
    if (submitted) {
      successRef.current?.focus();
      successRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [submitted]);

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
    if (noDentistsAvailable) {
      e.dentist_id = 'No dentists are available on this date. Please choose another date.';
    } else if (form.dentist_id && !availableDentists.some(d => d.id === form.dentist_id)) {
      e.dentist_id = 'This dentist is not available on the selected date. Please choose another dentist.';
    }
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sendingRef.current || reviewBooking) return;
    setSubmitError(null);
    if (!validate()) return;
    setReviewBooking({ ...form });
  }

  async function confirmBooking() {
    if (sendingRef.current || !reviewBooking) return;
    setSubmitError(null);
    // The date/time may have expired while the review dialog was open.
    if (!validate() || JSON.stringify(form) !== JSON.stringify(reviewBooking)) {
      setSubmitError('Your booking details need updating. Please check the form and review again.');
      closeReview();
      return;
    }
    const booking = { ...reviewBooking };
    sendingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch('/api/booking/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinicId,
          ...booking,
          consent_given: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Something went wrong. Please try again.');
      }

      setSubmittedBooking(booking);
      setReviewBooking(null);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  const treatmentOptions = TREATMENT_TYPES.map(t => ({ value: t, label: t }));
  const dentistOptions = [
    ...(availableDentists.length ? [{ value: '', label: 'Any available dentist' }] : []),
    ...availableDentists.map(d => ({ value: d.id, label: d.name })),
  ];

  if (submitted && submittedBooking) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="flex flex-col items-center text-center gap-4 py-2 outline-none">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-50">
          <CheckCircle2 className="w-6 h-6 text-teal-600" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Your request has been sent</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 max-w-xs">
            The clinic will contact you at <strong className="break-all">{submittedBooking.contact_number}</strong> to confirm your
            appointment.
          </p>
        </div>
        <div className="w-full rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-left">
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Awaiting confirmation</span>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-gray-500">Treatment or service</dt><dd className="mt-0.5 font-medium text-ink-900 break-words">{submittedBooking.treatment_type}</dd></div>
            <div><dt className="text-gray-500">Requested date</dt><dd className="mt-0.5 font-medium text-ink-900">{formatDate(submittedBooking.requested_date)}</dd></div>
            <div><dt className="text-gray-500">Requested time</dt><dd className="mt-0.5 font-medium text-ink-900">{formatTime(submittedBooking.requested_time)} <span className="font-normal text-gray-600">(Philippine time)</span></dd></div>
          </dl>
        </div>
        <p className="text-sm text-gray-500">You can safely close this page.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 [&_button]:min-h-11 [&_input:not([type=checkbox])]:min-h-11 [&_input:not([type=checkbox])]:text-base [&_textarea]:text-base" autoComplete="on" aria-busy={loading}>
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Request an appointment</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Choose your preferred date and time. The clinic will contact you to confirm availability.
        </p>
      </div>
      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First Name"
          name="given-name"
          autoComplete="given-name"
          placeholder="Juan"
          value={form.first_name}
          onChange={e => set('first_name', e.target.value)}
          error={errors.first_name}
          required
        />
        <Input
          label="Last Name"
          name="family-name"
          autoComplete="family-name"
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
          name="tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09171234567"
          value={form.contact_number}
          onChange={e => set('contact_number', e.target.value)}
          error={errors.contact_number}
          required
        />
        <Input
          label="Email (optional)"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email}
        />
      </div>

      {/* Treatment */}
      <CustomSelect
        label="Treatment or service"
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
        <div className="space-y-1.5">
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
          <p className="text-xs text-gray-600">All times are Philippine time.</p>
          {noTimesToday && <p role="status" className="text-sm text-amber-800">No remaining times today. Please choose another date.</p>}
        </div>
      </div>

      {/* Dentist preference */}
      <CustomSelect
        label="Dentist preference (optional)"
        value={form.dentist_id}
        onChange={(val: string) => set('dentist_id', val)}
        options={dentistOptions}
        placeholder={noDentistsAvailable ? 'No dentists available' : 'Any available dentist'}
        error={noDentistsAvailable ? 'No dentists are available on this date. Please choose another date.' : errors.dentist_id}
      />

      <Textarea
        label="Notes for the clinic (optional)"
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
        <label className="flex min-h-11 items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={e => {
              setConsentGiven(e.target.checked);
              if (errors.consent) setErrors(p => ({ ...p, consent: undefined }));
            }}
            className="mt-0.5 h-5 w-5 rounded border-gray-300 text-teal-700 accent-teal-700 focus:ring-teal-500 flex-shrink-0"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I agree to let this clinic collect, store, and use my information to process this
            booking, in accordance with the{' '}
            <span>Data Privacy Act of 2012 (RA 10173)</span>.
          </span>
        </label>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 underline underline-offset-2">
          Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
        </a>
        {consentGiven && (
          <div className="flex items-start gap-2 mt-1 text-sm text-teal-700" role="status">
            <ShieldCheck className="mt-0.5 w-5 h-5 shrink-0" />
            <span>Your consent will be saved when you submit.</span>
          </div>
        )}
        {errors.consent && <p role="alert" className="mt-2 text-sm text-red-600">{errors.consent}</p>}
      </div>

      {submitError && !reviewBooking && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {submitError}
        </p>
      )}

      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-gray-600">Your appointment is confirmed only after the clinic contacts you.</p>
        <Button ref={reviewButtonRef} type="submit" disabled={noDentistsAvailable || loading} className="w-full min-h-12 text-base">
          Review appointment request
        </Button>
      </div>
      {reviewBooking && (
        <dialog
          ref={reviewRef}
          aria-labelledby="booking-review-title"
          aria-describedby="booking-review-description"
          aria-busy={loading}
          onCancel={event => { event.preventDefault(); closeReview(); }}
          className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-xl backdrop:bg-black/40 sm:p-6"
        >
          <h2 id="booking-review-title" className="text-lg font-semibold text-ink-900">Are these details correct?</h2>
          <p id="booking-review-description" className="mt-2 text-sm leading-relaxed text-gray-600">
            Please double-check your contact number so the clinic can reach you.
          </p>
          <dl className="my-5 space-y-3 text-sm">
            {[
              ['Name', `${reviewBooking.first_name} ${reviewBooking.last_name}`],
              ['Contact number', reviewBooking.contact_number],
              ['Email', reviewBooking.email || 'Not provided'],
              ['Treatment or service', reviewBooking.treatment_type],
              ['Preferred date', formatDate(reviewBooking.requested_date)],
              ['Preferred time', `${formatTime(reviewBooking.requested_time)} (Philippine time)`],
              ['Dentist preference', dentists.find(d => d.id === reviewBooking.dentist_id)?.name || 'Any available dentist'],
              ['Notes for the clinic', reviewBooking.notes || 'None'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
          {submitError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
          <p className="mb-4 text-sm text-gray-600">Your appointment is confirmed only after the clinic contacts you.</p>
          <div className="flex flex-col gap-3">
            <Button type="button" variant="secondary" disabled={loading} onClick={closeReview} className="min-h-12 w-full text-base">
              Go back and edit
            </Button>
            <Button type="button" loading={loading} onClick={confirmBooking} className="min-h-12 w-full text-base">
              {loading ? 'Sending request…' : 'Confirm and send'}
            </Button>
          </div>
        </dialog>
      )}
    </form>
  );
}
