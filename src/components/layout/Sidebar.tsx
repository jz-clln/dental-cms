'use client';

import { useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, Package, Receipt, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Stethoscope, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// Sidebar context for collapse state
const SidebarContext = createContext({ collapsed: false });

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          active
            ? 'bg-teal-700 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-gray-100',
          collapsed && 'justify-center px-0'
        )}>
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Dental CMS</p>
              <p className="text-xs text-gray-400">Clinic Management</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
              'text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && 'Log Out'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-500" />
          )}
        </button>
      </aside>

      {/* MOBILE: Hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-100"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* MOBILE: Slide-out drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Dental CMS</p>
                  <p className="text-xs text-gray-400">Clinic Management</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Bottom nav for mobile (always visible on small screens)
export function BottomNav() {
  const pathname = usePathname();
  const BOTTOM_ITEMS = NAV_ITEMS.slice(0, 5); // show first 5

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
            <item.icon className={cn('w-5 h-5', active && 'text-teal-700')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
