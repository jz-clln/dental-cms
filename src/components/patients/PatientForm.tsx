'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Patient, PatientFormData } from '@/types';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';

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
}

const EMPTY_FORM: PatientFormData = {
  first_name: '',
  last_name: '',
  birthday: '',
  address: '',
  contact_number: '',
  email: '',
};

export function PatientForm({ clinicId, existing, onSuccess, onCancel, toast }: PatientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<PatientFormData>({
    first_name: existing?.first_name ?? '',
    last_name: existing?.last_name ?? '',
    birthday: existing?.birthday ?? '',
    address: existing?.address ?? '',
    contact_number: existing?.contact_number ?? '',
    email: existing?.email ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Detect if any field has been changed from initial state
  const initial = existing
    ? { first_name: existing.first_name, last_name: existing.last_name,
        birthday: existing.birthday ?? '', address: existing.address ?? '',
        contact_number: existing.contact_number ?? '', email: existing.email ?? '' }
    : EMPTY_FORM;

  const isDirty = !submitted && Object.keys(form).some(
    k => form[k as keyof PatientFormData] !== initial[k as keyof PatientFormData]
  );

  // Show confirm modal when back button is pressed
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
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required.';
    if (form.contact_number && !/^[0-9+\-\s()]{7,15}$/.test(form.contact_number)) {
      newErrors.contact_number = 'Enter a valid phone number.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const payload = {
      clinic_id: clinicId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      birthday: form.birthday || null,
      address: form.address.trim() || null,
      contact_number: form.contact_number.trim() || null,
      email: form.email.trim() || null,
    };

    if (existing) {
      const { data, error } = await supabase
        .from('patients').update(payload).eq('id', existing.id).select().single();
      if (error) { toast.error('Failed to update patient. Please try again.'); setLoading(false); return; }
      setSubmitted(true);
      toast.success('Patient updated successfully.');
      onSuccess?.(data as Patient);
    } else {
      const { data, error } = await supabase
        .from('patients').insert(payload).select().single();
      if (error) { toast.error('Failed to add patient. Please try again.'); setLoading(false); return; }
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
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Birthday"
            type="date"
            value={form.birthday}
            onChange={e => set('birthday', e.target.value)}
          />
          <Input
            label="Contact Number"
            placeholder="09171234567"
            value={form.contact_number}
            onChange={e => set('contact_number', e.target.value)}
            error={errors.contact_number}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          placeholder="patient@email.com"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email}
        />

        <Textarea
          label="Home Address"
          placeholder="123 Mabini St., Calamba City, Laguna"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          rows={2}
        />

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