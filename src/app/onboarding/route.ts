import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();

  // Verify the user is authenticated
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

  // Use service role to bypass RLS
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if staff already exists
  const { data: existingStaff } = await adminClient
    .from('staff')
    .select('id, clinic_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (existingStaff?.clinic_id) {
    return NextResponse.json({ alreadyExists: true });
  }

  // Create clinic
  const { data: clinic, error: clinicError } = await adminClient
    .from('clinics')
    .insert({
      name: clinicName,
      address: address || null,
      contact_number: contactNumber || null,
      email: email || user.email || null,
    })
    .select()
    .single();

  if (clinicError || !clinic) {
    return NextResponse.json({ error: clinicError?.message ?? 'Failed to create clinic' }, { status: 500 });
  }

  // Create staff record
  const { error: staffError } = await adminClient.from('staff').insert({
    clinic_id: clinic.id,
    auth_user_id: user.id,
    email: user.email ?? '',
    full_name: fullName ?? user.email ?? 'Admin',
    role: 'admin',
  });

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}