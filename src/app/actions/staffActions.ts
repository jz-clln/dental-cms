'use server';

import { createClient } from '@supabase/supabase-js';
import { limitsForPlan, FREE_LIMITS, TRIAL_LIMITS } from '@/lib/planLimits';

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

async function getStaffLimit(clinicId: string): Promise<number> {
  const [statusRes, clinicRes] = await Promise.all([
    supabaseAdmin
      .from('clinic_status')
      .select('trial_ends_at, subscription_status')
      .eq('clinic_id', clinicId)
      .maybeSingle(),
    supabaseAdmin
      .from('clinics')
      .select('plan')
      .eq('id', clinicId)
      .maybeSingle(),
  ]);

  const clinicStatus = statusRes.data;

  if (clinicStatus?.subscription_status === 'active') {
    return limitsForPlan(clinicRes.data?.plan ?? null).staff;
  }

  const now = new Date();
  const trialEndsAt = clinicStatus?.trial_ends_at ? new Date(clinicStatus.trial_ends_at) : null;
  const isTrialing =
    clinicStatus?.subscription_status === 'trial' &&
    (trialEndsAt ? now < trialEndsAt : true);

  return isTrialing ? TRIAL_LIMITS.staff : FREE_LIMITS.staff;
}

export async function createStaffMember(input: CreateStaffInput) {
  // Server-side cap enforcement. This is the layer that actually can't be
  // bypassed — the StaffPanel UI check is convenience only, since this
  // action can be invoked directly regardless of what the client renders.
  const [{ count }, limit] = await Promise.all([
    supabaseAdmin
      .from('staff')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', input.clinic_id),
    getStaffLimit(input.clinic_id),
  ]);

  if ((count ?? 0) >= limit) {
    return { error: `Staff limit reached (${limit}). Upgrade your plan to add more.` };
  }

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
  //    FIX: auth_user_id must be set explicitly — useClinicId() queries
  //    staff by auth_user_id, and it was never being populated before.
  const { error: dbError } = await supabaseAdmin.from('staff').insert({
    id: authId,
    auth_user_id: authId,
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