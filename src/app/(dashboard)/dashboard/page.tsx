'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useClinicId } from '@/lib/hooks/useClinicId';
import { useToast } from '@/lib/hooks/useToast';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Appointment, ActivityItem } from '@/types';
import { AppointmentList } from '@/components/dashboard/AppointmentList';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { formatPeso, getTodayString, getPatientName } from '@/lib/utils';
import {
  Calendar, Users, Package, TrendingUp,
  UserPlus, CalendarPlus, BoxIcon,
} from 'lucide-react';

interface Stats {
  todaysAppointments: number;
  totalPatients: number;
  lowStockAlerts: number;
  revenueThisWeek: number;
}

interface DashboardState {
  stats: Stats;
  appointments: Appointment[];
  activity: ActivityItem[];
  loading: boolean;
}

const INITIAL_STATE: DashboardState = {
  stats: { todaysAppointments: 0, totalPatients: 0, lowStockAlerts: 0, revenueThisWeek: 0 },
  appointments: [],
  activity: [],
  loading: true,
};

// Cache so revisiting the page feels instant
const cache = { data: null as Omit<DashboardState, 'loading'> | null, ts: 0 };
const CACHE_TTL = 60_000; // 1 minute

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

export default function DashboardPage() {
  const { clinicId, loading: clinicLoading } = useClinicId();
  const { toast } = useToast();
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);
  const loadingRef = useRef(false); // prevent concurrent fetches

  const loadDashboard = useCallback(async (silent = false) => {
    if (!clinicId || loadingRef.current) return;

    // Serve from cache if fresh
    if (silent && cache.data && Date.now() - cache.ts < CACHE_TTL) {
      setState(s => ({ ...s, ...cache.data }));
      return;
    }

    loadingRef.current = true;
    if (!silent) setState(s => ({ ...s, loading: true }));

    try {
      const supabase = createClient();
      const today = getTodayString();
      const { weekStart, weekEnd } = getWeekRange();

      const [
        apptToday, apptFull, patients, inventory,
        payments, recentAppts, recentPatients, recentPayments,
      ] = await Promise.all([
        supabase.from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId).eq('appointment_date', today),
        supabase.from('appointments')
          .select('*, patient:patients(*), dentist:dentists(*)')
          .eq('clinic_id', clinicId).eq('appointment_date', today)
          .order('appointment_time'),
        supabase.from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId),
        supabase.from('inventory_items')
          .select('id, quantity, reorder_level')
          .eq('clinic_id', clinicId),
        supabase.from('payments')
          .select('amount_paid')
          .eq('clinic_id', clinicId)
          .gte('payment_date', weekStart).lte('payment_date', weekEnd),
        supabase.from('appointments')
          .select('id, created_at, treatment_type, patient:patients(first_name, last_name)')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('patients')
          .select('id, created_at, first_name, last_name')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('payments')
          .select('id, created_at, amount_paid, patient:patients(first_name, last_name)')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }).limit(3),
      ]);

      const lowStock = (inventory.data ?? [])
        .filter(i => i.quantity <= i.reorder_level).length;
      const revenue = (payments.data ?? [])
        .reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);

      const items: ActivityItem[] = [];
      (recentAppts.data ?? []).forEach(a => items.push({
        id: `appt-${a.id}`, type: 'appointment',
        description: `Appointment — ${getPatientName(a.patient as any)} for ${a.treatment_type}`,
        timestamp: a.created_at,
      }));
      (recentPatients.data ?? []).forEach(p => items.push({
        id: `pat-${p.id}`, type: 'patient',
        description: `New patient — ${getPatientName(p)}`,
        timestamp: p.created_at,
      }));
      (recentPayments.data ?? []).forEach(p => items.push({
        id: `pay-${p.id}`, type: 'payment',
        description: `Payment — ${getPatientName(p.patient as any)} paid ${formatPeso(p.amount_paid)}`,
        timestamp: p.created_at,
      }));
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const next = {
        stats: {
          todaysAppointments: apptToday.count ?? 0,
          totalPatients: patients.count ?? 0,
          lowStockAlerts: lowStock,
          revenueThisWeek: revenue,
        },
        appointments: (apptFull.data ?? []) as Appointment[],
        activity: items.slice(0, 8),
      };

      // Write cache
      cache.data = next;
      cache.ts = Date.now();

      // Single setState = single re-render
      setState({ ...next, loading: false });
    } catch (error) {
      console.error('Dashboard load error:', error);
      if (!silent) toast.error('Failed to load dashboard data');
      setState(s => ({ ...s, loading: false }));
    } finally {
      loadingRef.current = false;
    }
  }, [clinicId]);

  // Initial load
  useEffect(() => {
    if (!clinicLoading) loadDashboard();
  }, [clinicId, clinicLoading, loadDashboard]);

  // Refocus refresh — debounced, silent (no toast, uses cache)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onFocus = () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadDashboard(true), 300);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearTimeout(timer);
    };
  }, [loadDashboard]);

  const { stats, appointments, activity, loading } = state;
  const hasLowStock = stats.lowStockAlerts > 0;

  return (
    <div className="space-y-5">

      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Good {getGreeting()}
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Here's what's happening at your clinic today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Today's Appointments",
            value: loading ? '—' : stats.todaysAppointments,
            sub: 'Scheduled today',
            icon: Calendar,
            iconClass: 'text-blue-500',
          },
          {
            label: 'Total Patients',
            value: loading ? '—' : stats.totalPatients,
            sub: 'Registered',
            icon: Users,
            iconClass: 'text-teal-600',
          },
          {
            label: 'Low Stock',
            value: loading ? '—' : stats.lowStockAlerts,
            sub: hasLowStock ? 'Items need restocking' : 'All levels ok',
            icon: Package,
            iconClass: hasLowStock ? 'text-red-500' : 'text-gray-400',
            valueClass: hasLowStock ? 'text-red-600' : undefined,
          },
          {
            label: 'Revenue This Week',
            value: loading ? '—' : formatPeso(stats.revenueThisWeek),
            sub: 'Mon – Sun',
            icon: TrendingUp,
            iconClass: 'text-green-600',
          },
        ].map(card => (
          <div
            key={card.label}
            className="bg-gray-50 rounded-xl px-4 py-3.5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide font-medium text-gray-400">
                {card.label}
              </span>
              <card.icon className={`w-4 h-4 ${card.iconClass}`} />
            </div>
            <p className={`text-2xl font-semibold leading-none ${card.valueClass ?? 'text-gray-900'}`}>
              {card.value}
            </p>
            <p className="text-[11px] text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { href: '/patients/new', label: 'Add Patient', icon: UserPlus, dot: 'bg-teal-500' },
          { href: '/appointments/new', label: 'Add Appointment', icon: CalendarPlus, dot: 'bg-blue-500' },
          { href: '/inventory', label: 'Add Supply', icon: BoxIcon, dot: 'bg-amber-500' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${action.dot}`} />
            {action.label}
          </Link>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Today's Appointments
            </h3>
            <Link href="/appointments" className="text-xs text-teal-600 hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            <AppointmentList appointments={appointments} loading={loading} />
          </div>
        </div>

        <div className="lg:col-span-2 border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            <ActivityFeed items={activity} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}