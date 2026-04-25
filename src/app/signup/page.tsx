'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import { Eye, EyeOff, Loader2, Mail, ArrowLeft, RefreshCw } from 'lucide-react';

type Step = 'form' | 'otp';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown for resend button
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // ── Form validation ─────────────────────────────────────────

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Enter a valid email address.';
    }
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Step 1: Sign up → triggers OTP email ───────────────────

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setErrors({ email: 'This email is already registered. Try signing in instead.' });
      } else {
        setErrors({ general: error.message });
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('otp');
    setResendCountdown(60);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }

  // ── OTP box handlers ────────────────────────────────────────

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setOtpError('');

    // Auto-advance
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit on last digit
    if (index === 5 && digit) {
      const code = [...newOtp.slice(0, 5), digit].join('');
      if (code.length === 6) verifyOtp(code);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => { if (i < 6) newOtp[i] = d; });
    setOtp(newOtp);
    const lastIdx = Math.min(pasted.length - 1, 5);
    otpRefs.current[lastIdx]?.focus();
    if (pasted.length === 6) verifyOtp(pasted);
  }

  // ── Step 2: Verify OTP with Supabase ───────────────────────

  async function verifyOtp(code: string) {
    if (verifying) return;
    setVerifying(true);
    setOtpError('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'signup',
    });

    if (error || !data.user) {
      setOtpError(
        error?.message?.includes('expired')
          ? 'This code has expired. Request a new one below.'
          : 'Incorrect code. Check your email and try again.'
      );
      // Clear and refocus
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
      setVerifying(false);
      return;
    }

    // ✅ Verified — go to onboarding to set up their clinic
    router.push('/onboarding');
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits.');
      return;
    }
    verifyOtp(code);
  }

  async function handleResend() {
    setResendLoading(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setResendCountdown(60);
    setResendLoading(false);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  // ── OTP Screen ─────────────────────────────────────────────

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
                <Mail className="w-8 h-8 text-teal-700" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Enter your code</h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              We sent a 6-digit code to<br />
              <span className="font-semibold text-gray-800">{email}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleManualSubmit} className="space-y-6">

              {/* 6 digit boxes */}
              <div className="flex flex-col items-center gap-4">
                <div
                  className="flex items-center gap-2.5"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(index, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(index, e)}
                      disabled={verifying}
                      aria-label={`Digit ${index + 1}`}
                      className={`
                        text-center text-2xl font-bold rounded-xl border-2
                        focus:outline-none transition-all duration-150
                        disabled:opacity-60 select-none
                        ${verifying ? 'animate-pulse' : ''}
                        ${digit && !otpError
                          ? 'border-teal-500 bg-teal-50 text-teal-800'
                          : otpError
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-teal-500 focus:bg-white'
                        }
                      `}
                      style={{ width: '3rem', height: '3.75rem' }}
                    />
                  ))}
                </div>

                {/* Verifying state */}
                {verifying && (
                  <div className="flex items-center gap-2 text-teal-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Verifying…</span>
                  </div>
                )}

                {/* Error message */}
                {otpError && !verifying && (
                  <p className="text-sm text-red-600 text-center">{otpError}</p>
                )}
              </div>

              {/* Submit — only shows if not auto-verified */}
              {!verifying && (
                <button
                  type="submit"
                  disabled={otp.join('').length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-teal-700
                    hover:bg-teal-800 text-white font-semibold py-3 rounded-xl
                    transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Verify & Continue →
                </button>
              )}

              {/* Resend */}
              <div className="text-center pt-1">
                {resendCountdown > 0 ? (
                  <p className="text-sm text-gray-400">
                    Resend available in{' '}
                    <span className="font-semibold text-gray-600 tabular-nums">
                      {resendCountdown}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="inline-flex items-center gap-1.5 text-sm text-teal-700
                      font-medium hover:underline disabled:opacity-50"
                  >
                    {resendLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />
                    }
                    Resend code
                  </button>
                )}
              </div>
            </form>

            {/* Back */}
            <div className="border-t border-gray-100 mt-5 pt-4 text-center">
              <button
                onClick={() => {
                  setStep('form');
                  setOtp(['', '', '', '', '', '']);
                  setOtpError('');
                }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-400
                  hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different email
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Code expires in 10 minutes · Check spam if you don't see it
          </p>
        </div>
      </div>
    );
  }

  // ── Signup Form ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AppIcon size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Start managing your clinic for free.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Google signup */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg
              border border-gray-200 bg-white text-gray-700 text-sm font-medium
              hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2
              focus:ring-gray-300 disabled:opacity-60 mb-5"
          >
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )
            }
            Sign up with Google
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {errors.general}
              </div>
            )}

            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
                placeholder="Dr. Juan Dela Cruz"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-900
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                  focus:border-transparent transition-colors
                  ${errors.fullName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
              />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="you@clinic.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-900
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                  focus:border-transparent transition-colors
                  ${errors.email ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="Min. 8 characters"
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                    focus:border-transparent transition-colors
                    ${errors.password ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              {password.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      password.length >= i * 3
                        ? password.length < 6 ? 'bg-red-400' : password.length < 10 ? 'bg-amber-400' : 'bg-green-400'
                        : 'bg-gray-100'
                    }`} />
                  ))}
                  <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                    {password.length < 6 ? 'Weak' : password.length < 10 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                  placeholder="Repeat your password"
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                    focus:border-transparent transition-colors
                    ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
            </div>

            <p className="text-xs text-gray-400">
              By signing up you agree to our{' '}
              <span className="text-teal-600 hover:underline cursor-pointer">Terms of Service</span>
              {' '}and{' '}
              <span className="text-teal-600 hover:underline cursor-pointer">Privacy Policy</span>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
                text-white font-medium py-2.5 rounded-lg transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Sending verification code…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-700 font-semibold hover:underline">
              Sign in →
            </Link>
          </p>
        </div>

        <div className="mt-4 bg-white/60 border border-gray-100 rounded-xl px-5 py-3.5 flex items-center gap-3">
          <div className="text-2xl">🦷</div>
          <div>
            <p className="text-xs font-semibold text-gray-700">Free forever — no credit card needed</p>
            <p className="text-xs text-gray-400">50 patients, full features. Upgrade anytime.</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Dental CMS · For clinic use only
        </p>
      </div>
    </div>
  );
}
