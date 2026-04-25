import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

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
          .select('id, clinic_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        console.log('staff:', staff);

        const hasClinic = !!staff?.clinic_id;

        if (source === 'login' && !hasClinic) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=no_account`);
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