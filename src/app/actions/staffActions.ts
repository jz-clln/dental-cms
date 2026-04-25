'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface CreateStaffInput {
  clinic_id: string;
  full_name: string;
  email: string;
  password: string;
  role: 'admin' | 'front_desk';
}

export async function createStaffMember(input: CreateStaffInput) {
  // 1. Create the auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (authError) {
    return { error: authError.message };
  }

  const authId = authData.user.id;

  // 2. Insert into staff table with the linked auth UUID
  const { error: dbError } = await supabaseAdmin.from('staff').insert({
    id: authId,
    clinic_id: input.clinic_id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
  });

  if (dbError) {
    // Roll back: delete the auth user so we don't leave orphaned accounts
    await supabaseAdmin.auth.admin.deleteUser(authId);
    return { error: dbError.message };
  }

  return { error: null };
}

export async function deleteStaffMember(staffId: string) {
  // Delete auth user — the staff row cascades via FK or RLS
  const { error } = await supabaseAdmin.auth.admin.deleteUser(staffId);
  if (error) return { error: error.message };
  return { error: null };
}