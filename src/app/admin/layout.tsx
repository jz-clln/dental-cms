'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldAlert, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email && user.email === ADMIN_EMAIL) {
        setStatus('authorized');
      } else {
        setStatus('unauthorized');
      }
    }
    check();
  }, []);

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Unauthorized ──
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-500">
            This area is restricted. You are not signed in as an authorized admin.
          </p>
          <a
            href="/dashboard"
            className="mt-2 text-sm text-teal-700 hover:underline font-medium"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ── Authorized ──
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-teal-700" />
          <span className="font-semibold text-gray-900">Bitey Admin</span>
        </div>
        <span className="text-xs text-gray-400">{ADMIN_EMAIL}</span>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}