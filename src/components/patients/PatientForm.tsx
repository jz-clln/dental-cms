'use client';
//
// UPDATE: added a duplicate-patient check for new patients. While typing
// the contact number, a debounced call to match_patient_by_phone (see
// 002_patient_phone_dedup.sql) checks for an existing patient in this
// clinic with the same number, matched on the last 10 digits so
// formatting differences ("0917…" vs "+63 917…") still catch the match.
// This is a WARNING, not a hard block — two patients can legitimately
// share a household/parent's phone — so staff can still proceed, but now
// see a link to the existing record first instead of finding out later
// from a duplicate in search results.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Patient, PatientFormData } from '@/types';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientFormProps {
  clinicId: string;
  existing?: Patient;
  onSuccess?: (patient: Patient) => void;
  onCancel?: () => void;
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
  };
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  contact_number?: string;
  email?: string;
  consent?: string;
}

interface DuplicateMatch {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const EMPTY_FORM: PatientFormData = {
  first_name: '',
  last_name: '',
  birthday: '',
  address: '',
  contact_number: '',
  email: '',
};

// Surface the DB trigger's own message ("Patient limit reached (40)...")
// instead of a generic failure — this is the backstop for when the
// client-side cap check in useTrialStatus was stale or bypassed.
function describeInsertError(message: string): string {
  return message.includes('limit reached')
    ? message
    : 'Failed to add patient. Please try again.';
}

export function PatientForm({ clinicId, existing, onSuccess, onCancel, toast }: PatientFormProps) {
  const router = useRouter();
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<PatientFormData>({
    first_name:     existing?.first_name     ?? '',
    last_name:      existing?.last_name      ?? '',
    birthday:       existing?.birthday       ?? '',
    address:        existing?.address        ?? '',
    contact_number: existing?.contact_number ?? '',
    email:          existing?.email          ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const [consentGiven, setConsentGiven] = useState<boolean>(
    (existing as any)?.consent_given ?? false
  );

  // ── Duplicate-phone check (new patients only) ───────────────────────
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);
  const duplicateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (existing) return; // only warn when creating a new patient
    const digits = form.contact_number.replace(/[^0-9]/g, '');

    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);

    if (digits.length < 7) {
      setDuplicateMatch(null);
      return;
    }

    duplicateTimerRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('match_patient_by_phone', {
        p_clinic_id: clinicId,
        p_phone: form.contact_number,
      });
      setDuplicateMatch((data?.[0] as DuplicateMatch) ?? null);
    }, 400);

    return () => { if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current); };
  }, [form.contact_number, clinicId, existing]);

  const initial = existing
    ? {
        first_name:     existing.first_name,
        last_name:      existing.last_name,
        birthday:       existing.birthday       ?? '',
        address:        existing.address        ?? '',
        contact_number: existing.contact_number ?? '',
        email:          existing.email          ?? '',
      }
    : EMPTY_FORM;

  const isDirty = !submitted && Object.keys(form).some(
    k => form[k as keyof PatientFormData] !== initial[k as keyof PatientFormData]
  );

  const handleBack = useCallback(() => setShowConfirm(true), []);
  useUnsavedChanges(isDirty, handleBack);

  function set(field: keyof PatientFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required.';
    if (!form.last_name.trim())  newErrors.last_name  = 'Last name is required.';
    if (form.contact_number && !/^[0-9+\-\s()]{7,15}$/.test(form.contact_number)) {
      newErrors.contact_number = 'Enter a valid phone number.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!existing && !consentGiven) {
      newErrors.consent = 'Patient consent is required before adding a record.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const now = new Date().toISOString();

    const payload = {
      clinic_id:      clinicId,
      first_name:     form.first_name.trim(),
      last_name:      form.last_name.trim(),
      birthday:       form.birthday       || null,
      address:        form.address.trim() || null,
      contact_number: form.contact_number.trim() || null,
      email:          form.email.trim()   || null,
      ...(!existing && {
        consent_given:    true,
        consent_given_at: now,
      }),
    };

    if (existing) {
      const { data, error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        toast.error('Failed to update patient. Please try again.');
        setLoading(false);
        return;
      }
      setSubmitted(true);
      toast.success('Patient updated successfully.');
      onSuccess?.(data as Patient);
    } else {
      const { data, error } = await supabase
        .from('patients')
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast.error(describeInsertError(error.message));
        setLoading(false);
        return;
      }
      setSubmitted(true);
      toast.success(`${form.first_name} ${form.last_name} has been added.`);
      onSuccess?.(data as Patient);
      router.push(`/patients/${data.id}`);
    }

    setLoading(false);
  }

  function handleCancel() {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onCancel?.();
    }
  }

  return (
    <>
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

        {/* Birthday & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatePicker
            label="Birthday"
            placeholder="Select birthday"
            value={form.birthday ? new Date(`${form.birthday}T00:00:00`) : undefined}
            onChange={date => set('birthday', date ? date.toLocaleDateString('en-CA') : '')}
            maxDate={new Date()}
          />
          <div className="flex flex-col gap-1">
            <Input
              label="Contact Number"
              placeholder="09171234567"
              value={form.contact_number}
              onChange={e => set('contact_number', e.target.value)}
              error={errors.contact_number}
            />
            {!existing && duplicateMatch && (
              <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Possible duplicate:{' '}
                  <strong>
                    {duplicateMatch.first_name} {duplicateMatch.last_name}
                  </strong>{' '}
                  already uses this number.{' '}
                  <Link
                    href={`/patients/${duplicateMatch.id}`}
                    target="_blank"
                    className="underline hover:text-amber-900"
                  >
                    View record
                  </Link>{' '}
                  · you can still continue if this is a different person.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="patient@email.com"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email}
        />

        {/* Address */}
        <Textarea
          label="Home Address"
          placeholder="123 Mabini St., Calamba City, Laguna"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          rows={2}
        />

        {/* ── Consent checkbox — new patients only ── */}
        {!existing && (
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
                The patient has been informed about how their data will be collected,
                stored, and used by this clinic in accordance with the{' '}
                <strong className="text-gray-800">Data Privacy Act of 2012 (RA 10173)</strong>.
              </span>
            </label>

            {consentGiven && (
              <div className="flex items-center gap-1.5 mt-2.5 ml-7 text-xs text-teal-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Consent will be recorded with today's date and time.
              </div>
            )}

            {errors.consent && (
              <p className="mt-2 ml-7 text-xs text-red-500">{errors.consent}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
            {existing ? 'Save Changes' : 'Add Patient'}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
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