//src\lib\dashboardHelpers.ts

import type {
  Stats, BiteyEmotion, BiteyState, ActivityItem,
  CacheEntry, DashboardState,
} from '@/types/dashboard';
import type { Appointment } from '@/types';
import { formatPeso } from '@/lib/utils';

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
//
// REVISION: messaging rewritten to read like an assistant reporting on your
// actual numbers rather than a mood-based one-liner. Each state now has
// several phrasing variants (below) built from live stats — no-show counts,
// stock levels, revenue vs. average — so the headline is always the concrete
// fact ("No-shows today: 3 of 8 patients.") rather than a vague feeling.
// Variant choice is seeded by the day plus today's own numbers, so it holds
// steady through repeated silent refreshes instead of changing every minute,
// while still varying clinic to clinic and day to day. No em dashes; tone
// is deliberately calmer/more restrained than before.
//
// The classification logic in deriveBiteyState (which emotion applies) is
// unchanged from before — only how the message text for that emotion gets
// built is new.

interface BiteyMessageContext {
  total: number;
  doneCount: number;
  noShowCount: number;
  noShowRate: number;
  lowStockAlerts: number;
  revenueThisWeek: number;
  revenueAverage: number;
}

type BiteyMessageBuilder = (ctx: BiteyMessageContext) => string;

const ZERO_CTX: BiteyMessageContext = {
  total: 0,
  doneCount: 0,
  noShowCount: 0,
  noShowRate: 0,
  lowStockAlerts: 0,
  revenueThisWeek: 0,
  revenueAverage: 0,
};

function plural(count: number, word: string): string {
  return `${word}${count === 1 ? '' : 's'}`;
}

const BITEY_MESSAGE_VARIANTS: Record<BiteyEmotion, BiteyMessageBuilder[]> = {
  new: [
    () =>
      'Welcome to your new clinic.\n' +
      "Everything stays empty until your first patient is added.\n" +
      'Add one whenever you\'re ready.',
    () =>
      'Your clinic is set up and ready to go.\n' +
      'Add your first patient to start seeing activity here.\n' +
      'No rush getting everything in place.',
    () =>
      'A fresh start for your clinic.\n' +
      'This space fills in as patients and appointments come in.\n' +
      'Add your first patient whenever works for you.',
  ],

  happy: [
    ctx =>
      `Appointments today: ${ctx.total}.\n` +
      'Nothing needs your attention right now.\n' +
      'A steady day so far.',
    ctx =>
      `${ctx.total} ${plural(ctx.total, 'appointment')} on the schedule today.\n` +
      'No no-shows or stock issues to flag.\n' +
      'Should be a smooth one.',
    ctx =>
      `Today looks steady: ${ctx.total} ${plural(ctx.total, 'appointment')} booked.\n` +
      'Nothing urgent on the dashboard.\n' +
      'A good day to catch up on the rest.',
  ],

  excited: [
    ctx => {
      const pct = Math.max(1, Math.round(((ctx.revenueThisWeek - ctx.revenueAverage) / ctx.revenueAverage) * 100));
      return (
        `Revenue this week: ${formatPeso(ctx.revenueThisWeek)}, ${pct}% above your usual pace.\n` +
        "You're ahead of a typical week already.\n" +
        'Keep the bookings coming.'
      );
    },
    ctx => {
      const pct = Math.max(1, Math.round(((ctx.revenueThisWeek - ctx.revenueAverage) / ctx.revenueAverage) * 100));
      return (
        `You're tracking ${formatPeso(ctx.revenueThisWeek)} this week, up ${pct}% from average.\n` +
        'That puts you ahead of pace with days still left.\n' +
        'Nice work so far.'
      );
    },
    ctx => {
      const pct = Math.max(1, Math.round(((ctx.revenueThisWeek - ctx.revenueAverage) / ctx.revenueAverage) * 100));
      return (
        `This week's revenue is already ${formatPeso(ctx.revenueThisWeek)}.\n` +
        `That's ${pct}% higher than a typical week.\n` +
        'Worth keeping the momentum going.'
      );
    },
  ],

  celebrating: [
    ctx =>
      `${ctx.total} for ${ctx.total} today, zero no-shows.\n` +
      'Every appointment went as planned.\n' +
      "That's a clean day worth noting.",
    ctx =>
      `All ${ctx.total} ${plural(ctx.total, 'appointment')} completed, no no-shows.\n` +
      'A perfect day on the schedule.\n' +
      "Doesn't happen every day.",
    ctx =>
      `${ctx.total}/${ctx.total} appointments done today.\n` +
      'No cancellations, no no-shows.\n' +
      'A great one to end on.',
  ],

  shocked: [
    ctx =>
      `No-shows today: ${ctx.noShowCount} of ${ctx.total} patients.\n` +
      "That's higher than usual, worth a look.\n" +
      'A reminder message before appointments might help.',
    ctx => {
      const pct = Math.round(ctx.noShowRate * 100);
      return (
        `${ctx.noShowCount} of ${ctx.total} patients didn't show today.\n` +
        `That's about ${pct}% of the day's schedule.\n` +
        'Might be worth sending appointment reminders.'
      );
    },
    ctx => {
      const pct = Math.round(ctx.noShowRate * 100);
      return (
        `Your no-show rate today is ${pct}%.\n` +
        `${ctx.noShowCount} of ${ctx.total} appointments were missed.\n` +
        "Consider a reminder for tomorrow's bookings."
      );
    },
  ],

  panicked: [
    ctx =>
      `Low stock: ${ctx.lowStockAlerts} ${plural(ctx.lowStockAlerts, 'item')} at or below reorder level.\n` +
      'Best to restock before it affects treatments.\n' +
      'Worth ordering soon.',
    ctx =>
      `${ctx.lowStockAlerts} inventory ${plural(ctx.lowStockAlerts, 'item')} need restocking.\n` +
      'These are at or under your reorder threshold.\n' +
      'Reordering now avoids mid-treatment gaps.',
    ctx =>
      `Inventory alert: ${ctx.lowStockAlerts} ${plural(ctx.lowStockAlerts, 'item')} running low.\n` +
      'Restocking soon keeps treatments uninterrupted.\n' +
      'Worth checking supplies today.',
  ],

  worried: [
    ctx =>
      'Two things need attention today.\n' +
      `${ctx.noShowCount} of ${ctx.total} patients missed their appointment, and ${ctx.lowStockAlerts} ${plural(ctx.lowStockAlerts, 'item')} are low on stock.\n` +
      'Worth handling both when you get a chance.',
    ctx =>
      'No-shows and stock levels both need a look.\n' +
      `${ctx.noShowCount} of ${ctx.total} appointments were missed, and inventory has ${ctx.lowStockAlerts} ${plural(ctx.lowStockAlerts, 'item')} running low.\n` +
      'Nothing urgent, just worth a check.',
    ctx =>
      'A couple of things stand out today.\n' +
      `${ctx.lowStockAlerts} ${plural(ctx.lowStockAlerts, 'item')} need restocking and ${ctx.noShowCount} of ${ctx.total} patients didn't show.\n` +
      'Take care of these when convenient.',
  ],

  sleepy: [
    () =>
      'No appointments scheduled today.\n' +
      'A good time to catch up on admin work.\n' +
      'Or just take it easy for a bit.',
    () =>
      "Nothing on the calendar today.\n" +
      'Could be a good day to tidy up records.\n' +
      'Or just enjoy the quiet.',
    () =>
      "Today's schedule is empty.\n" +
      'Worth checking if anything needs rebooking.\n' +
      'Otherwise, a well-earned breather.',
  ],

  sad: [
    ctx =>
      'No payments recorded yet this week.\n' +
      (ctx.revenueAverage > 0
        ? `Most weeks bring in around ${formatPeso(ctx.revenueAverage)} by now.\n`
        : "That's a bit unusual for this point in the week.\n") +
      'Worth checking if any invoices are still pending.',
    ctx =>
      'Billing looks quiet this week.\n' +
      (ctx.revenueAverage > 0
        ? `You'd usually be around ${formatPeso(ctx.revenueAverage)} by now.\n`
        : 'No payments logged so far.\n') +
      'Might be worth a quick check on pending invoices.',
    ctx =>
      'No payments have come in yet this week.\n' +
      (ctx.revenueAverage > 0
        ? `That's below your usual pace of about ${formatPeso(ctx.revenueAverage)}.\n`
        : 'Still early enough that it may just be timing.\n') +
      'A look at outstanding invoices might help.',
  ],
};

