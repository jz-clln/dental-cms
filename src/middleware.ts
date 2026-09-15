// src/middleware.ts
//
// UPDATE: the staff/is_active check that used to run as a second Supabase
// query on every navigation now checks a short-lived signed cookie first
// (see src/lib/session-cookie.ts). On a cache hit, this function makes
// exactly one network round trip (auth.getUser()) instead of two. On a
// cache miss — first request, expired cookie, or a different user logged
// in on the same browser — it falls back to the original query and
// re-issues the cookie for next time.
//
// TRADE-OFF: deactivating a staff member is no longer enforced on their
// very next request — it takes up to STAFF_SESSION_TTL_SECONDS (5 min,
// in session-cookie.ts) to take effect, since a cookie issued just before
// deactivation is still trusted until it expires.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { signStaffSession, verifyStaffSession, STAFF_SESSION_COOKIE } from '@/lib/session-cookie';

const PUBLIC_ROUTES = ['/login', '/signup', '/verify', '/onboarding', '/api/auth/callback', '/reset-password', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] Missing Supabase env vars.',
      'NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'MISSING'
    );
    const { pathname } = request.nextUrl;
    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );
    if (isPublicRoute || pathname === '/') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: CookieOptions;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );

            supabaseResponse = NextResponse.next({ request });

            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );
    const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
    const isApiRoute = pathname.startsWith('/api/');

    if (pathname === '/') {
      return NextResponse.redirect(
        new URL(user ? '/dashboard' : '/login', request.url)
      );
    }

    if (!user && !isPublicRoute) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user) {
      let hasActiveClinic: boolean;

      const cached = await verifyStaffSession(
        request.cookies.get(STAFF_SESSION_COOKIE.name)?.value,
        user.id
      );

      if (cached) {
        hasActiveClinic = cached.active;
      } else {
        // Cache miss — first request, expired cookie, or a different
        // user logged in on this browser. Same query as before, then
        // re-issue the cookie so the next requests within the TTL skip it.
        const { data: staffRow } = await supabase
          .from('staff')
          .select('id, clinic_id, is_active')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        hasActiveClinic = !!staffRow?.is_active;

        if (staffRow) {
          const token = await signStaffSession({
            uid: user.id,
            sid: staffRow.id,
            cid: staffRow.clinic_id,
            active: !!staffRow.is_active,
          });
          supabaseResponse.cookies.set(STAFF_SESSION_COOKIE.name, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: STAFF_SESSION_COOKIE.maxAge,
          });
        }
      }

      if (!hasActiveClinic && !isOnboardingRoute && !isApiRoute) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      if (hasActiveClinic && (pathname === '/login' || isOnboardingRoute) && !isApiRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return supabaseResponse;
  } catch (err) {
    console.error('[middleware] Supabase client/auth call threw:', err);
    const { pathname } = request.nextUrl;
    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (isPublicRoute || pathname === '/') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};