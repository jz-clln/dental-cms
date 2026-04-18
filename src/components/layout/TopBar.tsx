'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell } from 'lucide-react';
import { toast } from 'sonner'; // or your toast lib

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

  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // ── Fetch existing unread count on mount ────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function fetchUnread() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.length);
      }
    }

    fetchUnread();
  }, []);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as any;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
          toast.info(newNotif.title, {
            description: newNotif.message ?? undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Mark all as read ────────────────────────────────────────────────────────
  async function handleBellClick() {
    setDropdownOpen((prev) => !prev);

    if (unreadCount > 0) {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials =
    user?.user_metadata?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2) ?? 'A';

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <h1 className="text-xl font-semibold text-gray-900 ml-8 md:ml-0">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* ── Bell with badge + dropdown ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Bell className="w-5 h-5" />

            {/* Badge */}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                {notifications.length > 0 && (
                  <span className="text-xs text-gray-400">{notifications.length} total</span>
                )}
              </div>

              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <li className="px-4 py-6 text-center text-sm text-gray-400">
                    No notifications yet
                  </li>
                ) : (
                  notifications.map((n, i) => (
                    <li
                      key={n.id ?? i}
                      className={`px-4 py-3 text-sm transition-colors ${
                        n.read ? 'bg-white text-gray-500' : 'bg-teal-50 text-gray-800'
                      }`}
                    >
                      <p className="font-medium">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      {n.created_at && (
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── Avatar ── */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover ring-2 ring-teal-100"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center">
            <span className="text-white text-sm font-medium">{initials}</span>
          </div>
        )}
      </div>
    </header>
  );
}