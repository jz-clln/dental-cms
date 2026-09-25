// src/lib/supabase/admin.ts
//
// Server-only Supabase client using the service role key. This bypasses
// Row Level Security entirely, so it must NEVER be imported into a
// 'use client' component or anything that ships to the browser — only
// from Server Components, Route Handlers (src/app/api/**/route.ts), or
// Server Actions.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in your server env (Supabase
// dashboard → Project Settings → API → service_role key). Do NOT prefix
// it with NEXT_PUBLIC_ — that would ship it to the browser.

import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      '[supabase/admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}