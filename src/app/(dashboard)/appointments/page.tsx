//src\app\(dashboard)\appointments\page.tsx
//
// UPDATE: added a Calendar / Requests view toggle. "Requests" shows
// pending QR self-booking submissions (BookingRequestsPanel.tsx) with a
// badge for the pending count, polled on an interval so new requests
// show up without a manual refresh. Approving a request re-triggers
// load() so the newly-created appointment appears on the calendar right
// away if you switch back.
//
// currentStaff/clinicId is now also fetched here (previously clinicId
// alone), since BookingRequestsPanel needs staffId for reviewed_by.

'use client';

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Appointment, Dentist, AppointmentStatus } from '@/types';
import { WeeklyCalendar } from '@/components/appointments/WeeklyCalendar';
import AppointmentCard from '@/components/appointments/AppointmentCard';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { BookingRequestsPanel } from '@/components/appointments/BookingRequestsPanel';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppToast } from '@/app/(dashboard)/layout';
import { CalendarPlus, ChevronDown, Check, CalendarDays, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: AppointmentStatus[] = [
  'Scheduled', 'Confirmed', 'Done', 'No-show', 'Cancelled',
];

// Poll interval for the pending-requests badge, in ms. Cheap head-count
// query (see loadPendingCount below) — not the full request list.
const PENDING_POLL_MS = 30_000;

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

/* ── View toggle (Calendar / Requests) ── */
function ViewToggle({
  view,
  onChange,
  pendingCount,
}: {
  view: 'calendar' | 'requests';
  onChange: (v: 'calendar' | 'requests') => void;
  pendingCount: number;
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white flex-shrink-0">
      <button
        type="button"
        onClick={() => onChange('calendar')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] md:text-[12px] font-semibold transition-colors',
          view === 'calendar' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50'
        )}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Calendar</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('requests')}
        className={cn(
          'relative flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] md:text-[12px] font-semibold transition-colors',
          view === 'requests' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50'
        )}
      >
        <Inbox className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Requests</span>
        {pendingCount > 0 && (
          <span className={cn(
            'flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold',
            view === 'requests' ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
          )}>
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>
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
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists]         = useState<Dentist[]>([]);
  const [loading, setLoading]           = useState(true);
  const [clinicId, setClinicId]         = useState<string | null>(null);
  const [staffId, setStaffId]           = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());

  const view = searchParams.get('view') === 'requests' ? 'requests' : 'calendar';
  function setView(nextView: 'calendar' | 'requests') {
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === 'requests') params.set('view', 'requests');
    else params.delete('view');
    router.replace(`/appointments${params.size ? `?${params.toString()}` : ''}`, { scroll: false });
  }
  const [pendingCount, setPendingCount] = useState(0);

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
        .from('staff').select('id, clinic_id').eq('auth_user_id', user.id).single();
      setClinicId(staffData?.clinic_id ?? null);
      setStaffId(staffData?.id ?? null);
    }

    const weekStart = mon.toISOString().split('T')[0];
    const weekEnd   = sun.toISOString().split('T')[0];

    // FIX: dentist:dentists(id, first_name, last_name) — those two columns
    // are never actually written (DentistsPanel's form only saves a single
    // `name` field), so this join always came back null and every
    // appointment showed "no dentist" in the calendar/list/detail views.
    // Selecting `name` instead, to match DentistJoin (types/index.ts) and
    // how AppointmentCard / usePrintSchedule now read it too.
    let query = supabase
      .from('appointments')
      .select('*, patient:patients(*), dentist:dentists(id, name)')
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

  // Pending booking-requests count, for the Requests tab badge. Cheap
  // head-only query, polled so front-desk staff notice new requests
  // without needing to switch tabs.
  const loadPendingCount = useCallback(async () => {
    if (!clinicId) return;
    const supabase = createClient();
    const { count } = await supabase
      .from('booking_requests')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    loadPendingCount();
    const interval = setInterval(loadPendingCount, PENDING_POLL_MS);
    const supabase = createClient();
    const channel = supabase
      .channel(`booking-count-${clinicId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'booking_requests', filter: `clinic_id=eq.${clinicId}`,
      }, () => { loadPendingCount(); })
      .subscribe(status => { if (status === 'SUBSCRIBED') loadPendingCount(); });
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [clinicId, loadPendingCount]);

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
      <div className="flex items-center gap-2 justify-between flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <ViewToggle view={view} onChange={setView} pendingCount={pendingCount} />

          {view === 'calendar' && (
            <>
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
            </>
          )}
        </div>

        {view === 'calendar' && (
          <Link href="/appointments/new" className="flex-shrink-0">
            <Button size="sm" className="p-1.5 md:text-[12px] md:px-3 md:py-1.5 md:gap-1.5">
              <CalendarPlus className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span className="hidden md:inline">New Appointment</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
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
      )}

      {/* Requests view */}
      {view === 'requests' && clinicId && staffId && (
        <BookingRequestsPanel
          clinicId={clinicId}
          staffId={staffId}
          toast={toast}
          onApproved={() => { load(); loadPendingCount(); }}
        />
      )}

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