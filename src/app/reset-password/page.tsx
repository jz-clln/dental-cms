'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    if (errorParam) {
      setInvalidLink(true);
      setError(errorDesc?.replace(/\+/g, ' ') || 'This reset link is invalid or has expired.');
    }

    const timer = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setInvalidLink(true);
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/dashboard'), 2500);
  }

  // ── Success ──
  if (success) {
    return (
      <div className="bg-gray-50 rounded-xl px-4 py-5 flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="w-8 h-8 text-teal-600" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Password updated!</p>
          <p className="text-xs text-gray-400 mt-0.5">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Invalid link ──
  if (invalidLink) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 rounded-xl px-4 py-5 flex flex-col items-center gap-3 text-center border border-red-100">
          <XCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Link expired or invalid</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {error || 'This reset link has expired or already been used.'}
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
            text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  // ── Verifying ──
  if (!sessionReady) {
    return (
      <div className="bg-gray-50 rounded-xl px-4 py-6 flex flex-col items-center gap-3 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <p className="text-sm text-gray-400">Verifying your reset link…</p>
      </div>
    );
  }

  // ── Form ──
  return (
    <form onSubmit={handleReset} className="space-y-5">
      <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
        <p className="text-xs text-gray-500">Choose a strong password — at least 8 characters.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full px-3.5 py-2.5 pr-11 rounded-lg border border-gray-200 text-sm text-gray-900
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
              focus:border-transparent transition-colors hover:border-gray-300"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium text-gray-700">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirm"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full px-3.5 py-2.5 pr-11 rounded-lg border border-gray-200 text-sm text-gray-900
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
              focus:border-transparent transition-colors hover:border-gray-300"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPassword && (
          <p className={`text-xs mt-0.5 ${password === confirmPassword ? 'text-teal-600' : 'text-red-500'}`}>
            {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800
          text-white font-medium py-2.5 px-4 rounded-lg transition-colors
          disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2
          focus:ring-teal-500 focus:ring-offset-1"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Updating…' : 'Set New Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AppIcon size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
            <p className="text-sm text-gray-400 mt-1">Choose a strong password for your account</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <ResetPasswordContent />

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Dental CMS
          </p>
        </div>
      </div>
    </Suspense>
  );
}