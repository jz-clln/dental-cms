'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RevenueDataPoint, AppointmentStatusCount, TreatmentCount } from '@/types';
import dynamic from 'next/dynamic';
import { TreatmentsList } from '@/components/reports/TreatmentsList';
import { formatPeso } from '@/lib/utils';
import {
  TrendingUp, Calendar, UserX, Stethoscope,
  BarChart3, RefreshCw,
} from 'lucide-react';

const RevenueChart = dynamic(
  () => import('@/components/reports/RevenueChart').then(m => m.RevenueChart),
  { ssr: false }
) as any;
const StatusPieChart = dynamic(
  () => import('@/components/reports/StatusPieChart').then(m => m.StatusPieChart),
  { ssr: false }
) as any;

interface ReportStats {
  totalRevenueMonth: number;
  totalAppointmentsMonth: number;
  noShowCount: number;
  noShowRate: number;
  totalRevenueAllTime: number;
}

interface ReportsState {
  stats: ReportStats;
  revenueData: RevenueDataPoint[];
  statusData: AppointmentStatusCount[];
  treatmentData: TreatmentCount[];
  loading: boolean;
  refreshing: boolean;
}

const INITIAL: ReportsState = {
  stats: {
    totalRevenueMonth: 0,
    totalAppointmentsMonth: 0,
    noShowCount: 0,
    noShowRate: 0,
    totalRevenueAllTime: 0,
  },
  revenueData: [],
  statusData: [],
  treatmentData: [],
  loading: true,
  refreshing: false,
};

