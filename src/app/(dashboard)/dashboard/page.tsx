'use client';

import { useEffect, useState } from 'react';
import { useClinicId } from '@/lib/hooks/useClinicId';
import { useToast } from '@/lib/hooks/useToast';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Appointment, ActivityItem } from '@/types';
import StatCard from '@/components/dashboard/StatCard';
import { AppointmentList } from '@/components/dashboard/AppointmentList';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
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

export default function DashboardPage() {
  const { clinicId, loading: clinicLoading } = useClinicId();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({ todaysAppointments: 0, totalPatients: 0, lowStockAlerts: 0, revenueThisWeek: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clinicLoading) return;
    loadDashboard();
  }, [clinicId]);

  useEffect(() => {
    const handleFocus = () => loadDashboard();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [clinicId]);

async function loadDashboard() {
    if (!clinicId) return;
    try {
      const supabase = createClient();
      const today = getTodayString();

      // Get week range (Mon–Sun)
      const now = new Date();
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now); mon.setDate(now.getDate() + diffToMon);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const weekStart = mon.toISOString().split('T')[0];
      const weekEnd = sun.toISOString().split('T')[0];

      // Run all queries in parallel - add clinic_id filter (RLS + explicit)
      const [
        apptToday,
        apptFull,
        patients,
        inventory,
        payments,
        recentAppts,
        recentPatients,
        recentPayments,
      ] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('appointment_date', today),
        supabase.from('appointments').select('*, patient:patients(*), dentist:dentists(*)').eq('clinic_id', clinicId).eq('appointment_date', today).order('appointment_time'),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('inventory_items').select('id, quantity, reorder_level').eq('clinic_id', clinicId),
        supabase.from('payments').select('amount_paid').eq('clinic_id', clinicId).gte('payment_date', weekStart).lte('payment_date', weekEnd),
        supabase.from('appointments').select('*, patient:patients(first_name, last_name)').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(5),
        supabase.from('patients').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(3),
        supabase.from('payments').select('*, patient:patients(first_name, last_name)').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(3),
      ]);

    // Low stock count
    const lowStock = (inventory.data ?? []).filter(i => i.quantity <= i.reorder_level).length;

    // Weekly revenue
    const revenue = (payments.data ?? []).reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);

    setStats({
      todaysAppointments: apptToday.count ?? 0,
      totalPatients: patients.count ?? 0,
      lowStockAlerts: lowStock,
      revenueThisWeek: revenue,
    });

    setAppointments((apptFull.data ?? []) as Appointment[]);

    // Build activity feed
    const items: ActivityItem[] = [];

    (recentAppts.data ?? []).forEach(a => {
      items.push({
        id: `appt-${a.id}`,
        type: 'appointment',
        description: `Appointment scheduled — ${getPatientName(a.patient as any)} for ${a.treatment_type}`,
        timestamp: a.created_at,
      });
    });

    (recentPatients.data ?? []).forEach(p => {
      items.push({
        id: `pat-${p.id}`,
        type: 'patient',
        description: `New patient added — ${getPatientName(p)}`,
        timestamp: p.created_at,
      });
    });

    (recentPayments.data ?? []).forEach(p => {
      items.push({
        id: `pay-${p.id}`,
        type: 'payment',
        description: `Payment received — ${getPatientName(p.patient as any)} paid ${formatPeso(p.amount_paid)}`,
        timestamp: p.created_at,
      });
    });

    // Sort by timestamp descending, take top 8
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivity(items.slice(0, 8));

      toast.success('Dashboard updated');
    } catch (error) {
      console.error('Dashboard load error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Good {getGreeting()} 👋</h2>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening at your clinic today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Appointments"
          value={stats.todaysAppointments}
          icon={Calendar}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          sub="scheduled for today"
          loading={loading}
        />
        <StatCard
          label="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          iconColor="text-teal-700"
          iconBg="bg-teal-50"
          sub="registered patients"
          loading={loading}
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats.lowStockAlerts}
          icon={Package}
          iconColor={stats.lowStockAlerts > 0 ? 'text-red-600' : 'text-gray-500'}
          iconBg={stats.lowStockAlerts > 0 ? 'bg-red-50' : 'bg-gray-50'}
          sub={stats.lowStockAlerts > 0 ? 'items need restocking' : 'all stock levels ok'}
          loading={loading}
        />
        <StatCard
          label="Revenue This Week"
          value={formatPeso(stats.revenueThisWeek)}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          sub="Mon – Sun"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/patients/new', label: 'Add Patient', icon: UserPlus, color: 'text-teal-700 bg-teal-50 hover:bg-teal-100' },
          { href: '/appointments/new', label: 'Add Appointment', icon: CalendarPlus, color: 'text-blue-700 bg-blue-50 hover:bg-blue-100' },
          { href: '/inventory', label: 'Add Supply', icon: BoxIcon, color: 'text-amber-700 bg-amber-50 hover:bg-amber-100' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-4 py-3.5 rounded-xl font-medium text-sm transition-colors ${action.color}`}
          >
            <action.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-center sm:text-left leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Bottom Row: Appointments + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Today's Appointments */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Today's Appointments</h3>
              <Link href="/appointments" className="text-xs text-teal-700 hover:underline font-medium">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardBody className="py-2">
            <AppointmentList appointments={appointments} loading={loading} />
          </CardBody>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </CardHeader>
          <CardBody className="py-2">
            <ActivityFeed items={activity} loading={loading} />
          </CardBody>
        </Card>

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
