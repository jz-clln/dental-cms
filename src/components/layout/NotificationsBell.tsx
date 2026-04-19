'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bell, Package, Calendar, AlertCircle, Check, CheckCheck, X, Loader2 } from 'lucide-react';
import { cn, formatPeso } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'low_stock' | 'appointment' | 'balance';
  read: boolean;
  href?: string;
  created_at: string;
}

const TYPE_CONFIG = {
  low_stock:   { icon: Package,      bg: 'bg-red-100',    color: 'text-red-600',    label: 'Inventory' },
  appointment: { icon: Calendar,     bg: 'bg-blue-100',   color: 'text-blue-600',   label: 'Appointment' },
  balance:     { icon: AlertCircle,  bg: 'bg-amber-100',  color: 'text-amber-600',  label: 'Balance' },
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Get clinic ID once on mount
  useEffect(() => {
    async function getClinic() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('staff').select('clinic_id').eq('auth_user_id', user.id).single();
      if (data) setClinicId(data.clinic_id);
    }
    getClinic();
  }, []);

  // Load notifications from DB
  const loadNotifications = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [clinicId]);

  // Generate fresh notifications by scanning DB
  const generateNotifications = useCallback(async () => {
    if (!clinicId) return;
    setGenerating(true);
    const supabase = createClient();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Get next hour window for upcoming appointments
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const timeNow = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const timeHour = `${inOneHour.getHours().toString().padStart(2, '0')}:${inOneHour.getMinutes().toString().padStart(2, '0')}`;

    const [inventoryRes, appointmentsRes, billRes, payRes, patientsRes] = await Promise.all([
      supabase.from('inventory_items').select('item_name, quantity, reorder_level'),
      supabase.from('appointments')
        .select('*, patient:patients(first_name, last_name)')
        .eq('appointment_date', todayStr)
        .in('status', ['Scheduled', 'Confirmed'])
        .gte('appointment_time', timeNow)
        .lte('appointment_time', timeHour),
      supabase.from('billing').select('patient_id, amount_charged'),
      supabase.from('payments').select('patient_id, amount_paid'),
      supabase.from('patients').select('id, first_name, last_name').eq('archived', false),
    ]);

    const toInsert: Omit<Notification, 'id' | 'created_at'>[] = [];

    // 1. Low stock alerts
    for (const item of inventoryRes.data ?? []) {
      if (item.quantity <= item.reorder_level) {
        toInsert.push({
          clinic_id: clinicId,
          title: 'Low Stock Alert',
          body: `${item.item_name} is running low (${item.quantity} remaining, reorder at ${item.reorder_level}).`,
          type: 'low_stock',
          read: false,
          href: '/inventory',
        } as any);
      }
    }

    // 2. Upcoming appointments (next hour)
    for (const appt of appointmentsRes.data ?? []) {
      const patientName = appt.patient
        ? `${appt.patient.first_name} ${appt.patient.last_name}`
        : 'A patient';
      toInsert.push({
        clinic_id: clinicId,
        title: 'Upcoming Appointment',
        body: `${patientName} has a ${appt.treatment_type} appointment starting soon.`,
        type: 'appointment',
        read: false,
        href: `/appointments?id=${appt.id}`,
      } as any);
    }

    // 3. Overdue balances (balance > 0)
    const billing = billRes.data ?? [];
    const payments = payRes.data ?? [];
    const patients = patientsRes.data ?? [];

    const balanceMap: Record<string, number> = {};
    for (const b of billing) {
      balanceMap[b.patient_id] = (balanceMap[b.patient_id] ?? 0) + b.amount_charged;
    }
    for (const p of payments) {
      balanceMap[p.patient_id] = (balanceMap[p.patient_id] ?? 0) - p.amount_paid;
    }

    for (const [patientId, balance] of Object.entries(balanceMap)) {
      if (balance > 0) {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) continue;
        toInsert.push({
          clinic_id: clinicId,
          title: 'Outstanding Balance',
          body: `${patient.first_name} ${patient.last_name} has an unpaid balance of ${formatPeso(balance)}.`,
          type: 'balance',
          read: false,
          href: `/billing`,
        } as any);
      }
    }

    // Clear old unread notifications of same types then insert fresh ones
    if (toInsert.length > 0) {
      await supabase
        .from('notifications')
        .delete()
        .eq('clinic_id', clinicId)
        .eq('read', false);

      await supabase.from('notifications').insert(toInsert);
    }

    await loadNotifications();
    setGenerating(false);
  }, [clinicId, loadNotifications]);

  // Load on mount and when clinicId is ready
  useEffect(() => {
    if (clinicId) loadNotifications();
  }, [clinicId, loadNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${clinicId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, loadNotifications]);

  async function markAllRead() {
    if (!clinicId) return;
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('clinic_id', clinicId)
      .eq('read', false);
    loadNotifications();
  }

  async function markOneRead(id: string) {
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function deleteOne(id: string) {
    const supabase = createClient();
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  function handleClickNotification(n: Notification) {
    markOneRead(n.id);
    if (n.href) router.push(n.href);
    setOpen(false);
  }

  function getRelativeTime(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => {
          setOpen(v => !v);
          if (!open && clinicId) generateNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1',
            'bg-red-500 text-white text-[10px] font-bold rounded-full',
            'flex items-center justify-center leading-none',
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {generating && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-teal-500 rounded-full
            flex items-center justify-center">
            <Loader2 className="w-2 h-2 text-white animate-spin" />
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl
          border border-gray-100 shadow-2xl z-50 overflow-hidden animate-in">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-teal-700 hover:underline font-medium px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading || generating ? (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {generating ? 'Checking for alerts…' : 'Loading…'}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">You're all caught up</p>
                <p className="text-xs text-gray-300 mt-1">No alerts at this time</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => {
                  const config = TYPE_CONFIG[n.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3.5 group transition-colors',
                        !n.read && 'bg-blue-50/40',
                        n.href && 'cursor-pointer hover:bg-gray-50',
                      )}
                      onClick={() => n.href && handleClickNotification(n)}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                        config.bg
                      )}>
                        <Icon className={cn('w-4 h-4', config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm font-semibold leading-snug',
                            n.read ? 'text-gray-600' : 'text-gray-900'
                          )}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button
                                onClick={e => { e.stopPropagation(); markOneRead(n.id); }}
                                className="p-1 rounded text-gray-300 hover:text-teal-500 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                              className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                            config.bg, config.color
                          )}>
                            {config.label}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {getRelativeTime(n.created_at)}
                          </span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-50 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
              <button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.from('notifications').delete().eq('clinic_id', clinicId!).eq('read', true);
                  loadNotifications();
                }}
                className="text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors"
              >
                Clear read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
