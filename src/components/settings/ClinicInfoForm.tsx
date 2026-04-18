'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clinic } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ClinicInfoFormProps {
  clinic: Clinic;
  onSuccess: (updated: Clinic) => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

interface FormErrors {
  name?: string;
  email?: string;
}

export function ClinicInfoForm({ clinic, onSuccess, toast }: ClinicInfoFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    name: clinic.name ?? '',
    address: clinic.address ?? '',
    contact_number: clinic.contact_number ?? '',
    email: clinic.email ?? '',
  });

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Clinic name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('clinics')
      .update({
        name: form.name.trim(),
        address: form.address.trim() || null,
        contact_number: form.contact_number.trim() || null,
        email: form.email.trim() || null,
      })
      .eq('id', clinic.id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update clinic info.');
    } else {
      toast.success('Clinic information saved.');
      onSuccess(data as Clinic);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Clinic Name"
        value={form.name}
        onChange={e => set('name', e.target.value)}
        error={errors.name}
        placeholder="Bright Smile Dental Clinic"
        required
      />
      <Input
        label="Address"
        value={form.address}
        onChange={e => set('address', e.target.value)}
        placeholder="Street, City, Province"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Contact Number"
          value={form.contact_number}
          onChange={e => set('contact_number', e.target.value)}
          placeholder="+63 49 555 0123"
        />
        <Input
          label="Email Address"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email}
          placeholder="clinic@email.com"
        />
      </div>
      <div className="pt-1">
        <Button type="submit" loading={loading}>Save Changes</Button>
      </div>
    </form>
  );
}
