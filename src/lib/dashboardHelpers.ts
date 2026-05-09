/**
 * Pure helpers: date utilities, Bitey derivation, cache, and detection logic.
 * No React, no Supabase — fully testable in isolation.
 */

import type {
  Stats, BiteyEmotion, BiteyState, ActivityItem,
  CacheEntry, DashboardState,
} from '@/types/dashboard';
import type { Appointment } from '@/types';

// ─── Clinic-scoped cache ──────────────────────────────────────────────────────
// FIX: was a single global object, shared across clinic switches / multi-tab
// sessions with different clinicIds. Now keyed by clinicId.

const dashboardCache = new Map<string, CacheEntry>();
export const CACHE_TTL = 60_000;

export function getCacheEntry(clinicId: string): CacheEntry | undefined {
  return dashboardCache.get(clinicId);
}

export function setCacheEntry(clinicId: string, data: DashboardState): void {
  dashboardCache.set(clinicId, { data, ts: Date.now() });
}

export function isCacheValid(clinicId: string): boolean {
  const entry = dashboardCache.get(clinicId);
  return !!entry && Date.now() - entry.ts < CACHE_TTL;
}

// ─── Timezone-safe date helpers ───────────────────────────────────────────────
// FIX: `new Date().toISOString().split('T')[0]` returns the UTC date, which
// can be a day behind in PH time (UTC+8) after 4 PM UTC = midnight PH.
// `toLocaleDateString('en-CA')` returns YYYY-MM-DD in the *local* timezone.

export function getLocalDateString(d: Date = new Date()): string {
  // en-CA locale formats as YYYY-MM-DD in every browser/Node version.
  return d.toLocaleDateString('en-CA');
}

export function getWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    weekStart: getLocalDateString(mon),
    weekEnd: getLocalDateString(sun),
  };
}

export function getPast4WeeksRange(): { pastStart: string; pastEnd: string } {
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
    pastStart: getLocalDateString(pastStart),
    pastEnd: getLocalDateString(pastEnd),
  };
}

export function computeDailyRevenue(
  payments: { amount_paid: number; payment_date: string }[],
  weekStart: string,
): number[] {
  const daily = [0, 0, 0, 0, 0, 0, 0];
  // FIX: parse weekStart as a local date, not UTC midnight
  const [wy, wm, wd] = weekStart.split('-').map(Number);
  const base = new Date(wy, wm - 1, wd);

  payments.forEach(p => {
    // FIX: same treatment for payment_date
    const [py, pm, pd] = p.payment_date.split('-').map(Number);
    const d = new Date(py, pm - 1, pd);
    const idx = Math.round((d.getTime() - base.getTime()) / 86_400_000);
    if (idx >= 0 && idx < 7) daily[idx] += p.amount_paid ?? 0;
  });
  return daily;
}

export function getCurrentTime24h(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── Bitey ────────────────────────────────────────────────────────────────────

export const BITEY_MESSAGES: Record<BiteyEmotion, string> = {
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
  shocked:
    "Doc, a lot of patients didn't show up today!\n" +
    "The no-show rate is higher than usual — worth keeping track of.\n" +
    "A quick reminder message before appointments could really help.",
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

export function detectNewUser(stats: Stats, activity: ActivityItem[]): boolean {
  return stats.totalPatients === 0 && activity.length === 0;
}

export function deriveBiteyState(
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

  let emotion: BiteyEmotion = 'happy';
  if (hasLowStock && hasHighNoShows)                                              emotion = 'worried';
  else if (hasLowStock)                                                           emotion = 'panicked';
  else if (hasHighNoShows)                                                        emotion = 'shocked';
  else if (total === 0)                                                           emotion = 'sleepy';
  else if (total > 0 && doneCount === total && noShowCount === 0)                emotion = 'celebrating';
  else if (stats.revenueThisWeek > stats.revenueAverage && stats.revenueAverage > 0) emotion = 'excited';
  else if (stats.revenueThisWeek === 0 && time >= '12:00')                       emotion = 'sad';

  return { emotion, message: BITEY_MESSAGES[emotion], isNewUser: false };
}