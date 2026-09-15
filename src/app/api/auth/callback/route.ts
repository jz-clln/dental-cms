// src/app/api/auth/callback/route.ts
//
// UPDATE: now selects `is_active` (previously just `id, clinic_id`), and
// on a successful login, immediately signs and sets the `staff-session`
// cookie — see src/lib/session-cookie.ts. This means the very first
// middleware check after login (the redirect to /dashboard below) already
// has a warm cache, instead of doing yet another staff-table query one
// request later.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { signStaffSession, STAFF_SESSION_COOKIE } from '@/lib/session-cookie';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const source = searchParams.get('origin');

  console.log('callback hit — code:', code, 'source:', source);

  if (code) {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log('exchange error:', error);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('user id:', user?.id);

      if (user) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id, clinic_id, is_active')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        console.log('staff:', staff);

        const hasClinic = !!staff?.clinic_id;

        if (source === 'login' && !hasClinic) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=no_account`);
        }

        // Warm the middleware's session cache now, so the very next
        // request doesn't have to hit the staff table again.
        if (staff) {
          const token = await signStaffSession({
            uid: user.id,
            sid: staff.id,
            cid: staff.clinic_id,
            active: !!staff.is_active,
          });
          cookieStore.set(STAFF_SESSION_COOKIE.name, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: STAFF_SESSION_COOKIE.maxAge,
          });
        }

        if (!hasClinic) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}