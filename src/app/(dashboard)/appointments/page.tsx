'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
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
import { CalendarPlus } from 'lucide-react';

const STATUS_OPTIONS: AppointmentStatus[] = [
  'Scheduled',
  'Confirmed',
  'Done',
  'No-show',
  'Cancelled',
];

/* -------------------- CONTENT COMPONENT -------------------- */
function AppointmentsContent() {
  const toast = useAppToast();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const [filterDentist, setFilterDentist] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('clinic_id')
        .eq('auth_user_id', user.id)
        .single();

      setClinicId(staffData?.clinic_id ?? null);
    }

    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;

    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const weekStart = mon.toISOString().split('T')[0];
    const weekEnd = sun.toISOString().split('T')[0];

    let query = supabase
      .from('appointments')
      .select('*, patient:patients(*), dentist:dentists(name, id)')
      .gte('appointment_date', weekStart)
      .lte('appointment_date', weekEnd)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (filterDentist) query = query.eq('dentist_id', filterDentist);
    if (filterStatus) query = query.eq('status', filterStatus);

    const [apptRes, dentistRes] = await Promise.all([
      query,
      supabase.from('dentists').select('*').order('name'),
    ]);

    setAppointments((apptRes.data ?? []) as Appointment[]);
    setDentists((dentistRes.data ?? []) as Dentist[]);
    setLoading(false);
  }, [filterDentist, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

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

  function openDetail(appt: Appointment) {
    setSelectedAppt(appt);
    setShowDetailModal(true);
  }

  function openEdit(appt: Appointment) {
    setEditingAppt(appt);
    setShowDetailModal(false);
    setShowEditModal(true);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterDentist}
            onChange={(e) => setFilterDentist(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="">All Dentists</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {(filterDentist || filterStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterDentist('');
                setFilterStatus('');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Link href="/appointments/new">
          <Button size="sm">
            <CalendarPlus className="w-4 h-4" />
            New Appointment
          </Button>
        </Link>
      </div>

      <WeeklyCalendar
        appointments={appointments}
        loading={loading}
        onSelectAppointment={openDetail}
      />

      <Modal
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAppt(null);
        }}
        title="Appointment Details"
      >
        {selectedAppt && (
          <AppointmentCard
            appointment={selectedAppt}
            onUpdated={() => {
              load();
              setShowDetailModal(false);
            }}
            onEdit={() => openEdit(selectedAppt)}
            toast={toast}
          />
        )}
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAppt(null);
        }}
        title="Edit Appointment"
      >
        {editingAppt && clinicId && (
          <AppointmentForm
            clinicId={clinicId}
            existing={editingAppt}
            toast={toast}
            onSuccess={() => {
              load();
              setShowEditModal(false);
              setEditingAppt(null);
            }}
            onCancel={() => {
              setShowEditModal(false);
              setEditingAppt(null);
            }}
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