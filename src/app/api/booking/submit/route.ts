// src/app/api/booking/submit/route.ts
//
// The only write path for the public QR booking form. Runs server-side
// with the service-role admin client, so this is also the one place that
// needs to validate everything the browser sends — nothing here is
// protected by RLS.
//
// TODO before going live: add IP-based rate limiting (e.g. Upstash
// Ratelimit, or a Vercel Edge Config counter) — right now this endpoint
// has no throttling beyond normal hosting limits, and it's a public,
// unauthenticated POST endpoint.

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TREATMENT_TYPES } from '@/lib/utils';

const PHONE_RE = /^[0-9+\-\s()]{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const {
    clinic_id,
    first_name,
    last_name,
    contact_number,
    email,
    treatment_type,
    requested_date,
    requested_time,
    dentist_id,
    notes,
    consent_given,
  } = body ?? {};

  // ── Validate ──────────────────────────────────────────────────────────
  if (typeof clinic_id !== 'string' || !clinic_id) {
    return NextResponse.json({ error: 'Missing clinic.' }, { status: 400 });
  }
  if (typeof first_name !== 'string' || !first_name.trim()) {
    return NextResponse.json({ error: 'First name is required.' }, { status: 400 });
  }
  if (typeof last_name !== 'string' || !last_name.trim()) {
    return NextResponse.json({ error: 'Last name is required.' }, { status: 400 });
  }
  if (typeof contact_number !== 'string' || !PHONE_RE.test(contact_number)) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  }
  if (email && (typeof email !== 'string' || !EMAIL_RE.test(email))) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (typeof treatment_type !== 'string' || !TREATMENT_TYPES.includes(treatment_type)) {
    return NextResponse.json({ error: 'Select a valid treatment.' }, { status: 400 });
  }
  if (typeof requested_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(requested_date)) {
    return NextResponse.json({ error: 'Pick a valid date.' }, { status: 400 });
  }
  if (requested_date < new Date().toLocaleDateString('en-CA')) {
    return NextResponse.json({ error: "That date has already passed." }, { status: 400 });
  }
  if (typeof requested_time !== 'string' || !/^\d{2}:\d{2}$/.test(requested_time)) {
    return NextResponse.json({ error: 'Pick a valid time.' }, { status: 400 });
  }
  if (dentist_id && typeof dentist_id !== 'string') {
    return NextResponse.json({ error: 'Invalid dentist.' }, { status: 400 });
  }
  if (consent_given !== true) {
    return NextResponse.json({ error: 'Consent is required.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Confirm the clinic exists (guards against a stale/tampered clinic_id).
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id')
    .eq('id', clinic_id)
    .maybeSingle();

  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found.' }, { status: 404 });
  }

  // If a dentist preference was given, confirm it belongs to this clinic.
  if (dentist_id) {
    const { data: dentist } = await supabase
      .from('dentists')
      .select('id')
      .eq('id', dentist_id)
      .eq('clinic_id', clinic_id)
      .maybeSingle();
    if (!dentist) {
      return NextResponse.json({ error: 'Invalid dentist for this clinic.' }, { status: 400 });
    }
  }

  const now = new Date().toISOString();

  const { error } = await supabase.from('booking_requests').insert({
    clinic_id,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    contact_number: contact_number.trim(),
    email: email?.trim() || null,
    treatment_type,
    requested_date,
    requested_time,
    dentist_id: dentist_id || null,
    notes: notes?.trim() || null,
    consent_given: true,
    consent_given_at: now,
    status: 'pending',
  });

  if (error) {
    console.error('[api/booking/submit] insert failed:', error);
    return NextResponse.json(
      { error: 'Could not submit your request. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}