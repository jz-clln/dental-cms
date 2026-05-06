'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useClinicId } from '@/lib/hooks/useClinicId';
import { useToast } from '@/lib/hooks/useToast';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Appointment, ActivityItem } from '@/types';
import { AppointmentList } from '@/components/dashboard/AppointmentList';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { formatPeso, getTodayString, getPatientName } from '@/lib/utils';
import {
  Calendar, Users, Package, TrendingUp,
  UserPlus, CalendarPlus, BoxIcon, ArrowRight,
  CalendarX, Activity,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  todaysAppointments: number;
  totalPatients: number;
  lowStockAlerts: number;
  revenueThisWeek: number;
  revenueAverage: number;
  // Bug fix #3: store actual daily revenue for the bar chart
  dailyRevenue: number[];
}

interface DashboardState {
  stats: Stats;
  appointments: Appointment[];
  activity: ActivityItem[];
  loading: boolean;
}

type BiteyEmotion =
  | 'shocked' | 'panicked' | 'worried' | 'sleepy'
  | 'celebrating' | 'excited' | 'sad' | 'happy' | 'new';

interface BiteyState {
  emotion: BiteyEmotion;
  message: string;
  isNewUser: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_STATS: Stats = {
  todaysAppointments: 0,
  totalPatients: 0,
  lowStockAlerts: 0,
  revenueThisWeek: 0,
  revenueAverage: 0,
  dailyRevenue: [0, 0, 0, 0, 0, 0, 0],
};

const INITIAL_STATE: DashboardState = {
  stats: INITIAL_STATS,
  appointments: [],
  activity: [],
  loading: true,
};

const cache = { data: null as Omit<DashboardState, 'loading'> | null, ts: 0 };
const CACHE_TTL = 60_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    weekStart: mon.toISOString().split('T')[0],
    weekEnd: sun.toISOString().split('T')[0],
  };
}

function getPast4WeeksRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMon);
  thisMonday.setHours(0, 0, 0, 0);
  const pastStart = new Date(thisMonday);
  pastStart.setDate(thisMonday.getDate() - 28);
  const pastEnd = new Date(thisMonday);
  pastEnd.setDate(thisMonday.getDate() - 1);
  return {
    pastStart: pastStart.toISOString().split('T')[0],
    pastEnd: pastEnd.toISOString().split('T')[0],
  };
}

