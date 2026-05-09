'use client';

import Link from 'next/link';
import { useClinicId } from '@/lib/hooks/useClinicId';
import { formatPeso } from '@/lib/utils';
import {
  Calendar, Users, Package, TrendingUp,
  UserPlus, CalendarPlus, BoxIcon, ArrowRight,
} from 'lucide-react';

import { useDashboard }           from '@/lib/hooks/useDashboard';
import { usePullToRefresh, PTR_THRESHOLD, PTR_MAX } from '@/lib/hooks/usePullToRefresh';
import { getGreeting }            from '@/lib/dashboardHelpers';

import { BiteyCard }              from '@/components/dashboard/BiteyCard';
import { StatCard }               from '@/components/dashboard/StatCard';
import { NetWorthCard }           from '@/components/dashboard/NetWorthCard';
import { AppointmentsEmptyState, ActivityEmptyState, DashboardSkeleton }
  from '@/components/dashboard/EmptyStates';
import { AppointmentList }        from '@/components/dashboard/AppointmentList';
import { ActivityFeed }           from '@/components/dashboard/ActivityFeed';

// ─── Static sub-components ────────────────────────────────────────────────────

function QuickActions() {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-2">
        Quick actions
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { href: '/patients/new',      label: 'New Patient',      icon: UserPlus,    dot: 'bg-teal-500'    },
          { href: '/appointments/new',  label: 'New Appointment',  icon: CalendarPlus, dot: 'bg-[#1a3d2b]'  },
          { href: '/inventory',         label: 'Add Supply',       icon: BoxIcon,     dot: 'bg-amber-500'   },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-1.5 px-2 py-3 sm:py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
          >
            <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${action.dot}`}>
              <action.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-gray-600 leading-tight">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { clinicId, loading: clinicLoading } = useClinicId();

  // FIX: all dashboard state lives in useDashboard — page is a thin shell
  const { data, bitey, loading, refreshing, refresh, initialLoaded } = useDashboard(
  clinicLoading ? null : clinicId,
  );

  const { pullY, triggered } = usePullToRefresh(refresh);

  const { stats, appointments, activity } = data;
  const hasLowStock = stats.lowStockAlerts > 0;

  // FIX: show skeleton during initial load — prevents partial rendering flicker
  if (!initialLoaded) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="relative space-y-3 sm:space-y-4 pb-8">

      {/* Pull-to-refresh indicator */}
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
              style={{ transform: `rotate(${(pullY / PTR_MAX) * 180}deg)` }}
            >
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2M13.5 2.5V5H11"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}

      {/* Refreshing spinner */}
      {(triggered || refreshing) && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white shadow-md border border-gray-100 rounded-full px-3 py-1.5 pointer-events-none">
          <svg
            className="w-3.5 h-3.5 text-[#1a3d2b] animate-spin"
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2M13.5 2.5V5H11"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[11px] font-medium text-gray-500">Refreshing…</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{getGreeting()}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Here's your clinic at a glance.</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2M13.5 2.5V5H11"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Bitey */}
      <BiteyCard bitey={bitey} stats={stats} appointments={appointments} />

      {/* Quick actions */}
      <QuickActions />

      {/* Stat cards */}
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

      {/* Revenue chart */}
      <NetWorthCard stats={stats} loading={loading} />

      {/* Today's Appointments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Today's Appointments
          </h3>
          <Link href="/appointments"
            className="text-[11px] text-teal-700 hover:underline font-semibold flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {!loading && appointments.length === 0
          ? <AppointmentsEmptyState />
          : (
            <div className="divide-y divide-gray-50">
              <AppointmentList appointments={appointments} loading={loading} />
            </div>
          )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Recent Activity
          </h3>
        </div>
        {!loading && activity.length === 0
          ? <ActivityEmptyState />
          : (
            <div className="divide-y divide-gray-50">
              <ActivityFeed items={activity} loading={loading} />
            </div>
          )}
      </div>

    </div>
  );
}