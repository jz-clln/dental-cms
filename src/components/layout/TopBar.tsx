'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { usePrintSchedule } from '@/lib/hooks/usePrintSchedule';
import { Printer } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/inventory': 'Inventory',
  '/billing': 'Billing',
  '/reports': 'Reports',
  '/settings': 'Settings',
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
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 flex items-center
      justify-between sticky top-0 z-20 gap-3">

      {/* Left: title */}
      <h1 className="text-lg font-semibold text-gray-900 ml-10 md:ml-0 flex-shrink-0">{title}</h1>

      {/* Right: search + actions + avatar */}
      <div className="flex items-center gap-2">

        {/* Global search */}
        <GlobalSearch />

        {/* Print schedule — only on appointments page */}
        {isAppointmentsPage && (
          <button
            onClick={handlePrint}
            disabled={printing}
            title="Print today's schedule"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200
              text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors
              disabled:opacity-50 hidden sm:flex"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Print</span>
          </button>
        )}

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-teal-700 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
