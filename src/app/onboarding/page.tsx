'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Create their clinic
    const { data: clinic } = await supabase
      .from('clinics')
      .insert({ name: clinicName, address })
      .select()
      .single();

    // 2. Create their staff record as admin
    await supabase.from('staff').insert({
      clinic_id: clinic.id,
      auth_user_id: user.id,
      email: user.email,
      full_name: user.user_metadata.full_name ?? user.email,
      role: 'admin',
    });

    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Set up your clinic</h1>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          This takes 30 seconds. Your data will be completely private.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Clinic Name</label>
            <input
              required
              value={clinicName}
              onChange={e => setClinicName(e.target.value)}
              placeholder="Bright Smile Dental Clinic"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street, City, Province"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-700 text-white py-2.5 rounded-lg font-medium
              hover:bg-teal-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Create My Clinic'}
          </button>
        </form>
      </div>
    </div>
  );
}