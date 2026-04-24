'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import { Loader2, Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get email from sessionStorage (set during signup)
    const storedEmail = sessionStorage.getItem('otp_email');
    if (!storedEmail) {
      router.push('/signup');
      return;
    }
    setEmail(storedEmail);

    // Start countdown for resend
    startCountdown();

    // Focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  function startCountdown() {
    setCanResend(false);
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function handleInput(index: number, value: string) {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5) {
      const fullCode = [...newCode].join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      verifyCode(pasted);
    }
  }

  async function verifyCode(fullCode?: string) {
    const codeToVerify = fullCode ?? code.join('');
    if (codeToVerify.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = createClient();

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: codeToVerify,
      type: 'signup',
    });

    if (verifyError) {
      setError('Invalid or expired code. Please try again or request a new one.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setLoading(false);
      return;
    }

    // Verification successful
    setSuccess(true);

    // Small delay for the success animation, then check if they need onboarding
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Check if staff record exists already
      const { data: staff } = await supabase
        .from('staff')
        .select('id, clinic_id')
        .eq('auth_user_id', user.id)
        .single();

      // Clean up sessionStorage
      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('otp_full_name');
      sessionStorage.removeItem('otp_password');

      if (!staff || !staff.clinic_id) {
        // New user — set up clinic
        router.push('/onboarding');
      } else {
        // Already has a clinic — go directly to their dashboard
        router.push('/dashboard');
      }
    }, 1500);
  }

  async function handleResend() {
    if (!canResend || resending) return;
    setResending(true);
    setError('');
    setCode(['', '', '', '', '', '']);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      setError('Failed to resend code. Please wait a moment and try again.');
    } else {
      startCountdown();
      inputRefs.current[0]?.focus();
    }
    setResending(false);
  }

  // ── Success state ─────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center
              animate-in zoom-in-50 duration-500">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Email verified!</h2>
            <p className="text-gray-500 mt-1">Setting up your clinic dashboard…</p>
          </div>
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ── Main verify screen ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AppIcon size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-500 text-sm mt-1">
            We sent a 6-digit code to
          </p>
          <p className="font-semibold text-gray-800 text-sm mt-0.5 flex items-center justify-center gap-1.5">
            <Mail className="w-4 h-4 text-teal-600" />
            {email}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

          {/* Code inputs */}
          <div>
            <p className="text-sm font-medium text-gray-700 text-center mb-4">
              Enter the 6-digit verification code
            </p>
            <div className="flex gap-2.5 justify-center">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 
                    focus:outline-none transition-all duration-150 bg-white
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${digit
                      ? 'border-teal-500 text-teal-700 bg-teal-50'
                      : 'border-gray-200 text-gray-900 hover:border-gray-300'
                    }
                    ${error ? 'border-red-300 bg-red-50' : ''}
                    focus:border-teal-500 focus:ring-2 focus:ring-teal-100`}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-center text-sm text-red-600 mt-3 font-medium">{error}</p>
            )}
          </div>

          {/* Verify button */}
          <button
            onClick={() => verifyCode()}
            disabled={loading || code.join('').length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
              text-white font-semibold py-3 rounded-xl transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2
              focus:ring-teal-500 focus:ring-offset-1"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
              : 'Verify Email'
            }
          </button>

          {/* Resend section */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">Didn't receive the code?</p>
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-1.5 text-sm text-teal-700 font-semibold
                  hover:underline mx-auto disabled:opacity-50"
              >
                {resending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />
                }
                {resending ? 'Resending…' : 'Resend Code'}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend in{' '}
                <span className="font-semibold text-gray-600 tabular-nums">{countdown}s</span>
              </p>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Can't find the email?</p>
            <ul className="space-y-1">
              {[
                'Check your Spam or Junk folder',
                'Make sure you entered the right email',
                'The code expires in 10 minutes',
              ].map(tip => (
                <li key={tip} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Back */}
          <button
            onClick={() => router.push('/signup')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600
              transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Use a different email
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dental CMS · dental-cms-ph.vercel.app
        </p>
      </div>
    </div>
  );
}
