'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

type Step = 'form' | 'sent';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Enter a valid email address.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();

    // signInWithOtp with shouldCreateUser: true = creates account if not exists
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setErrors({
          email: 'This email already has an account. Sign in instead.',
        });
      } else {
        setErrors({ general: error.message });
      }
      setLoading(false);
      return;
    }

    setStep('sent');
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  // ── Email sent screen ──────────────────────────────────────
  if (step === 'sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-5">

            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                <Mail className="w-8 h-8 text-teal-700" />
              </div>
            </div>

            {/* Message */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">Almost there, {fullName.split(' ')[0]}!</h2>
              <p className="text-gray-500 text-sm mt-2">
                We sent a magic link to{' '}
                <span className="font-semibold text-gray-800">{email}</span>.
                Click it to create your account — no password needed.
              </p>
            </div>

            {/* Steps */}
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-left space-y-2.5">
              {[
                'Open the email from Dental CMS',
                'Click the "Activate my account" link',
                'Set up your clinic (takes 30 seconds)',
                'You\'re in — start managing your clinic',
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-800 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-teal-800">{s}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs text-gray-400">
              <p>The link expires in 1 hour.</p>
              <p>Check your spam folder if you don't see it.</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setStep('form'); setErrors({}); }}
                className="flex items-center justify-center gap-2 text-sm text-teal-700 font-medium hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Use a different email
              </button>
              <button
                onClick={handleSignup}
                disabled={loading}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Resend the link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Signup form ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AppIcon size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">
            No password needed. We'll send a magic link to your email.
          </p>
        </div>

        {/* Card */}
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

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or sign up with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {errors.general}
              </div>
            )}

            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Your Full Name
              </label>
              <input
                id="fullName"
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
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                  placeholder="you@clinic.com"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                    focus:border-transparent transition-colors
                    ${errors.email ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600">
                  {errors.email}
                  {errors.email.includes('Sign in') && (
                    <Link href="/login" className="font-semibold underline ml-1">Sign in here →</Link>
                  )}
                </p>
              )}
            </div>

            {/* What happens callout */}
            <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
              <Mail className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                We'll send a magic link to this email. Click it to instantly activate your account.
                <span className="font-medium text-gray-700"> No password required, ever.</span>
              </p>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-400 leading-relaxed">
              By signing up you agree to our{' '}
              <span className="text-teal-600 hover:underline cursor-pointer">Terms of Service</span>
              {' '}and{' '}
              <span className="text-teal-600 hover:underline cursor-pointer">Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
                text-white font-medium py-2.5 px-4 rounded-lg transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none
                focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending your link…</>
                : <><Mail className="w-4 h-4" /> Send me a magic link</>
              }
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-700 font-semibold hover:underline">
              Sign in →
            </Link>
          </p>
        </div>

        {/* Free plan callout */}
        <div className="mt-4 bg-white/60 border border-gray-100 rounded-xl px-5 py-3.5 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
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
