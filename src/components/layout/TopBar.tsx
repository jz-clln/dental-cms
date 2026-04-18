'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';

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

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <h1 className="text-xl font-semibold text-gray-900 ml-8 md:ml-0">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center">
          <span className="text-white text-sm font-medium">A</span>
        </div>
      </div>
    </header>
  );
}
