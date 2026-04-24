'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import {
  Loader2, Mail, RefreshCw, CheckCircle, ArrowLeft,
} from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') ?? 'signup') as 'signup' | 'magiclink';

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem('otp_email');
    const storedName = sessionStorage.getItem('otp_full_name');
    if (!stored) {
      router.push('/signup');
      return;
    }
    setEmail(stored);
    setFullName(storedName ?? '');
    startCountdown();
    setTimeout(() => refs.current[0]?.focus(), 100);
  }, []);

  function startCountdown() {
    setCanResend(false);
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(iv); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function handleDigit(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError('');

    if (d && i < 5) {
      refs.current[i + 1]?.focus();
    }
    if (d && i === 5) {
      const code = [...next].join('');
      if (code.length === 6) verify(code);
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (!digits[i] && i > 0) {
        const next = [...digits];
        next[i - 1] = '';
        setDigits(next);
        refs.current[i - 1]?.focus();
      } else {
        const next = [...digits];
        next[i] = '';
        setDigits(next);
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs.current[5]?.focus();
      verify(pasted);
    }
  }

  async function verify(code?: string) {
    const token = code ?? digits.join('');
    if (token.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = createClient();

    // verifyOtp with type 'email' works for signInWithOtp flow
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyErr) {
      // Try 'signup' type as fallback
      const { error: signupErr } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (signupErr) {
        setError('Incorrect code or it has expired. Request a new one below.');
        setDigits(['', '', '', '', '', '']);
        refs.current[0]?.focus();
        setLoading(false);
        return;
      }
    }

    // ✅ Verified successfully
    setSuccess(true);

    setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Update user metadata with full name if we have it
      if (fullName) {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }

      // Clean up session storage
      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('otp_full_name');

      // Check if clinic already set up
      const { data: staff } = await supabase
        .from('staff')
        .select('id, clinic_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!staff?.clinic_id) {
        router.push('/onboarding');
      } else {
        // Already has clinic — go straight to their dashboard
        router.push('/dashboard');
      }
    }, 1500);
  }

  async function handleResend() {
    if (!canResend || resending) return;
    setResending(true);
    setError('');
    setDigits(['', '', '', '', '', '']);

    const supabase = createClient();

    // Resend OTP to the same email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });

    if (error) {
      setError('Could not resend. Please wait and try again.');
    } else {
      startCountdown();
      setTimeout(() => refs.current[0]?.focus(), 100);
    }
    setResending(false);
  }

  // ── Success screen ─────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Email verified!</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Setting up your clinic dashboard…
            </p>
          </div>
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ── Main OTP screen ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AppIcon size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Enter your code</h1>
          <p className="text-gray-500 text-sm mt-1">
            We sent a 6-digit code to
          </p>
          {/* Show the EXACT email the code was sent to */}
          <div className="inline-flex items-center gap-2 mt-2 bg-teal-50 border border-teal-100
            rounded-full px-4 py-1.5">
            <Mail className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-teal-800">{email}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

          {/* 6 digit inputs */}
          <div>
            <div className="flex gap-2 sm:gap-3 justify-center">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { refs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-bold
                    rounded-xl border-2 focus:outline-none transition-all duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${error
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : d
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 text-gray-900 hover:border-teal-300'
                    }
                    focus:border-teal-500 focus:ring-2 focus:ring-teal-100`}
                />
              ))}
            </div>

            {error && (
              <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
                <p className="text-sm font-medium text-center">{error}</p>
              </div>
            )}
          </div>

          {/* Verify button */}
          <button
            onClick={() => verify()}
            disabled={loading || digits.join('').length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
              text-white font-semibold py-3 rounded-xl transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
              : 'Verify & Continue'
            }
          </button>

          {/* Resend */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">Didn't receive the code?</p>
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold
                  text-teal-700 hover:underline disabled:opacity-50"
              >
                {resending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />
                }
                {resending ? 'Resending…' : `Resend code to ${email}`}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend in{' '}
                <span className="font-bold text-gray-700 tabular-nums w-8 inline-block">
                  {countdown}s
                </span>
              </p>
            )}
          </div>

          {/* Help tips */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">Can't find the email?</p>
            <ul className="space-y-1.5">
              {[
                `Check if ${email} is correct`,
                'Look in your Spam or Junk folder',
                'The code is valid for 10 minutes',
                'Gmail sometimes delays — wait 30 seconds',
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs text-amber-700">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Back to signup */}
          <button
            onClick={() => router.push('/signup')}
            className="flex items-center gap-1.5 text-sm text-gray-400
              hover:text-gray-600 transition-colors mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Use a different email address
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dental CMS · dental-cms-ph.vercel.app
        </p>
      </div>
    </div>
  );
}
