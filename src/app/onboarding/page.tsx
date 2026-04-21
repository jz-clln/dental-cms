'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import { Loader2, Building2, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';

type OnboardingStep = 'clinic' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('clinic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    clinicName: '',
    address: '',
    contactNumber: '',
    email: '',
  });

  function set(field: keyof typeof form, value: string) {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.clinicName.trim()) e.clinicName = 'Clinic name is required.';
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Check if staff record already exists (Google OAuth users)
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id, clinic_id')
      .eq('auth_user_id', user.id)
      .single();

    if (existingStaff?.clinic_id) {
      // Already has a clinic — go to dashboard
      router.push('/dashboard');
      return;
    }

    // Create the clinic
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({
        name: form.clinicName.trim(),
        address: form.address.trim() || null,
        contact_number: form.contactNumber.trim() || null,
        email: form.email.trim() || user.email || null,
      })
      .select()
      .single();

    if (clinicError || !clinic) {
      setErrors({ general: 'Failed to create clinic. Please try again.' });
      setLoading(false);
      return;
    }

    // Create staff record as admin
    const { error: staffError } = await supabase.from('staff').insert({
      clinic_id: clinic.id,
      auth_user_id: user.id,
      email: user.email ?? form.email.trim(),
      full_name: user.user_metadata?.full_name ?? user.email ?? 'Admin',
      role: 'admin',
    });

    if (staffError) {
      setErrors({ general: 'Failed to set up your account. Please try again.' });
      setLoading(false);
      return;
    }

    setStep('done');
    setLoading(false);

    // Redirect after short delay
    setTimeout(() => router.push('/dashboard'), 2000);
  }

  // ── Done screen ────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center
              animate-in zoom-in-50 duration-500">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
            <p className="text-gray-500 mt-2">
              <strong>{form.clinicName}</strong> is ready. Taking you to your dashboard…
            </p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // ── Clinic setup form ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AppIcon size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your clinic</h1>
          <p className="text-gray-500 text-sm mt-1">
            This takes 30 seconds. You can update it anytime in Settings.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-teal-600" />
          <span className="text-xs text-gray-400 flex-shrink-0">Step 1 of 1</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {errors.general}
              </div>
            )}

            {/* Clinic Name — required */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Clinic Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.clinicName}
                  onChange={e => set('clinicName', e.target.value)}
                  placeholder="Bright Smile Dental Clinic"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                    focus:border-transparent transition-colors
                    ${errors.clinicName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                />
              </div>
              {errors.clinicName && <p className="text-xs text-red-600">{errors.clinicName}</p>}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Street, City, Province"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm
                    text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2
                    focus:ring-teal-500 hover:border-gray-300 transition-colors"
                />
              </div>
            </div>

            {/* Contact + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Phone <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={form.contactNumber}
                    onChange={e => set('contactNumber', e.target.value)}
                    placeholder="09XX XXX XXXX"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm
                      text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2
                      focus:ring-teal-500 hover:border-gray-300 transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="clinic@email.com"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm text-gray-900
                      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                      hover:border-gray-300 transition-colors
                      ${errors.email ? 'border-red-300' : 'border-gray-200'}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
                text-white font-semibold py-2.5 px-4 rounded-lg transition-colors mt-2
                disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                focus:ring-teal-500 focus:ring-offset-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Setting up your clinic…' : 'Create My Clinic →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your data is private and never shared.
        </p>
      </div>
    </div>
  );
}
