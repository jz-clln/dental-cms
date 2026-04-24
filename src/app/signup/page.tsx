'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import { Loader2, Mail, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  // Step 1: collect name + email
  // Step 2: code sent, waiting for input
  const [step, setStep] = useState<'form' | 'sent'>('form');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Please enter your full name.';
    if (!email.trim()) e.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Enter a valid email address (e.g. you@gmail.com).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    const supabase = createClient();

    // signInWithOtp sends a real 6-digit code to the exact email entered
    // shouldCreateUser: true means it creates an account if one doesn't exist
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setErrors({ general: error.message });
      setLoading(false);
      return;
    }

    // Save to sessionStorage so verify page can use it
    sessionStorage.setItem('otp_email', email.trim());
    sessionStorage.setItem('otp_full_name', fullName.trim());

    // Go to verify page
    router.push('/verify?type=signup');
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

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
            We'll send a 6-digit code to your email to verify it.
          </p>
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
            Continue with Google
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

          <form onSubmit={handleSendCode} className="space-y-4">

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {errors.general}
              </div>
            )}

            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={e => {
                  setFullName(e.target.value);
                  setErrors(p => ({ ...p, fullName: '' }));
                }}
                placeholder="Dr. Juan Dela Cruz"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-900
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                  focus:border-transparent transition-colors
                  ${errors.fullName
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'}`}
              />
              {errors.fullName && (
                <p className="text-xs text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Email — this is the email the code will be sent to */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setErrors(p => ({ ...p, email: '' }));
                  }}
                  placeholder="you@gmail.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                    focus:border-transparent transition-colors
                    ${errors.email
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email}</p>
              )}
              {email && !errors.email && (
                <p className="text-xs text-teal-600 flex items-center gap-1">
                  <span>✓</span> We'll send the code to <strong>{email.trim()}</strong>
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
                text-white font-semibold py-2.5 px-4 rounded-xl transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
                focus:ring-teal-500 focus:ring-offset-1 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code to {email.trim()}…</>
                : <><Mail className="w-4 h-4" /> Send Verification Code <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-700 font-semibold hover:underline">
              Sign in →
            </Link>
          </p>
        </div>

        {/* Trust line */}
        <div className="mt-4 bg-white/70 border border-gray-100 rounded-xl px-5 py-3.5 flex items-center gap-3">
          <span className="text-2xl">🦷</span>
          <div>
            <p className="text-xs font-semibold text-gray-700">Free — no credit card needed</p>
            <p className="text-xs text-gray-400">50 patients included. Upgrade anytime.</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Dental CMS · dental-cms-ph.vercel.app
        </p>
      </div>
    </div>
  );
}
