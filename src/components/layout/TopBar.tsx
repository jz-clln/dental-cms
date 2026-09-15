// src/components/layout/TopBar.tsx
//
// FIXES APPLIED (REVISION 2 — reverting to Geist everywhere):
// - The page title goes back to `font-sans font-semibold text-ink-900`.
//   `tracking-display` (negative letter-spacing tuned for Fraunces) is
//   dropped — Geist doesn't need it and it was making the title sit
//   slightly too tight for a sans face.
// - Chrome background stays on `porcelain-50`/`porcelain-200`/
//   `porcelain-300` — that part had nothing to do with the font issue.
// - Print button keeps `active:animate-press` and `ease-out-quint`.
//
// FIX (REVISION 3): removed the redundant unprefixed `flex` from the
// print button's className. It conflicted with the unprefixed `hidden`
// on the same element — both applied at the base breakpoint, so
// Tailwind couldn't resolve which display value should win. The
// intended responsive behavior (hidden below `sm`, flex at `sm+`) is
// fully expressed by `hidden sm:flex` alone.
//
// FIX (REVISION 4): the title's `ml-12` on mobile existed only to leave
// room for Sidebar's old fixed hamburger button, which sat on top of the
// header at `left-4`. That hamburger was removed when the mobile drawer
// was dropped in favor of the bottom nav, so the offset was just dead
// space pushing the title away from the left edge. Removed `ml-12
// md:ml-0` entirely — the title now sits flush left on every width.
// Also dropped the fixed-width wrapper that used to sit around
// `<GlobalSearch />` (`w-[130px] sm:w-auto`): GlobalSearch now sizes
// itself (icon-only on mobile until tapped, fixed width at sm+), so an
// outer width constraint here would only fight with that.
//
// FIX (REVISION 5): title was still capped at `max-w-[120px]` on mobile
// (e.g. "Appointments" → "Appointme…"), left over from when the search
// bar was a fixed 130px next to it. Now that the collapsed search is just
// an icon, that room exists again — swapped `flex-shrink-0 max-w-[120px]`
// for `flex-1 min-w-0`, so the title fills whatever space the icons
// don't need instead of a hardcoded cap.
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { usePrintSchedule } from '@/lib/hooks/usePrintSchedule';
import { Printer } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/patients':     'Patients',
  '/appointments': 'Appointments',
  '/inventory':    'Inventory',
  '/billing':      'Billing',
  '/reports':      'Reports',
  '/settings':     'Settings',
};

function getTitle(pathname: string): string {
  if (pathname.startsWith('/patients/new')) return 'New Patient';
  if (pathname.startsWith('/patients/')) return 'Patient Profile';
  if (pathname.startsWith('/appointments/new')) return 'New Appointment';
  for (const [key, val] of Object.entries(PAGE_TITLES)) {
    if (pathname === key || pathname.startsWith(key + '/')) return val;
  }
  return 'Dental CMS';
}

export function TopBar() {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const { printSchedule } = usePrintSchedule();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState('A');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const url = user.user_metadata?.avatar_url;
      const name = user.user_metadata?.full_name ?? user.email ?? '';
      setAvatarUrl(url ?? null);
      setInitials(
        name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'A'
      );
    }
    loadUser();
  }, []);

  async function handlePrint() {
    setPrinting(true);
    await printSchedule();
    setPrinting(false);
  }

  const isAppointmentsPage = pathname === '/appointments' || pathname.startsWith('/appointments');

  return (
    <header className="bg-porcelain-50 border-b border-porcelain-200 px-4 md:px-6 py-3.5 flex items-center
      justify-between sticky top-0 z-30 gap-3 font-sans">

      {/* Left: page title — sits flush left now that the old floating hamburger is gone.
          flex-1 + min-w-0 lets it claim whatever room the (now icon-sized, not 130px)
          search and bell leave it, instead of the old fixed 120px cap that was cutting
          "Appointments" off on mobile. `truncate` stays on only as a safety net for an
          unrealistically long title — none of the current ones come close to needing it. */}
      <h1 className="text-lg font-sans font-semibold text-ink-900 flex-1 min-w-0 truncate">{title}</h1>

      {/* Right: search + print + bell + avatar */}
      <div className="flex items-center gap-3 md:gap-2 min-w-0">

        {/* Global search — icon-only on mobile until tapped, sizes itself */}
        <GlobalSearch />

        {/* Print schedule — only on appointments page */}
        {isAppointmentsPage && (
          <button
            onClick={handlePrint}
            disabled={printing}
            title="Print today's schedule"
            className="items-center gap-1.5 px-3 py-2 rounded-lg border border-porcelain-300
              text-sm text-gray-600 hover:bg-porcelain-100 hover:text-ink-900 transition-colors duration-200 ease-out-quint
              disabled:opacity-50 hidden sm:flex active:animate-press"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Print</span>
          </button>
        )}

        {/* Live notifications bell */}
        <NotificationsBell />

      </div>
    </header>
  );
}