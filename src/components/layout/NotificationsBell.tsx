// src/components/layout/NotificationsBell.tsx
//
// FIXES APPLIED:
// - `animate-in` was an undefined class, doing nothing. Replaced with
//   `animate-settle`.
// - `shadow-2xl` (generic default) → `shadow-card-hover`, your elevated
//   card lift token.
// - Panel title "Notifications" is a headline — switched to `font-display
//   tracking-display`, matching the config's own description of what that
//   family is for.
// - `text-gray-900` on primary text swapped to `text-ink-900` — your
//   config's own comment says ink exists specifically to avoid the flat
//   #111 "AI default" that gray-900 renders as. Muted/secondary text
//   stays gray-400/500, which is fine for de-emphasis.
// - Borders swapped to `porcelain-200`, backgrounds to `porcelain-50`
//   where they were flat gray-50/white.
// - Interactive icon buttons (mark read, dismiss, bell) get
//   `active:animate-press` — the tactile press feedback your config
//   defines but never uses anywhere.
//
// REVISION: generateNotifications() used to only run when the panel was
// opened (see the `[clinicId, open]` effect below) — nothing scanned
// inventory/appointments/billing/payments in the background, so the
// Realtime subscription on `notifications` had nothing to react to until
// a click forced a scan. Two additions fix this:
//   1. A Realtime listener on the four source tables that re-runs the
//      scan (debounced) the moment relevant data actually changes —
//      mirrors the exact pattern useDashboard.ts already uses.
//   2. A 5-minute interval backstop, because "appointment starting in
//      the next hour" depends on the current time, not just on data
//      changing — an appointment can drift into that window with
//      nothing in the database changing at all.
// Also added a generatingRef guard around generateNotifications itself,
// since it can now be triggered from three places (open, realtime,
// interval) instead of one — this stops two overlapping calls from
// racing on the delete-then-insert step.
//
// NOTE: this only works once Realtime is actually enabled for
// inventory_items, appointments, billing, and payments in Supabase
// (Database → Tables → the Realtime toggle) — same switch as
// `notifications` already has. The code has always been ready for this;
// those four tables just weren't broadcasting changes yet.
//
// FIX (mobile header wrap): "30 new" and "Mark all read" had no
// `whitespace-nowrap`, so once the header row didn't have enough width —
// which a fixed-width panel on a phone screen easily hits — the browser
// broke each phrase across two lines ("30" / "new", "Mark all" / "read")
// instead of keeping it on one. Added `whitespace-nowrap` to both (the
// actual fix), gave the title `min-w-0` + `truncate` so IT yields space
// first if things ever get genuinely tight instead of the action
// controls breaking, wrapped the right-hand controls in `flex-shrink-0`
// so they're never the thing that gives, and switched the title/badge/
// button text to `clamp()` sizes so they scale down smoothly on narrow
// phones rather than staying pinned at their widest (desktop-equivalent)
// size the whole time. Nothing outside the header block changed.
//
// FIX (everything says "Just now" / list not live): generateNotifications()
// deleted every unread notification of a type and re-inserted the whole
// set on every scan. So every scan gave every alert a brand-new
// `created_at` (hence "Just now" on all of them), read rows were left
// behind while a fresh unread duplicate was inserted next to them, and
// the delete + insert burst fired dozens of realtime events that each
// reloaded the list. It also skipped the delete entirely when nothing
// needed inserting, so alerts for problems that were already fixed never
// went away.
//
// Each alert now has a stable `dedupe_key` (low_stock:<item id>,
// appointment:<appointment id>, balance:<patient id>) with a unique
// constraint on (clinic_id, dedupe_key). A scan only:
//   - inserts alerts that don't exist yet — created_at is when the
//     problem first appeared and is never touched again,
//   - refreshes the body of existing ones (stock count / balance moved)
//     without resetting their read state,
//   - deletes alerts whose condition no longer holds, read or not, so the
//     same problem coming back later raises a genuinely new alert.
// Needs the `dedupe_key` column + unique constraint on `notifications`.
//
// Also: one scan on mount so alerts show without opening the bell; the
// full-panel spinner only shows when there is nothing to display yet, so
// background scans no longer blank the list; realtime bursts on
// `notifications` are coalesced into one reload; and a 30s tick while the
// panel is open lets "Just now" age into "1m ago" on its own.
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

