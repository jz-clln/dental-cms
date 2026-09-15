// src/components/layout/Sidebar.tsx
//
// FIXES APPLIED (REVISION 2 — reverting to Geist everywhere):
// - Per updated direction: no serif anywhere in the app. The clinic name
//   was switched to `font-display` in the previous pass — reverted back
//   to `font-sans`, with `font-semibold` added (instead of relying on
//   tracking-display, which was tuned specifically for Fraunces' tighter
//   serif metrics and has no purpose on a sans font) so the brand name
//   still reads with clear visual weight against the subtitle beneath it.
// - Applied to both the desktop header and mobile drawer.
// - `bg-[#0F766E]` was a magic hex value that happens to equal exactly
//   your `teal-700` token — but written as an arbitrary value, it won't
//   track if that token ever changes. Replaced with `bg-teal-700`.
// - `text-gray-900` → `text-ink-900` on primary brand text, per your
//   config's own stated reason for the ink palette existing.
// - Borders/hover states swapped from flat `gray-*` to your warm
//   `porcelain-*` scale for consistency with the rest of the chrome.
// - Nav link transitions get `ease-out-quint` instead of default linear
//   easing.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, Package, Receipt,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { AppIcon } from '@/components/ui/ToothLogo';
import { TrialCountdown } from '@/components/trial/TrialCountdown';

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/patients',     label: 'Patients',     icon: Users },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/inventory',    label: 'Inventory',    icon: Package },
  { href: '/billing',      label: 'Billing',      icon: Receipt },
  { href: '/reports',      label: 'Reports',      icon: BarChart3 },
  { href: '/settings',     label: 'Settings',     icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clinicName, setClinicName] = useState('Dental CMS');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function loadClinic() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: staff } = await supabase
        .from('staff').select('clinic_id').eq('auth_user_id', user.id).single();
      if (!staff) return;
      const { data: clinic } = await supabase
        .from('clinics').select('name, logo_url').eq('id', staff.clinic_id).single();
      if (clinic) {
        setClinicName(clinic.name);
        setLogoUrl((clinic as any).logo_url ?? null);
      }
    }
    loadClinic();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const NavLink = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 ease-out-quint',
          active
            ? 'bg-teal-700 text-white shadow-sm'
            : 'text-gray-600 hover:bg-porcelain-100 hover:text-ink-900'
        )}
      >
        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const BrandHeader = ({ showFull = true }: { showFull?: boolean }) => (
    <div className={cn(
      'flex items-center gap-3 px-4 py-5 border-b border-porcelain-200',
      !showFull && 'justify-center px-0'
    )}>
      <AppIcon size="sm" clinicName={clinicName} />
      {showFull && (
        <div className="min-w-0">
          <p className="text-sm font-sans font-semibold text-ink-900 leading-tight truncate">{clinicName}</p>
          <p className="text-xs text-gray-400">Clinic Management</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-porcelain-200 transition-all duration-300 ease-out-quint font-sans',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <BrandHeader showFull={!collapsed} />

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => <NavLink key={item.href} item={item} />)}
        </nav>

        {/* Trial countdown — hidden when collapsed */}
        {!collapsed && <TrialCountdown />}

        <div className="p-3 border-t border-porcelain-200">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium',
              'text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && 'Log Out'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-porcelain-200
            shadow-sm flex items-center justify-center hover:bg-porcelain-50 transition-colors active:animate-press"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-gray-500" />
            : <ChevronLeft className="w-3 h-3 text-gray-500" />}
        </button>
      </aside>

      {/* MOBILE: Hamburger */}
      <button
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-white shadow-card border border-porcelain-200 active:animate-press font-sans"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* MOBILE: Drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 shadow-card-hover flex flex-col animate-in font-sans">
            <div className="flex items-center justify-between px-4 py-5 border-b border-porcelain-200">
              <div className="flex items-center gap-3">
                <AppIcon size="sm" clinicName={clinicName} />
                <div>
                  <p className="text-sm font-sans font-semibold text-ink-900 truncate max-w-[140px]">{clinicName}</p>
                  <p className="text-xs text-gray-400">Clinic Management</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="active:animate-press">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(item => <NavLink key={item.href} item={item} />)}
            </nav>

            {/* Trial countdown in mobile drawer */}
            <TrialCountdown />

            <div className="p-3 border-t border-porcelain-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium
                  text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut className="w-[18px] h-[18px]" /> Log Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const BOTTOM_ITEMS = NAV_ITEMS.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-porcelain-200 z-30 flex font-sans">
      {BOTTOM_ITEMS.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors duration-200 ease-out-quint',
              active ? 'text-teal-700' : 'text-gray-400'
            )}
          >
            <item.icon className={cn('w-5 h-5', active && 'text-teal-700')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}