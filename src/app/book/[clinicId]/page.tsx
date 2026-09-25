// src/app/book/[clinicId]/page.tsx
//
// Public route (no auth) — this is what the clinic's printed QR code
// points to. Added to PUBLIC_ROUTES in middleware.ts.
//
// Runs as a Server Component so the clinic name + dentist list can be
// fetched with the service-role admin client (src/lib/supabase/admin.ts)
// without exposing any Supabase credentials or RLS policy to the browser.
// The admin client is never imported into PublicBookingForm.tsx, which is
// a 'use client' component — it only talks to /api/booking/submit.

import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { PublicBookingForm } from '@/components/booking/PublicBookingForm';
import type { DentistJoin } from '@/types';

interface PageProps {
  params: Promise<{ clinicId: string }>;
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { clinicId } = await params;

  const supabase = createAdminClient();

  const [clinicRes, dentistsRes] = await Promise.all([
    supabase.from('clinics').select('id, name').eq('id', clinicId).maybeSingle(),
    supabase
      .from('dentists')
      .select('id, name')
      .eq('clinic_id', clinicId)
      .order('name'),
  ]);

  if (!clinicRes.data) {
    // Invalid/mistyped clinicId in the QR — show Next's standard 404
    // rather than a confusing empty form.
    notFound();
  }

  return (
    <div className="min-h-screen bg-porcelain-50 flex flex-col items-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          {/* <ToothLogo className="w-7 h-7 text-teal-700" /> */}
          <span className="font-semibold text-ink-900">{clinicRes.data.name}</span>
        </div>

        <div className="bg-white rounded-2xl border border-porcelain-200 shadow-sm p-5 sm:p-6">
          <h1 className="text-lg font-semibold text-ink-900">Book an appointment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill this in and our front desk will confirm your slot shortly.
          </p>

          <div className="mt-6">
            <PublicBookingForm
              clinicId={clinicRes.data.id}
              dentists={(dentistsRes.data ?? []) as DentistJoin[]}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          This isn't a confirmed appointment yet — the clinic will reach out to confirm.
        </p>
      </div>
    </div>
  );
}