function getCurrentTime24h(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Bug fix #2 (detectNewUser): use totalPatients only — a clinic that doesn't
// bill through the app would falsely look "new" if we also check revenue.
function detectNewUser(stats: Stats, activity: ActivityItem[]): boolean {
  return stats.totalPatients === 0 && activity.length === 0;
}

// Bug fix #3: compute daily revenue array (Mon=0 … Sun=6) from payment rows
function computeDailyRevenue(
  payments: { amount_paid: number; payment_date: string }[],
  weekStart: string,
): number[] {
  const daily = [0, 0, 0, 0, 0, 0, 0];
  const base = new Date(weekStart);
  payments.forEach(p => {
    const d = new Date(p.payment_date);
    const idx = Math.round((d.getTime() - base.getTime()) / 86_400_000);
    if (idx >= 0 && idx < 7) daily[idx] += p.amount_paid ?? 0;
  });
  return daily;
}

// ─── Data fetching helpers ────────────────────────────────────────────────────

// Performance: split into three focused fetchers so we can reason about each
// independently and avoid loading a single massive function.

async function fetchStats(supabase: ReturnType<typeof createClient>, clinicId: string) {
  const today = getTodayString();
  const { weekStart, weekEnd } = getWeekRange();
  const { pastStart, pastEnd } = getPast4WeeksRange();

  const [apptToday, patients, inventory, payments, pastPayments] = await Promise.all([
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('appointment_date', today),

    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('archived', false),

    supabase
      .from('inventory_items')
      .select('quantity, reorder_level')
      .eq('clinic_id', clinicId),

    supabase
      .from('payments')
      .select('amount_paid, payment_date')
      .eq('clinic_id', clinicId)
      .gte('payment_date', weekStart)
      .lte('payment_date', weekEnd),

    supabase
      .from('payments')
      .select('amount_paid, payment_date')
      .eq('clinic_id', clinicId)
      .gte('payment_date', pastStart)
      .lte('payment_date', pastEnd),
  ]);

  const lowStock = (inventory.data ?? []).filter(
    i => i.quantity <= i.reorder_level,
  ).length;

  const weekPayments = payments.data ?? [];
  const revenue = weekPayments.reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);
  const dailyRevenue = computeDailyRevenue(weekPayments, weekStart);

  // Bug fix #1: only average over weeks that actually have data (≥1 payment),
  // capped at 4. Dividing by 4 always understates the average for new clinics.
  const weeklyTotals: Record<string, number> = {};
  (pastPayments.data ?? []).forEach(p => {
    const d = new Date(p.payment_date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    const key = mon.toISOString().split('T')[0];
    weeklyTotals[key] = (weeklyTotals[key] ?? 0) + (p.amount_paid ?? 0);
  });
  const weekValues = Object.values(weeklyTotals);
  const revenueAverage =
    weekValues.length > 0
      ? weekValues.reduce((s, v) => s + v, 0) / weekValues.length  // ← fixed divisor
      : 0;

  return {
    todaysAppointments: apptToday.count ?? 0,
    totalPatients: patients.count ?? 0,
    lowStockAlerts: lowStock,
    revenueThisWeek: revenue,
    revenueAverage,
    dailyRevenue,
  } satisfies Stats;
}

async function fetchAppointments(supabase: ReturnType<typeof createClient>, clinicId: string) {
  const today = getTodayString();
  const { data } = await supabase
    .from('appointments')
    .select('*, patient:patients(*), dentist:dentists(*)')
    .eq('clinic_id', clinicId)
    .eq('appointment_date', today)
    .order('appointment_time');
  return (data ?? []) as Appointment[];
}

async function fetchActivity(supabase: ReturnType<typeof createClient>, clinicId: string) {
  // Performance: run the three activity queries in parallel (unchanged logic,
  // just isolated here so fetchStats can also run in parallel with this).
  const [recentAppts, recentPatients, recentPayments] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, created_at, treatment_type, patient:patients(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('patients')
      .select('id, created_at, first_name, last_name')
      .eq('clinic_id', clinicId)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('payments')
      .select('id, created_at, amount_paid, patient:patients(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const items: ActivityItem[] = [];
  (recentAppts.data ?? []).forEach(a =>
    items.push({
      id: `appt-${a.id}`,
      type: 'appointment',
      description: `Appointment — ${getPatientName(a.patient as any)} for ${a.treatment_type}`,
      timestamp: a.created_at,
    }),
  );
  (recentPatients.data ?? []).forEach(p =>
    items.push({
      id: `pat-${p.id}`,
      type: 'patient',
      description: `New patient — ${getPatientName(p)}`,
      timestamp: p.created_at,
    }),
  );
  (recentPayments.data ?? []).forEach(p =>
    items.push({
      id: `pay-${p.id}`,
      type: 'payment',
      description: `Payment — ${getPatientName(p.patient as any)} paid ${formatPeso(p.amount_paid)}`,
      timestamp: p.created_at,
    }),
  );

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 8);
}

// ─── Bitey Logic ──────────────────────────────────────────────────────────────

const BITEY_MESSAGES: Record<BiteyEmotion, string> = {
  new:
    "Oh, a brand new clinic! Welcome.\n" +
    "It's a little quiet in here right now, but that's totally fine.\n" +
    "Add your first patient and we'll get things moving.",

  happy:
    "Morning, Doc! Today's looking pretty steady.\n" +
    "Appointments are on track and nothing needs urgent attention.\n" +
    "A smooth day, so enjoy it while it lasts!",

  excited:
    "Hey Doc, revenue is up this week! Nice work.\n" +
    "You're already ahead of your usual weekly pace.\n" +
    "Keep the bookings coming and finish strong!",

  celebrating:
    "Clean sweep today, Doc — seriously impressive!\n" +
    "Every patient showed up and every appointment got done.\n" +
    "That's the kind of day worth remembering.",

  // Bug fix (swapped): shocked = high no-shows
  shocked:
    "Doc, a lot of patients didn't show up today!\n" +
    "The no-show rate is higher than usual — worth keeping track of.\n" +
    "A quick reminder message before appointments could really help.",

  // Bug fix (swapped): panicked = low inventory
  panicked:
    "Doc, your inventory is running low on some essential supplies!\n" +
    "Please restock as soon as possible to avoid mid-treatment disruptions.\n" +
    "You might want to reorder now before it becomes a real problem.",

  worried:
    "Just a heads up, Doc — things look a little off today.\n" +
    "Both no-shows and stock levels need your attention.\n" +
    "Take care of both and the rest of the day should smooth out.",

  sleepy:
    "Quiet one today, Doc — No appointments lined up yet.\n" +
    "Honestly not a bad time to tackle that admin backlog.\n" +
    "Or just take a breather. You've earned it.",

  sad:
    "Slow week on the billing side, Doc.\n" +
    "No payments have come in yet, which is a little unusual.\n" +
    "Might be worth checking if any invoices are still pending.",
};

function deriveBiteyState(
  stats: Stats,
  appointments: Appointment[],
  isNewUser: boolean,
): BiteyState {
  if (isNewUser) {
    return { emotion: 'new', message: BITEY_MESSAGES.new, isNewUser: true };
  }

  const time = getCurrentTime24h();
  const noShowCount = appointments.filter(a => a.status === 'No-show').length;
  const doneCount = appointments.filter(a => a.status === 'Done').length;
  const total = appointments.length;
  const noShowRate = total > 0 ? noShowCount / total : 0;
  const hasLowStock = stats.lowStockAlerts > 0;
  const hasHighNoShows = total > 0 && noShowRate >= 0.3;

  // Bug fix #4: simplified & corrected priority chain.
  // worried = both problems at once (new dedicated state)
  // panicked = low inventory only
  // shocked  = high no-shows only
  let emotion: BiteyEmotion = 'happy';
  if (hasLowStock && hasHighNoShows)                                   emotion = 'worried';
  else if (hasLowStock)                                                emotion = 'panicked';
  else if (hasHighNoShows)                                             emotion = 'shocked';
  else if (total === 0)                                               emotion = 'sleepy';
  else if (total > 0 && doneCount === total && noShowCount === 0)     emotion = 'celebrating';
  else if (stats.revenueThisWeek > stats.revenueAverage && stats.revenueAverage > 0) emotion = 'excited'; // guard against avg=0
  else if (stats.revenueThisWeek === 0 && time >= '12:00')           emotion = 'sad';

  return { emotion, message: BITEY_MESSAGES[emotion], isNewUser: false };
}

// ─── Pull-to-refresh ─────────────────────────────────────────────────────────

const PTR_THRESHOLD = 72; // px of overscroll needed to trigger — also used in JSX indicator opacity
const PTR_MAX      = 96; // px max rubber-band pull distance shown

function usePullToRefresh(onRefresh: () => void) {
  const [pullY, setPullY]       = useState(0);   // 0-PTR_MAX, drives indicator height
  const [triggered, setTriggered] = useState(false);
  const startY  = useRef<number | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    const el = document.documentElement;

    const onTouchStart = (e: TouchEvent) => {
      // Only begin a pull when the page is scrolled to the very top
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { setPullY(0); return; }
      // Rubber-band: pull feels heavier the further you go
      const rubber = Math.min(PTR_MAX, delta * 0.45);
      setPullY(rubber);
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullY >= PTR_THRESHOLD) {
        setTriggered(true);
        onRefresh();
        setTimeout(() => setTriggered(false), 1000);
      }
      setPullY(0);
      startY.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [onRefresh, pullY]);

  return { pullY, triggered };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BiteyCard({ bitey, stats, appointments }: {
  bitey: BiteyState;
  stats: Stats;
  appointments: Appointment[];
}) {
  const lines = bitey.message.split('\n');
  const hasLowStock = stats.lowStockAlerts > 0;
  const noShowCount = appointments.filter(a => a.status === 'No-show').length;
  const total = appointments.length;

  const badge = {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    label: 'Clinic Assistant',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1a3d2b] text-white">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative flex items-end gap-0">
        <div className="relative flex-shrink-0 w-[120px] h-[130px] self-end">
          <Image
            src={`/bitey/${bitey.emotion}.png`}
            alt={`Bitey is ${bitey.emotion}`}
            fill
            className="object-contain object-bottom drop-shadow-lg"
            priority
          />
        </div>

        <div className="flex-1 py-5 pr-5">
          <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>

          {bitey.message ? (
            <div className="space-y-1">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'text-[13px] font-semibold text-white/90 leading-snug'
                      : i === 1
                      ? 'text-[13px] text-white/80 leading-snug font-medium'
                      : 'text-[11px] text-white/55 leading-snug'
                  }
                >
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {!bitey.isNewUser ? (
        <div className="relative border-t border-white/10 grid grid-cols-3 divide-x divide-white/10">
          {[
            { label: "Today's appts", value: total },
            { label: 'No-shows', value: noShowCount, warn: noShowCount > 0 },
            { label: 'Low stock', value: stats.lowStockAlerts, warn: hasLowStock },
          ].map(item => (
            <div key={item.label} className="py-3 px-4 text-center">
              <p className={`text-lg font-bold leading-none ${item.warn ? 'text-red-300' : 'text-white'}`}>
                {item.value}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">{item.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative border-t border-white/10 px-5 py-3 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <p className="text-[11px] text-white/50">
            Use the quick actions above to get started with your clinic.
          </p>
        </div>
      )}
    </div>
  );
}

// Bug fix #3: NetWorthCard now uses real dailyRevenue data
function NetWorthCard({ stats, loading }: { stats: Stats; loading: boolean }) {
  // Bug fix (UX): use distinct day labels so T/T ambiguity is gone
  const DAY_LABELS = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1; // Mon=0 … Sun=6

  const maxRevenue = Math.max(...stats.dailyRevenue, 1); // avoid divide-by-zero

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
          Revenue this week
        </p>
        <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">
          {loading
            ? <span className="inline-block w-32 h-8 bg-gray-100 rounded animate-pulse" />
            : formatPeso(stats.revenueThisWeek)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {loading
            ? '—'
            : stats.revenueAverage > 0
            ? `vs. ${formatPeso(stats.revenueAverage)} weekly avg`
            : 'No average data yet — keep going!'}
        </p>
      </div>

      {/* Real daily revenue bar chart */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-1 h-10">
          {DAY_LABELS.map((d, i) => {
            const isPast = i < todayIdx;
            const isToday = i === todayIdx;
            // height as % of the tallest bar (min 8% so the bar is always visible)
            const heightPct = isToday || isPast
              ? Math.max(8, Math.round((stats.dailyRevenue[i] / maxRevenue) * 100))
              : 8;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm transition-all ${
                    isToday
                      ? 'bg-[#1a3d2b]'
                      : isPast
                      ? 'bg-teal-400/60'
                      : 'bg-gray-100'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className={`text-[9px] font-medium ${isToday ? 'text-[#1a3d2b]' : 'text-gray-300'}`}>
                  {d}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, iconColor, valueColor, loading, href,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
  loading: boolean;
  href?: string;
}) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className={`text-2xl font-bold leading-none ${valueColor ?? 'text-gray-900'}`}>
        {loading
          ? <span className="inline-block w-12 h-6 bg-gray-100 rounded animate-pulse" />
          : (value ?? 0)}
      </p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickActions() {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-2">Quick actions</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { href: '/patients/new', label: 'New Patient', icon: UserPlus, dot: 'bg-teal-500' },
          { href: '/appointments/new', label: 'New Appointment', icon: CalendarPlus, dot: 'bg-[#1a3d2b]' },
          { href: '/inventory', label: 'Add Supply', icon: BoxIcon, dot: 'bg-amber-500' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 px-3 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center ${action.dot}`}>
              <action.icon className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="text-[11px] font-medium text-gray-600 leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AppointmentsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
        <CalendarX className="w-5 h-5 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">No appointments today</p>
        <p className="text-xs text-gray-300 mt-0.5">Add an appointment to see it here</p>
      </div>
      <Link
        href="/appointments/new"
        className="mt-1 text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
      >
        Schedule an appointment <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function ActivityEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-2">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
        <Activity className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-400">No recent activities</p>
      <p className="text-xs text-gray-300">Activity will appear here as you use the clinic.</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { clinicId, loading: clinicLoading } = useClinicId();
  const { toast } = useToast();
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);
  const [bitey, setBitey] = useState<BiteyState>({
    emotion: 'new',
    message: BITEY_MESSAGES.new,
    isNewUser: true,
  });
  const loadingRef = useRef(false);
  // Performance: track last focus time to enforce a real debounce cooldown
  const lastFocusLoad = useRef(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!clinicId || loadingRef.current) return;

    if (silent && cache.data && Date.now() - cache.ts < CACHE_TTL) {
      setState(s => ({ ...s, ...cache.data }));
      return;
    }

    loadingRef.current = true;
    if (!silent) setState(s => ({ ...s, loading: true }));

    try {
      const supabase = createClient();

      // Performance: fetchStats and fetchActivity run fully in parallel —
      // fetchAppointments is also parallel with both.
      const [stats, appointments, activity] = await Promise.all([
        fetchStats(supabase, clinicId),
        fetchAppointments(supabase, clinicId),
        fetchActivity(supabase, clinicId),
      ]);

      const next = { stats, appointments, activity };
      cache.data = next;
      cache.ts = Date.now();
      setState({ ...next, loading: false });

      const isNewUser = detectNewUser(stats, activity);
      setBitey(deriveBiteyState(stats, appointments, isNewUser));
    } catch (error) {
      console.error('Dashboard load error:', error);
      if (!silent) toast.error('Failed to load dashboard data');
      setState(s => ({ ...s, loading: false }));
    } finally {
      loadingRef.current = false;
    }
  }, [clinicId]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard, refreshing]);

  const { pullY, triggered } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!clinicLoading) loadDashboard();
  }, [clinicId, clinicLoading, loadDashboard]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const onFocus = () => {
      const now = Date.now();
      // Performance: only allow a focus-triggered reload if at least CACHE_TTL
      // has elapsed since the last one — prevents rapid tab-switching hammering
      // the DB even with just a 300ms setTimeout debounce.
      if (now - lastFocusLoad.current < CACHE_TTL) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastFocusLoad.current = Date.now();
        loadDashboard(true);
      }, 300);
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearTimeout(timer);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setState(s => s.loading ? { ...s, loading: false } : s);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const { stats, appointments, activity, loading } = state;
  const hasLowStock = stats.lowStockAlerts > 0;

  return (
    <div className="relative space-y-4 pb-8">

      {/* ── Pull-to-refresh indicator (mobile only) ── */}
      {pullY > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ height: pullY }}
        >
          <div
            className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center"
            style={{ opacity: Math.min(1, pullY / PTR_THRESHOLD) }}
          >
            <svg
              className="w-4 h-4 text-[#1a3d2b]"
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ transform: `rotate(${(pullY / PTR_THRESHOLD) * 180}deg)` }}
            >
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2M13.5 2.5V5H11" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}

      {/* ── Triggered / refreshing spinner overlay ── */}
      {(triggered || refreshing) && !loading && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white shadow-md border border-gray-100 rounded-full px-3 py-1.5 pointer-events-none">
          <svg
            className="w-3.5 h-3.5 text-[#1a3d2b] animate-spin"
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2M13.5 2.5V5H11" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[11px] font-medium text-gray-500">Refreshing…</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{getGreeting()}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Here's your clinic at a glance.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2M13.5 2.5V5H11" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Bitey Hero Card ── */}
      <BiteyCard bitey={bitey} stats={stats} appointments={appointments} />

      {/* ── Quick Actions ── */}
      <QuickActions />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Today's appointments"
          value={stats.todaysAppointments}
          sub="Scheduled for today"
          icon={Calendar}
          iconColor="text-[#1a3d2b]"
          loading={loading}
          href="/appointments"
        />
        <StatCard
          label="Total patients"
          value={stats.totalPatients}
          sub="Active records"
          icon={Users}
          iconColor="text-teal-600"
          loading={loading}
          href="/patients"
        />
        <StatCard
          label="Low stock"
          value={stats.lowStockAlerts}
          sub={hasLowStock ? 'Need restocking' : 'All levels ok'}
          icon={Package}
          iconColor={hasLowStock ? 'text-red-500' : 'text-gray-400'}
          valueColor={hasLowStock ? 'text-red-600' : undefined}
          loading={loading}
          href="/inventory"
        />
        <StatCard
          label="Weekly avg revenue"
          value={formatPeso(stats.revenueAverage)}
          sub="Past weeks"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          loading={loading}
        />
      </div>

      {/* ── Revenue + Real Bar Chart ── */}
      <NetWorthCard stats={stats} loading={loading} />

      {/* ── Today's Appointments ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Today's Appointments
          </h3>
          <Link href="/appointments" className="text-[11px] text-teal-700 hover:underline font-semibold flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {!loading && appointments.length === 0 ? (
          <AppointmentsEmptyState />
        ) : (
          <div className="divide-y divide-gray-50">
            <AppointmentList appointments={appointments} loading={loading} />
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Recent Activity
          </h3>
        </div>
        {!loading && activity.length === 0 ? (
          <ActivityEmptyState />
        ) : (
          <div className="divide-y divide-gray-50">
            <ActivityFeed items={activity} loading={loading} />
          </div>
        )}
      </div>

    </div>
  );
}