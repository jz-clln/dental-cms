// src/app/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Middleware handles the normal-case redirect. This exists purely as a
// defense-in-depth fallback — but a fallback that redirects to /dashboard
// unconditionally, with no auth check of its own, isn't actually a
// fallback: if middleware ever doesn't fire, this used to send an
// unauthenticated visitor straight to /dashboard anyway.
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? '/dashboard' : '/login');
}