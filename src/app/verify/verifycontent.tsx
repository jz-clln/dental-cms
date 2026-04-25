'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import {
  Loader2, Mail, RefreshCw, CheckCircle, ArrowLeft,
} from 'lucide-react';

export default function VerifyContent() {
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

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyErr) {
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

    setSuccess(true);

    setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      if (fullName) {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }

      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('otp_full_name');

      const { data: staff } = await supabase
        .from('staff')
        .select('id, clinic_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!staff?.clinic_id) {
        router.push('/onboarding');
      } else {
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Email verified! Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <AppIcon size="lg" />

        <h1 className="text-xl font-bold">Enter your code</h1>
        <p className="text-sm text-gray-500">{email}</p>

        <div className="flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el; }}
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="w-10 h-12 border text-center text-lg"
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={() => verify()}
          disabled={loading}
          className="w-full bg-teal-600 text-white py-2 rounded"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        {canResend ? (
          <button onClick={handleResend} className="text-sm text-blue-500">
            Resend Code
          </button>
        ) : (
          <p className="text-sm text-gray-400">Resend in {countdown}s</p>
        )}
      </div>
    </div>
  );
}