// Skeleton pulse block
function Pulse({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 animate-pulse rounded-lg ${className}`} />;
}

// Thin section card — consistent with dashboard style
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [state, setState] = useState<ReportsState>(INITIAL);
  const loadingRef = useRef(false);

  const loadReports = useCallback(async (showRefreshing = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    setState(s => ({
      ...s,
      loading: !showRefreshing,
      refreshing: showRefreshing,
    }));

    try {
      const supabase = createClient();
      const now = new Date();

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 29);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const [paymentsLast30, appointmentsMonth, paymentsAllTime] = await Promise.all([
        supabase.from('payments')
          .select('amount_paid, payment_date')
          .gte('payment_date', thirtyDaysAgoStr)
          .lte('payment_date', todayStr),
        supabase.from('appointments')
          .select('status, treatment_type')
          .gte('appointment_date', monthStart)
          .lte('appointment_date', monthEnd),
        supabase.from('payments').select('amount_paid'),
      ]);

      // Revenue by day
      const revenueMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        revenueMap[d.toISOString().split('T')[0]] = 0;
      }
      for (const p of paymentsLast30.data ?? []) {
        if (revenueMap[p.payment_date] !== undefined)
          revenueMap[p.payment_date] += p.amount_paid;
      }
      const revenueData: RevenueDataPoint[] = Object.entries(revenueMap).map(([date, revenue]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        revenue,
      }));

      // Status counts
      const statusMap: Record<string, number> = {};
      for (const a of appointmentsMonth.data ?? [])
        statusMap[a.status] = (statusMap[a.status] ?? 0) + 1;
      const statusData: AppointmentStatusCount[] = Object.entries(statusMap)
        .map(([status, count]) => ({ status: status as any, count }))
        .sort((a, b) => b.count - a.count);

      // Treatments
      const treatMap: Record<string, number> = {};
      for (const a of appointmentsMonth.data ?? [])
        treatMap[a.treatment_type] = (treatMap[a.treatment_type] ?? 0) + 1;
      const treatmentData: TreatmentCount[] = Object.entries(treatMap)
        .map(([treatment_type, count]) => ({ treatment_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Stats
      const allAppts = appointmentsMonth.data ?? [];
      const totalAppts = allAppts.length;
      const noShows = allAppts.filter(a => a.status === 'No-show').length;
      const monthRevenue = (paymentsLast30.data ?? [])
        .filter(p => p.payment_date >= monthStart)
        .reduce((s, p) => s + p.amount_paid, 0);
      const allTimeRevenue = (paymentsAllTime.data ?? [])
        .reduce((s, p) => s + p.amount_paid, 0);

      setState({
        revenueData,
        statusData,
        treatmentData,
        stats: {
          totalRevenueMonth: monthRevenue,
          totalAppointmentsMonth: totalAppts,
          noShowCount: noShows,
          noShowRate: totalAppts > 0 ? Math.round((noShows / totalAppts) * 100) : 0,
          totalRevenueAllTime: allTimeRevenue,
        },
        loading: false,
        refreshing: false,
      });
    } catch (err) {
      console.error('Reports load error:', err);
      setState(s => ({ ...s, loading: false, refreshing: false }));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const { stats, revenueData, statusData, treatmentData, loading, refreshing } = state;
  const currentMonth = new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const completedCount = statusData.find(s => s.status === 'Done')?.count ?? 0;
  const noShowRate = stats.noShowRate;
  const rateColor = noShowRate > 20 ? 'text-red-600' : noShowRate > 10 ? 'text-amber-500' : 'text-teal-600';
  const barColor = noShowRate > 20 ? 'bg-red-500' : noShowRate > 10 ? 'bg-amber-400' : 'bg-teal-500';
  const rateLabel = noShowRate > 20 ? 'High — follow up with patients'
    : noShowRate > 10 ? 'Moderate — consider reminders'
    : 'Good — keep it up!';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">{currentMonth}</p>
        </div>
        <button
          onClick={() => loadReports(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards — same flat style as dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Revenue This Month',
            value: loading ? '—' : formatPeso(stats.totalRevenueMonth),
            sub: loading ? '' : `All time: ${formatPeso(stats.totalRevenueAllTime)}`,
            icon: TrendingUp,
            iconClass: 'text-green-600',
          },
          {
            label: 'Appointments',
            value: loading ? '—' : stats.totalAppointmentsMonth,
            sub: 'this month',
            icon: Calendar,
            iconClass: 'text-blue-500',
          },
          {
            label: 'No-show Rate',
            value: loading ? '—' : `${stats.noShowRate}%`,
            sub: loading ? '' : `${stats.noShowCount} no-show${stats.noShowCount !== 1 ? 's' : ''} this month`,
            icon: UserX,
            iconClass: 'text-red-400',
            valueClass: loading ? undefined : (noShowRate > 20 ? 'text-red-600' : noShowRate > 10 ? 'text-amber-500' : undefined),
          },
          {
            label: 'Top Treatment',
            value: loading ? '—' : (treatmentData[0]?.treatment_type ?? '—'),
            sub: loading ? '' : (treatmentData[0] ? `${treatmentData[0].count}× this month` : 'no data yet'),
            icon: Stethoscope,
            iconClass: 'text-teal-600',
            smallValue: true,
          },
        ].map(card => (
          <div key={card.label} className="bg-gray-50 rounded-xl px-4 py-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide font-medium text-gray-400">
                {card.label}
              </span>
              <card.icon className={`w-4 h-4 ${card.iconClass}`} />
            </div>
            <p className={`font-semibold leading-tight ${card.valueClass ?? 'text-gray-900'} ${card.smallValue ? 'text-base' : 'text-2xl'}`}>
              {card.value}
            </p>
            <p className="text-[11px] text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue chart */}
        <SectionCard className="lg:col-span-2">
          <SectionHeader>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Revenue — Last 30 Days
            </h3>
          </SectionHeader>
          <div className="p-4">
            {loading
              ? <Pulse className="h-56" />
              : <RevenueChart data={revenueData} />
            }
          </div>
        </SectionCard>

        {/* Status donut */}
        <SectionCard>
          <SectionHeader>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Appointment Status
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{currentMonth}</p>
            </div>
          </SectionHeader>
          <div className="p-4">
            {loading
              ? <Pulse className="h-56" />
              : <StatusPieChart data={statusData} />
            }
          </div>
        </SectionCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top treatments */}
        <SectionCard>
          <SectionHeader>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5" />
                Top 5 Treatments
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{currentMonth}</p>
            </div>
          </SectionHeader>
          <div className="p-4">
            {loading
              ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Pulse key={i} className="h-8" />)}</div>
              : <TreatmentsList data={treatmentData} />
            }
          </div>
        </SectionCard>

        {/* No-show analysis — cleaned up, no giant number */}
        <SectionCard>
          <SectionHeader>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2">
                <UserX className="w-3.5 h-3.5" />
                No-show Analysis
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{currentMonth}</p>
            </div>
          </SectionHeader>
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Pulse key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-4">

                {/* Rate — calm, not giant */}
                <div className="flex items-end gap-3">
                  <p className={`text-4xl font-semibold leading-none ${rateColor}`}>
                    {stats.noShowRate}%
                  </p>
                  <p className="text-sm text-gray-400 mb-0.5">no-show rate</p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${Math.min(noShowRate, 100)}%` }}
                    />
                  </div>
                  <p className={`text-[11px] mt-1.5 ${rateColor}`}>{rateLabel}</p>
                </div>

                {/* 3-up mini stats */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: 'Total', value: stats.totalAppointmentsMonth, color: 'text-gray-900' },
                    { label: 'No-shows', value: stats.noShowCount, color: 'text-red-500' },
                    { label: 'Completed', value: completedCount, color: 'text-teal-600' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className={`text-lg font-semibold ${item.color}`}>{item.value}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}