interface NotificationDraft {
  clinic_id: string;
  dedupe_key: string;
  title: string;
  body: string;
  type: Notification['type'];
  read: boolean;
  href: string;
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
  const [, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const generatingRef = useRef(false);

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

  // Re-render every 30s while open so relative times keep aging
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setTick(v => v + 1), 30_000);
    return () => clearInterval(interval);
  }, [open]);

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

  // Sync the notifications table with what the source tables say right now.
  // Only touches rows whose state actually changed — see FIX note above.
  const generateNotifications = useCallback(async () => {
    if (!clinicId || generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);

    try {
      const supabase = createClient();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Get next hour window for upcoming appointments
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      const timeNow = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const timeHour = `${inOneHour.getHours().toString().padStart(2, '0')}:${inOneHour.getMinutes().toString().padStart(2, '0')}`;

      const [inventoryRes, appointmentsRes, billRes, payRes, patientsRes, existingRes] = await Promise.all([
        supabase.from('inventory_items').select('id, item_name, quantity, reorder_level').eq('clinic_id', clinicId),
        supabase.from('appointments')
          .select('*, patient:patients(first_name, last_name)')
          .eq('clinic_id', clinicId)
          .eq('appointment_date', todayStr)
          .in('status', ['Scheduled', 'Confirmed'])
          .gte('appointment_time', timeNow)
          .lte('appointment_time', timeHour),
        supabase.from('billing').select('patient_id, amount_charged').eq('clinic_id', clinicId),
        supabase.from('payments').select('patient_id, amount_paid').eq('clinic_id', clinicId),
        supabase.from('patients').select('id, first_name, last_name').eq('clinic_id', clinicId).eq('archived', false),
        supabase.from('notifications').select('id, dedupe_key, body').eq('clinic_id', clinicId).not('dedupe_key', 'is', null),
      ]);

      // A failed read comes back as data: null, which would look like
      // "nothing is wrong anymore" and wipe every alert below.
      const failed = [inventoryRes, appointmentsRes, billRes, payRes, patientsRes, existingRes].find(r => r.error);
      if (failed) {
        console.error('generateNotifications: scan failed', failed.error);
        return;
      }

      const desired = new Map<string, NotificationDraft>();
      const add = (n: NotificationDraft) => desired.set(n.dedupe_key, n);

      // 1. Low stock alerts
      for (const item of inventoryRes.data ?? []) {
        if (item.quantity <= item.reorder_level) {
          add({
            clinic_id: clinicId,
            dedupe_key: `low_stock:${item.id}`,
            title: 'Low Stock Alert',
            body: `${item.item_name} is running low (${item.quantity} remaining, reorder at ${item.reorder_level}).`,
            type: 'low_stock',
            read: false,
            href: '/inventory',
          });
        }
      }

      // 2. Upcoming appointments (next hour)
      for (const appt of appointmentsRes.data ?? []) {
        const patientName = appt.patient
          ? `${appt.patient.first_name} ${appt.patient.last_name}`
          : 'A patient';
        add({
          clinic_id: clinicId,
          dedupe_key: `appointment:${appt.id}`,
          title: 'Upcoming Appointment',
          body: `${patientName} has a ${appt.treatment_type} appointment starting soon.`,
          type: 'appointment',
          read: false,
          href: `/appointments?id=${appt.id}`,
        });
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
          add({
            clinic_id: clinicId,
            dedupe_key: `balance:${patientId}`,
            title: 'Outstanding Balance',
            body: `${patient.first_name} ${patient.last_name} has an unpaid balance of ${formatPeso(balance)}.`,
            type: 'balance',
            read: false,
            href: `/billing`,
          });
        }
      }

      // Diff against what's already stored
      const existingRows = (existingRes.data ?? []) as { id: string; dedupe_key: string; body: string }[];
      const existing = new Map(existingRows.map(r => [r.dedupe_key, r]));
      const drafts = Array.from(desired.values());

      const toCreate = drafts.filter(d => !existing.has(d.dedupe_key));
      const toRefresh = drafts.filter(d => {
        const row = existing.get(d.dedupe_key);
        return row && row.body !== d.body;
      });
      const staleIds = existingRows.filter(r => !desired.has(r.dedupe_key)).map(r => r.id);

      // ignoreDuplicates keeps this safe if two tabs/users scan at once —
      // the unique constraint makes the loser a no-op instead of an error.
      if (toCreate.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .upsert(toCreate, { onConflict: 'clinic_id,dedupe_key', ignoreDuplicates: true });
        if (error) console.error('generateNotifications: insert failed', error);
      }

      if (toRefresh.length > 0) {
        await Promise.all(toRefresh.map(d =>
          supabase.from('notifications').update({ body: d.body })
            .eq('clinic_id', clinicId).eq('dedupe_key', d.dedupe_key)
        ));
      }

      if (staleIds.length > 0) {
        await supabase.from('notifications').delete().in('id', staleIds);
      }

      await loadNotifications();
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [clinicId, loadNotifications]);

  // Load on mount, then scan once so existing alerts show up without
  // waiting for a click or the 5-minute interval.
  useEffect(() => {
    if (!clinicId) return;
    loadNotifications();
    generateNotifications();
  }, [clinicId, loadNotifications, generateNotifications]);

  useEffect(() => {
    if (!clinicId || !open) return;
    generateNotifications();
  }, [clinicId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription — reloads local state whenever a row in
  // `notifications` actually changes. Debounced so a batch of inserts
  // triggers one reload, not one per row.
  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel(`notifications-${clinicId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => loadNotifications(), 300);
      })
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [clinicId, loadNotifications]);

  // Realtime subscription — re-scans the source tables the moment their
  // data actually changes, instead of waiting for the bell to be
  // clicked. Requires Realtime to be enabled on these four tables in
  // Supabase; the subscription is harmless but inert until then.
  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout>;

    const triggerRegenerate = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => generateNotifications(), 1500);
    };

    const channel = supabase
      .channel(`notification-sources-${clinicId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `clinic_id=eq.${clinicId}` }, triggerRegenerate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments',    filter: `clinic_id=eq.${clinicId}` }, triggerRegenerate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing',         filter: `clinic_id=eq.${clinicId}` }, triggerRegenerate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments',        filter: `clinic_id=eq.${clinicId}` }, triggerRegenerate)
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [clinicId, generateNotifications]);

  // Time-based backstop — "starting in the next hour" depends on the
  // clock, not on data changing, so an appointment can drift into that
  // window with nothing in the database changing at all. A 5-minute
  // interval catches that; the realtime listener above still handles
  // everything data-driven (stock levels, balances) instantly.
  useEffect(() => {
    if (!clinicId) return;
    const interval = setInterval(() => generateNotifications(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [clinicId, generateNotifications]);

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
    <div ref={panelRef} className="relative z-50 font-sans">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-porcelain-100 text-gray-500 transition-colors active:animate-press"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white pointer-events-none" />
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
          border border-porcelain-200 shadow-card-hover z-50 overflow-hidden animate-settle">

          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-porcelain-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-display tracking-display text-ink-900 text-[clamp(13px,3.6vw,16px)] truncate">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[clamp(9px,2.6vw,11px)] bg-red-100 text-red-600 font-semibold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[clamp(9px,2.6vw,11px)] text-teal-700 hover:underline font-medium px-1.5 sm:px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors active:animate-press whitespace-nowrap"
                >
                  <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-porcelain-100 transition-colors active:animate-press flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {(loading || generating) && notifications.length === 0 ? (
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
              <div className="divide-y divide-porcelain-200">
                {notifications.map(n => {
                  const config = TYPE_CONFIG[n.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3.5 group transition-colors duration-200 ease-out-quint',
                        !n.read && 'bg-blue-50/40',
                        n.href && 'cursor-pointer hover:bg-porcelain-50',
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
                            n.read ? 'text-gray-600' : 'text-ink-900'
                          )}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button
                                onClick={e => { e.stopPropagation(); markOneRead(n.id); }}
                                className="p-1 rounded text-gray-300 hover:text-teal-500 transition-colors active:animate-press"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                              className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors active:animate-press"
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
            <div className="px-4 py-3 border-t border-porcelain-200 bg-porcelain-50 flex items-center justify-between">
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