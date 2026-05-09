'use client';

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import { CalendarPlus, ChevronDown, Check } from 'lucide-react';

const STATUS_OPTIONS: AppointmentStatus[] = [
  'Scheduled', 'Confirmed', 'Done', 'No-show', 'Cancelled',
];

/* ── Custom Dropdown ── */
interface DropdownOption { label: string; value: string; }

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 rounded-xl border border-gray-200
          bg-white text-[11px] md:text-[12px] font-medium text-gray-600
          hover:border-gray-300 transition-colors focus:outline-none
          focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400
          whitespace-nowrap max-w-[105px] md:max-w-none"
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200
          shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden min-w-[140px] md:min-w-[160px]">
          {/* All / reset option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-gray-500
              hover:bg-gray-50 transition-colors"
          >
            {placeholder}
            {!value && <Check className="w-3 h-3 text-teal-600" />}
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-gray-700
                hover:bg-gray-50 transition-colors"
            >
              {opt.label}
              {value === opt.value && <Check className="w-3 h-3 text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

function isSameWeek(a: Date, b: Date): boolean {
  const { mon: monA } = getWeekBounds(a);
  const { mon: monB } = getWeekBounds(b);
  return monA.toDateString() === monB.toDateString();
}

/* ── Content ── */
function AppointmentsContent() {
  const toast = useAppToast();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists]         = useState<Dentist[]>([]);
  const [loading, setLoading]           = useState(true);
  const [clinicId, setClinicId]         = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());

  const { mon, sun } = useMemo(() => getWeekBounds(selectedWeek), [selectedWeek]);
  const isCurrentWeek = useMemo(() => isSameWeek(selectedWeek, new Date()), [selectedWeek]);

  const [filterDentist, setFilterDentist] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  const [selectedAppt, setSelectedAppt]       = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt]         = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from('staff').select('clinic_id').eq('auth_user_id', user.id).single();
      setClinicId(staffData?.clinic_id ?? null);
    }

    const weekStart = mon.toISOString().split('T')[0];
    const weekEnd   = sun.toISOString().split('T')[0];

    let query = supabase
      .from('appointments')
      .select('*, patient:patients(*), dentist:dentists(id, first_name, last_name)')
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
  }, [filterDentist, filterStatus, mon, sun]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && appointments.length > 0) {
      const found = appointments.find((a) => a.id === id);
      if (found) { setSelectedAppt(found); setShowDetailModal(true); }
    }
  }, [searchParams, appointments]);

  const handleReschedule = useCallback(async (apptId: string, newDate: string, newTime: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('appointments')
      .update({ appointment_date: newDate, appointment_time: newTime })
      .eq('id', apptId);
    if (error) { toast.error('Failed to reschedule.'); throw error; }
    toast.success('Appointment rescheduled.');
    load();
  }, [load, toast]);

  function openDetail(appt: Appointment) { setSelectedAppt(appt); setShowDetailModal(true); }
  function openEdit(appt: Appointment) {
    setEditingAppt(appt); setShowDetailModal(false); setShowEditModal(true);
  }

  const dentistOptions: DropdownOption[] = dentists.map(d => ({
    label: d.name,
    value: d.id,
  }));

  const statusOptions: DropdownOption[] = STATUS_OPTIONS.map(s => ({
    label: s,
    value: s,
  }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-1.5">
          <CustomDropdown
            options={dentistOptions}
            value={filterDentist}
            onChange={setFilterDentist}
            placeholder="All Dentists"
          />
          <CustomDropdown
            options={statusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="All Statuses"
          />
          {(filterDentist || filterStatus) && (
            <button
              onClick={() => { setFilterDentist(''); setFilterStatus(''); }}
              className="text-[11px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <Link href="/appointments/new" className="flex-shrink-0">
          <Button size="sm" className="p-1.5 md:text-[12px] md:px-3 md:py-1.5 md:gap-1.5">
            <CalendarPlus className="w-4 h-4 md:w-3.5 md:h-3.5" />
            <span className="hidden md:inline">New Appointment</span>
          </Button>
        </Link>
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

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-400">Loading appointments…</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}