'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RevenueDataPoint, AppointmentStatusCount, TreatmentCount } from '@/types';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import dynamic from 'next/dynamic';
import { TreatmentsList } from '@/components/reports/TreatmentsList';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatPeso } from '@/lib/utils';
import {
  TrendingUp, Calendar, UserX, Stethoscope,
  BarChart3, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const RevenueChart = dynamic(() => import('@/components/reports/RevenueChart').then((mod) => mod.RevenueChart), { ssr: false }) as any;
const StatusPieChart = dynamic(() => import('@/components/reports/StatusPieChart').then((mod) => mod.StatusPieChart), { ssr: false }) as any;

interface ReportStats {
  totalRevenueMonth: number;
  totalAppointmentsMonth: number;
  noShowCount: number;
  noShowRate: number;
  totalRevenueAllTime: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [statusData, setStatusData] = useState<AppointmentStatusCount[]>([]);
  const [treatmentData, setTreatmentData] = useState<TreatmentCount[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    totalRevenueMonth: 0,
    totalAppointmentsMonth: 0,
    noShowCount: 0,
    noShowRate: 0,
    totalRevenueAllTime: 0,
  });

  useEffect(() => { loadReports(); }, []);

  async function loadReports(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const supabase = createClient();
    const now = new Date();

    // ── Date ranges ────────────────────────────────────────
    // Last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split('T')[0];

    // ── Queries ────────────────────────────────────────────
    const [paymentsLast30, appointmentsMonth, paymentsAllTime] = await Promise.all([
      supabase
        .from('payments')
        .select('amount_paid, payment_date')
        .gte('payment_date', thirtyDaysAgoStr)
        .lte('payment_date', todayStr),
      supabase
        .from('appointments')
        .select('status, treatment_type')
        .gte('appointment_date', monthStart)
        .lte('appointment_date', monthEnd),
      supabase
        .from('payments')
        .select('amount_paid'),
    ]);

    // ── Revenue by day (last 30 days) ─────────────────────
    const revenueMap: Record<string, number> = {};
    // Pre-fill all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      revenueMap[key] = 0;
    }
    for (const p of paymentsLast30.data ?? []) {
      if (revenueMap[p.payment_date] !== undefined) {
        revenueMap[p.payment_date] += p.amount_paid;
      }
    }
    const revenueArr: RevenueDataPoint[] = Object.entries(revenueMap).map(([date, revenue]) => {
      const d = new Date(date + 'T00:00:00');
      return {
        date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        revenue,
      };
    });
    setRevenueData(revenueArr);

    // ── Appointments by status this month ─────────────────
    const statusMap: Record<string, number> = {};
    for (const appt of appointmentsMonth.data ?? []) {
      statusMap[appt.status] = (statusMap[appt.status] ?? 0) + 1;
    }
    const statusArr: AppointmentStatusCount[] = Object.entries(statusMap)
      .map(([status, count]) => ({ status: status as any, count }))
      .sort((a, b) => b.count - a.count);
    setStatusData(statusArr);

    // ── Top 5 treatments ─────────────────────────────────
    const treatMap: Record<string, number> = {};
    for (const appt of appointmentsMonth.data ?? []) {
      treatMap[appt.treatment_type] = (treatMap[appt.treatment_type] ?? 0) + 1;
    }
    const treatArr: TreatmentCount[] = Object.entries(treatMap)
      .map(([treatment_type, count]) => ({ treatment_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    setTreatmentData(treatArr);

    // ── Summary stats ─────────────────────────────────────
    const allAppts = appointmentsMonth.data ?? [];
    const totalAppts = allAppts.length;
    const noShows = allAppts.filter(a => a.status === 'No-show').length;
    const monthRevenue = (paymentsLast30.data ?? [])
      .filter(p => p.payment_date >= monthStart)
      .reduce((s, p) => s + p.amount_paid, 0);
    const allTimeRevenue = (paymentsAllTime.data ?? []).reduce((s, p) => s + p.amount_paid, 0);

    setStats({
      totalRevenueMonth: monthRevenue,
      totalAppointmentsMonth: totalAppts,
      noShowCount: noShows,
      noShowRate: totalAppts > 0 ? Math.round((noShows / totalAppts) * 100) : 0,
      totalRevenueAllTime: allTimeRevenue,
    });

    setLoading(false);
    setRefreshing(false);
  }

  const currentMonth = new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Clinic Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">Analytics for {currentMonth}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadReports(true)}
          loading={refreshing}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Summary stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">Revenue This Month</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatPeso(stats.totalRevenueMonth)}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">All time: {formatPeso(stats.totalRevenueAllTime)}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">Appointments</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalAppointmentsMonth}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">this month</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">No-show Rate</p>
                <p className={`text-xl font-bold mt-1 ${stats.noShowRate > 20 ? 'text-red-600' : stats.noShowRate > 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {stats.noShowRate}%
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <UserX className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{stats.noShowCount} no-show{stats.noShowCount !== 1 ? 's' : ''} this month</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">Top Treatment</p>
                <p className="text-sm font-bold text-gray-900 mt-1 leading-snug">
                  {treatmentData[0]?.treatment_type ?? '—'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-4 h-4 text-teal-700" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {treatmentData[0] ? `${treatmentData[0].count} times this month` : 'no data yet'}
            </p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue bar chart — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Revenue — Last 30 Days</h3>
            </div>
          </CardHeader>
          <CardBody>
            {loading
              ? <div className="h-56 bg-gray-50 animate-pulse rounded-xl" />
              : <RevenueChart data={revenueData} />
            }
          </CardBody>
        </Card>

        {/* Appointment status donut */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Appointments by Status</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{currentMonth}</p>
          </CardHeader>
          <CardBody>
            {loading
              ? <div className="h-56 bg-gray-50 animate-pulse rounded-xl" />
              : <StatusPieChart data={statusData} />
            }
          </CardBody>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 5 treatments */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Top 5 Treatments</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{currentMonth}</p>
          </CardHeader>
          <CardBody>
            {loading
              ? <div className="space-y-3">{[1,2,3,4,5].map(i => (
                  <div key={i} className="h-8 bg-gray-50 animate-pulse rounded-lg" />
                ))}</div>
              : <TreatmentsList data={treatmentData} />
            }
          </CardBody>
        </Card>

        {/* No-show detail */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">No-show Analysis</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{currentMonth}</p>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-50 animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Big rate display */}
                <div className="text-center py-4">
                  <p className={`text-6xl font-black ${
                    stats.noShowRate > 20 ? 'text-red-500'
                    : stats.noShowRate > 10 ? 'text-amber-500'
                    : 'text-teal-700'
                  }`}>
                    {stats.noShowRate}%
                  </p>
                  <p className="text-sm text-gray-500 mt-2">no-show rate this month</p>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Total Appts', value: stats.totalAppointmentsMonth, color: 'text-gray-900' },
                    { label: 'No-shows', value: stats.noShowCount, color: 'text-red-600' },
                    { label: 'Completed', value: statusData.find(s => s.status === 'Done')?.count ?? 0, color: 'text-green-600' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Rate indicator bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>No-show rate</span>
                    <span className={
                      stats.noShowRate > 20 ? 'text-red-500 font-medium'
                      : stats.noShowRate > 10 ? 'text-amber-500 font-medium'
                      : 'text-green-500 font-medium'
                    }>
                      {stats.noShowRate > 20 ? 'High — follow up with patients'
                        : stats.noShowRate > 10 ? 'Moderate — consider reminders'
                        : 'Good — keep it up!'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        stats.noShowRate > 20 ? 'bg-red-500'
                        : stats.noShowRate > 10 ? 'bg-amber-400'
                        : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stats.noShowRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
