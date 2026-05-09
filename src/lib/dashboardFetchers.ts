
/**
 * All Supabase data-fetching for the dashboard.
 * Each function accepts an AbortSignal so callers can cancel in-flight requests.
 *
 * FIX: Supabase JS v2's `.abortSignal(signal)` method threads an AbortSignal
 * through every query in the chain, so unmounted components never write state.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Stats, DashboardState,
  PaymentRow, InventoryRow,
  RecentAppointmentRow, RecentPatientRow, RecentPaymentRow,
} from '@/types/dashboard';
import type { Appointment, ActivityItem } from '@/types';
import {
  getLocalDateString, getWeekRange, getPast4WeeksRange, computeDailyRevenue,
} from './dashboardHelpers';
import { getPatientName, formatPeso } from '@/lib/utils';

// ─── fetchStats ───────────────────────────────────────────────────────────────

export async function fetchStats(
  supabase: ReturnType<typeof createClient>,
  clinicId: string,
  signal: AbortSignal,
): Promise<Stats> {
  const today = getLocalDateString();
  const { weekStart, weekEnd } = getWeekRange();
  const { pastStart, pastEnd } = getPast4WeeksRange();

  const [apptToday, patients, inventory, payments, pastPayments] = await Promise.all([
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('appointment_date', today)
      .abortSignal(signal),

    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('archived', false)
      .abortSignal(signal),

    supabase
      .from('inventory_items')
      .select('quantity, reorder_level')
      .eq('clinic_id', clinicId)
      .returns<InventoryRow[]>()
      .abortSignal(signal),

    supabase
      .from('payments')
      .select('amount_paid, payment_date')
      .eq('clinic_id', clinicId)
      .gte('payment_date', weekStart)
      .lte('payment_date', weekEnd)
      .returns<PaymentRow[]>()
      .abortSignal(signal),

    supabase
      .from('payments')
      .select('amount_paid, payment_date')
      .eq('clinic_id', clinicId)
      .gte('payment_date', pastStart)
      .lte('payment_date', pastEnd)
      .returns<PaymentRow[]>()
      .abortSignal(signal),
  ]);

  const lowStock = (inventory.data ?? []).filter(
    i => i.quantity <= i.reorder_level,
  ).length;

  const weekPayments = payments.data ?? [];
  const revenue = weekPayments.reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);
  const dailyRevenue = computeDailyRevenue(weekPayments, weekStart);

  // Average over only weeks that had ≥1 payment (not always 4)
  const weeklyTotals: Record<string, number> = {};
  (pastPayments.data ?? []).forEach(p => {
    // FIX: use local date parsing here too
    const [py, pm, pd] = p.payment_date.split('-').map(Number);
    const d = new Date(py, pm - 1, pd);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    const key = getLocalDateString(mon);
    weeklyTotals[key] = (weeklyTotals[key] ?? 0) + (p.amount_paid ?? 0);
  });
  const weekValues = Object.values(weeklyTotals);
  const revenueAverage =
    weekValues.length > 0
      ? weekValues.reduce((s, v) => s + v, 0) / weekValues.length
      : 0;

  return {
    todaysAppointments: apptToday.count ?? 0,
    totalPatients: patients.count ?? 0,
    lowStockAlerts: lowStock,
    revenueThisWeek: revenue,
    revenueAverage,
    dailyRevenue,
  };
}

// ─── fetchAppointments ────────────────────────────────────────────────────────

export async function fetchAppointments(
  supabase: ReturnType<typeof createClient>,
  clinicId: string,
  signal: AbortSignal,
): Promise<Appointment[]> {
  const today = getLocalDateString();
  const { data } = await supabase
    .from('appointments')
    .select('*, patient:patients(first_name, last_name, contact_number), dentist:dentists(id, first_name, last_name)')
    .eq('clinic_id', clinicId)
    .eq('appointment_date', today)
    .order('appointment_time')
    .returns<Appointment[]>()
    .abortSignal(signal);
  return data ?? [];
}

// ─── fetchActivity ────────────────────────────────────────────────────────────

export async function fetchActivity(
  supabase: ReturnType<typeof createClient>,
  clinicId: string,
  signal: AbortSignal,
): Promise<ActivityItem[]> {
  const [recentAppts, recentPatients, recentPayments] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, created_at, treatment_type, patient:patients(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<RecentAppointmentRow[]>()
      .abortSignal(signal),

    supabase
      .from('patients')
      .select('id, created_at, first_name, last_name')
      .eq('clinic_id', clinicId)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(3)
      .returns<RecentPatientRow[]>()
      .abortSignal(signal),

    supabase
      .from('payments')
      .select('id, created_at, amount_paid, patient:patients(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(3)
      .returns<RecentPaymentRow[]>()
      .abortSignal(signal),
  ]);

  const items: ActivityItem[] = [];

  (recentAppts.data ?? []).forEach(a =>
    items.push({
      id: `appt-${a.id}`,
      type: 'appointment',
      description: `Appointment — ${getPatientName(a.patient)} for ${a.treatment_type}`,
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
      description: `Payment — ${getPatientName(p.patient)} paid ${formatPeso(p.amount_paid)}`,
      timestamp: p.created_at,
    }),
  );

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 8);
}

// ─── fetchAll ─────────────────────────────────────────────────────────────────

export async function fetchAll(
  clinicId: string,
  signal: AbortSignal,
): Promise<DashboardState> {
  const supabase = createClient();
  const [stats, appointments, activity] = await Promise.all([
    fetchStats(supabase, clinicId, signal),
    fetchAppointments(supabase, clinicId, signal),
    fetchActivity(supabase, clinicId, signal),
  ]);
  return { stats, appointments, activity };
}