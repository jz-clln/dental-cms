// src/app/api/onboarding/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { clinicName, address, contactNumber, email, fullName } = body;

  if (!clinicName || !clinicName.trim()) {
    return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 });
  }

  // FIX: this used to insert trial_started_at/trial_ends_at directly into
  // `clinics`, which no longer has those columns — they live on
  // clinic_status now. That was the actual cause of the 500.
  //
  // FIX: this also used to be three separate inserts (clinic, then staff,
  // with no clinic_status write at all) via the service_role client, with
  // no rollback if a later step failed. Delegating to a SECURITY DEFINER
  // RPC makes clinic + clinic_status + staff creation atomic — all three
  // succeed together or none of them stick — which is exactly what
  // prevents the "orphaned clinic, no staff row" state you hit. It also
  // means this route no longer needs the service_role key at all: the
  // RPC runs with the calling user's session and elevates its own
  // privileges internally, tightly scoped to just this operation.
  const { data: clinicId, error: rpcError } = await supabase.rpc(
    'create_clinic_for_new_user',
    {
      p_name: clinicName,
      p_address: address || null,
      p_contact_number: contactNumber || null,
      p_email: email || user.email || null,
      p_full_name: fullName || null,
    }
  );

  if (rpcError) {
    if (rpcError.message.includes('already linked')) {
      return NextResponse.json({ alreadyExists: true });
    }
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, clinicId });
}