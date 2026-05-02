'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Appointment, Dentist, AppointmentStatus } from '@/types';
import { WeeklyCalendar } from '@/components/appointments/WeeklyCalendar';
import AppointmentCard from '@/components/appointments/AppointmentCard';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppToast } from '@/app/(dashboard)/layout';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS: AppointmentStatus[] = [
  'Scheduled',
  'Confirmed',
  'Done',
  'No-show',
  'Cancelled',
];

/* ── helpers ── */
function getWeekBounds(anchor: Date): { mon: Date; sun: Date } {
  const day = anchor.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(anchor);
  mon.setDate(anchor.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { mon, sun };
}

function formatWeekLabel(mon: Date, sun: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = mon.toLocaleDateString('en-US', opts);
  const end = sun.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${start} – ${end}`;
}

function isSameWeek(a: Date, b: Date): boolean {
  const { mon: monA } = getWeekBounds(a);
  const { mon: monB } = getWeekBounds(b);
  return monA.toDateString() === monB.toDateString();
}

/* -------------------- CONTENT COMPONENT -------------------- */
function AppointmentsContent() {
  const toast = useAppToast();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists]         = useState<Dentist[]>([]);
  const [loading, setLoading]           = useState(true);
  const [clinicId, setClinicId]         = useState<string | null>(null);

  // Week navigation
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());

  const { mon, sun } = useMemo(() => getWeekBounds(selectedWeek), [selectedWeek]);
  const weekLabel = useMemo(() => formatWeekLabel(mon, sun), [mon, sun]);
  const isCurrentWeek = useMemo(() => isSameWeek(selectedWeek, new Date()), [selectedWeek]);

  // Filters
  const [filterDentist, setFilterDentist] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  // Modals
  const [selectedAppt, setSelectedAppt]       = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt]         = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch clinic ID once (only needed for edit form)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('clinic_id')
        .eq('auth_user_id', user.id)
        .single();
      setClinicId(staffData?.clinic_id ?? null);
    }

    const { mon: weekMon, sun: weekSun } = getWeekBounds(selectedWeek);
    const weekStart = weekMon.toISOString().split('T')[0];
    const weekEnd   = weekSun.toISOString().split('T')[0];

    let query = supabase
      .from('appointments')
      .select('*, patient:patients(*), dentist:dentists(name, id)')
      .gte('appointment_date', weekStart)
      .lte('appointment_date', weekEnd)
      .order('appointment_date', { ascending: true })
      .order('appointment_time',  { ascending: true });

    if (filterDentist) query = query.eq('dentist_id', filterDentist);
    if (filterStatus)  query = query.eq('status', filterStatus);

    const [apptRes, dentistRes] = await Promise.all([
      query,
      supabase.from('dentists').select('*').order('name'),
    ]);

    setAppointments((apptRes.data ?? []) as Appointment[]);
    setDentists((dentistRes.data ?? []) as Dentist[]);
    setLoading(false);
  }, [filterDentist, filterStatus, selectedWeek]);

  useEffect(() => { load(); }, [load]);

  // Open detail modal if ?id= is in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && appointments.length > 0) {
      const found = appointments.find((a) => a.id === id);
      if (found) {
        setSelectedAppt(found);
        setShowDetailModal(true);
      }
    }
  }, [searchParams, appointments]);

  /* ── week navigation ── */
  function goToPrevWeek() {
    setSelectedWeek((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function goToNextWeek() {
    setSelectedWeek((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function goToToday() {
    setSelectedWeek(new Date());
  }

  /* ── reschedule (drag-drop) ── */
  const handleReschedule = useCallback(
    async (apptId: string, newDate: string, newTime: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: newDate, appointment_time: newTime })
        .eq('id', apptId);

      if (error) {
        toast.error('Failed to reschedule appointment. Please try again.');
        throw error;
      }

      toast.success('Appointment rescheduled successfully.');
      load();
    },
    [load, toast],
  );

  /* ── modal helpers ── */
  function openDetail(appt: Appointment) {
    setSelectedAppt(appt);
    setShowDetailModal(true);
  }

  function openEdit(appt: Appointment) {
    setEditingAppt(appt);
    setShowDetailModal(false);
    setShowEditModal(true);
  }

  const hasFilters = filterDentist || filterStatus;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">

        {/* Left: filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterDentist}
            onChange={(e) => setFilterDentist(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="">All Dentists</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterDentist(''); setFilterStatus(''); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Right: week nav + new appointment */}
        <div className="flex items-center gap-2">


          {/* Today button — only show when not on current week */}
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
          )}

          <Link href="/appointments/new">
            <Button size="sm">
              <CalendarPlus className="w-4 h-4" />
              New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Calendar */}
      <WeeklyCalendar
        appointments={appointments}
        loading={loading}
        onSelectAppointment={openDetail}
        onReschedule={handleReschedule}
        toast={toast}
        onBulkUpdated={() => load()}
        referenceDate={selectedWeek}
        onWeekChange={(d) => setSelectedWeek(d)}
      />

      {/* Detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedAppt(null); }}
        title="Appointment Details"
      >
        {selectedAppt && (
          <AppointmentCard
            appointment={selectedAppt}
            onUpdated={() => { load(); setShowDetailModal(false); }}
            onEdit={() => openEdit(selectedAppt)}
            onDeleted={() => { load(); setShowDetailModal(false); setSelectedAppt(null); }}
            toast={toast}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingAppt(null); }}
        title="Edit Appointment"
      >
        {editingAppt && clinicId && (
          <AppointmentForm
            clinicId={clinicId}
            existing={editingAppt}
            toast={toast}
            onSuccess={() => { load(); setShowEditModal(false); setEditingAppt(null); }}
            onCancel={() => { setShowEditModal(false); setEditingAppt(null); }}
          />
        )}
      </Modal>
    </div>
  );
}

/* -------------------- WRAPPER -------------------- */
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading appointments...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}