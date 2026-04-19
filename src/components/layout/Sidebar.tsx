'use client';

import { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, Package, Receipt, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Stethoscope, Menu, X,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/patients',     label: 'Patients',     icon: Users },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/inventory',    label: 'Inventory',    icon: Package },
  { href: '/billing',      label: 'Billing',      icon: Receipt },
  { href: '/reports',      label: 'Reports',      icon: BarChart3 },
  { href: '/settings',     label: 'Settings',     icon: Settings },
] as const;

const BOTTOM_ITEMS = NAV_ITEMS.slice(0, 5);

// ── Extracted + memoized so it never remounts on sidebar state changes ──
const NavLink = memo(function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        collapsed && 'justify-center',
        active
          ? 'bg-teal-700 text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
});

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleCollapse = useCallback(() => setCollapsed(c => !c), []);

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100',
          // Use width classes instead of transition-all to avoid layout thrash
          collapsed ? 'w-16' : 'w-60'
        )}
        style={{ transition: 'width 250ms ease' }}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-gray-100 overflow-hidden',
          collapsed && 'justify-center px-0'
        )}>
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">Dental CMS</p>
              <p className="text-xs text-gray-400">Clinic Management</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full',
              'text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && 'Log Out'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-gray-400" />
            : <ChevronLeft className="w-3 h-3 text-gray-400" />
          }
        </button>
      </aside>

      {/* ── MOBILE: Hamburger ── */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* ── MOBILE: Drawer — always mounted, toggled via CSS for smooth animation ── */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={closeMobile}
        />

        {/* Drawer panel */}
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col',
            'transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Dental CMS</p>
                <p className="text-xs text-gray-400">Clinic Management</p>
              </div>
            </div>
            <button
              onClick={closeMobile}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                onClick={closeMobile}
              />
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Bottom nav — memoized, stable reference ──
export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex">
      {BOTTOM_ITEMS.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              active ? 'text-teal-700' : 'text-gray-400'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
});