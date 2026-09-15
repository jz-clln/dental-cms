// src/components/legal/CookieBanner.tsx
//
// Deliberately a NOTICE, not a consent manager with Accept/Reject/Manage
// toggles. As of this writing the app only sets strictly-necessary
// cookies (Supabase auth + the staff-session cache in
// src/lib/session-cookie.ts), which are exempt from opt-in consent
// requirements under GDPR/ePrivacy — disclosure is sufficient. If you
// later add analytics, ads, or any other non-essential cookie, this
// component needs to be upgraded to a real opt-in consent manager with
// category toggles — a "Got it" button would no longer be legally
// sufficient at that point.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { hasSeenCookieNotice, dismissCookieNotice } from '@/lib/cookie-consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Checked client-side only, after mount — the server always renders
    // nothing, so there's no hydration mismatch and no flash either way.
    if (!hasSeenCookieNotice()) {
      setVisible(true);
    }
  }, []);

  function handleDismiss() {
    dismissCookieNotice();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] border-t border-porcelain-200 bg-white
        shadow-card-hover animate-in fade-in-0 duration-300"
      role="region"
      aria-label="Cookie notice"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-ink-700 leading-snug">
            We use a small number of strictly necessary cookies to keep you signed in and
            your session secure. We don&apos;t use analytics or advertising cookies.{' '}
            <Link href="/cookie-policy" className="text-teal-700 font-medium hover:underline">
              Learn more
            </Link>
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button variant="primary" size="sm" onClick={handleDismiss}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}