// Fixed fallback strings, derived from the first variant of each state.
// Kept as plain strings (not builders) because useDashboard.ts reads
// BITEY_MESSAGES.new directly as the pre-load placeholder before any real
// stats exist.
export const BITEY_MESSAGES: Record<BiteyEmotion, string> = Object.fromEntries(
  (Object.keys(BITEY_MESSAGE_VARIANTS) as BiteyEmotion[]).map(emotion => [
    emotion,
    BITEY_MESSAGE_VARIANTS[emotion][0](ZERO_CTX),
  ]),
) as Record<BiteyEmotion, string>;

function getDaySeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diffMs = now.getTime() - start.getTime();
  return Math.floor(diffMs / 86_400_000);
}

function pickVariant<T>(variants: T[], seed: number): T {
  const idx = ((seed % variants.length) + variants.length) % variants.length;
  return variants[idx];
}

export function detectNewUser(stats: Stats, activity: ActivityItem[]): boolean {
  return stats.totalPatients === 0 && activity.length === 0;
}

export function deriveBiteyState(
  stats: Stats,
  appointments: Appointment[],
  isNewUser: boolean,
): BiteyState {
  const time = getCurrentTime24h();
  const noShowCount = appointments.filter(a => a.status === 'No-show').length;
  const doneCount = appointments.filter(a => a.status === 'Done').length;
  const total = appointments.length;
  const noShowRate = total > 0 ? noShowCount / total : 0;
  const hasLowStock = stats.lowStockAlerts > 0;
  const hasHighNoShows = total > 0 && noShowRate >= 0.3;

  const ctx: BiteyMessageContext = {
    total,
    doneCount,
    noShowCount,
    noShowRate,
    lowStockAlerts: stats.lowStockAlerts,
    revenueThisWeek: stats.revenueThisWeek,
    revenueAverage: stats.revenueAverage,
  };
  const seed = getDaySeed() + total + noShowCount + stats.lowStockAlerts;

  if (isNewUser) {
    const message = pickVariant(BITEY_MESSAGE_VARIANTS.new, seed)(ctx);
    return { emotion: 'new', message, isNewUser: true };
  }

  let emotion: BiteyEmotion = 'happy';
  if (hasLowStock && hasHighNoShows)                                              emotion = 'worried';
  else if (hasLowStock)                                                           emotion = 'panicked';
  else if (hasHighNoShows)                                                        emotion = 'shocked';
  else if (total === 0)                                                           emotion = 'sleepy';
  else if (total > 0 && doneCount === total && noShowCount === 0)                emotion = 'celebrating';
  else if (stats.revenueThisWeek > stats.revenueAverage && stats.revenueAverage > 0) emotion = 'excited';
  else if (stats.revenueThisWeek === 0 && time >= '12:00')                       emotion = 'sad';

  const message = pickVariant(BITEY_MESSAGE_VARIANTS[emotion], seed)(ctx);
  return { emotion, message, isNewUser: false };
}