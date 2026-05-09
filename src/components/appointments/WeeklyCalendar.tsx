'use client';

import { useState, useMemo, useRef } from 'react';
import { Appointment } from '@/types';
import { formatTime, getPatientName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LayoutList, GripVertical, CheckSquare, Square, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

const SLOT_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-50  border-blue-200  text-blue-800  hover:bg-blue-100',
  Confirmed: 'bg-teal-50  border-teal-200  text-teal-800  hover:bg-teal-100',
  Done:      'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
  'No-show': 'bg-red-50   border-red-200   text-red-800   hover:bg-red-100',
  Cancelled: 'bg-gray-50  border-gray-200  text-gray-500  hover:bg-gray-100',
};

const SLOT_DOT: Record<string, string> = {
  Scheduled: 'bg-blue-400',
  Confirmed:  'bg-teal-500',
  Done:       'bg-green-500',
  'No-show':  'bg-red-400',
  Cancelled:  'bg-gray-300',
};

const DRAG_OVER_COLORS: Record<string, string> = {
  Scheduled: 'ring-1 ring-blue-300 bg-blue-50/60',
  Confirmed: 'ring-1 ring-teal-300 bg-teal-50/60',
  Done:      'ring-1 ring-green-300 bg-green-50/60',
  'No-show': 'ring-1 ring-red-300 bg-red-50/60',
  Cancelled: 'ring-1 ring-gray-300 bg-gray-50/60',
};

const DAY_NAMES      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeeklyCalendarProps {
  appointments: Appointment[];
  loading?: boolean;
  onSelectAppointment: (appt: Appointment) => void;
  onReschedule?: (apptId: string, newDate: string, newTime: string) => Promise<void>;
  onBulkUpdated?: () => void;
  toast?: { success: (m: string) => void; error: (m: string) => void };
  referenceDate: Date;
  onWeekChange: (newDate: Date) => void;
}

function getWeekDates(referenceDate: Date): Date[] {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - day + (day === 0 ? -6 : 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

export function WeeklyCalendar({
  appointments,
  loading,
  onSelectAppointment,
  onReschedule,
  onBulkUpdated,
  toast,
  referenceDate,
  onWeekChange,
}: WeeklyCalendarProps) {
  const [view, setView] = useState<'week' | 'list'>('week');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [localAppts, setLocalAppts] = useState<Appointment[]>(appointments);
  const prevApptsRef = useRef(appointments);
  if (appointments !== prevApptsRef.current) {
    prevApptsRef.current = appointments;
    setLocalAppts(appointments);
  }

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingStatus, setDraggingStatus] = useState<string>('Scheduled');
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const pointerDownAt = useRef<Record<string, number>>({});

  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);
  const today = toDateStr(new Date());

  function prevWeek() { const d = new Date(referenceDate); d.setDate(d.getDate() - 7); onWeekChange(d); }
  function nextWeek() { const d = new Date(referenceDate); d.setDate(d.getDate() + 7); onWeekChange(d); }
  function goToday() { onWeekChange(new Date()); }

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of localAppts) {
      if (!map[appt.appointment_date]) map[appt.appointment_date] = [];
      map[appt.appointment_date].push(appt);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
    return map;
  }, [localAppts]);

  const allVisibleIds = useMemo(() =>
    weekDates.flatMap(date => (byDate[toDateStr(date)] ?? []).map(a => a.id)),
    [weekDates, byDate]
  );

  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() { allSelected ? setSelected(new Set()) : setSelected(new Set(allVisibleIds)); }
  function clearSelection() { setSelected(new Set()); }
  function switchView(v: 'week' | 'list') { setView(v); clearSelection(); }

  async function handleBulkUpdate(status: 'Done' | 'Cancelled') {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const supabase = createClient();
    const ids = Array.from(selected);
    const { error } = await supabase.from('appointments').update({ status }).in('id', ids);
    if (error) { toast?.error(`Failed to update appointments.`); }
    else { toast?.success(`${ids.length} appointment${ids.length > 1 ? 's' : ''} marked as ${status}.`); clearSelection(); onBulkUpdated?.(); }
    setBulkLoading(false);
  }

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekLabel =
    weekStart.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) +
    ' – ' +
    weekEnd.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  function handleDragStart(e: React.DragEvent, appt: Appointment) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('apptId', appt.id);
    e.dataTransfer.setData('apptTime', appt.appointment_time);
    setDraggingId(appt.id);
    setDraggingStatus(appt.status);
  }
  function handleDragEnd() { setDraggingId(null); setDraggingStatus('Scheduled'); setDropTarget(null); }
  function handleDragOver(e: React.DragEvent, dateStr: string) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget(dateStr); }
  function handleDragLeave(e: React.DragEvent) { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }

  async function handleDrop(e: React.DragEvent, newDateStr: string) {
    e.preventDefault();
    setDropTarget(null);
    const apptId = e.dataTransfer.getData('apptId');
    const apptTime = e.dataTransfer.getData('apptTime');
    if (!apptId || !onReschedule) return;
    const appt = localAppts.find((a) => a.id === apptId);
    if (!appt || appt.appointment_date === newDateStr) return;
    const snapshot = [...localAppts];
    setLocalAppts((prev) => prev.map((a) => a.id === apptId ? { ...a, appointment_date: newDateStr } : a));
    setSaving(apptId);
    try { await onReschedule(apptId, newDateStr, apptTime); }
    catch { setLocalAppts(snapshot); }
    finally { setSaving(null); setDraggingId(null); }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 space-y-3">
        <div className="h-6 w-40 bg-gray-100 animate-pulse rounded-lg" />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {/* Nav buttons */}
          <button
            onClick={prevWeek}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={nextWeek}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goToday}
            className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          >
            Today
          </button>
          <span className="text-[12px] font-medium text-gray-600 ml-1 hidden sm:inline">{weekLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          {onReschedule && view === 'week' && (
            <span className="text-[11px] text-gray-300 hidden sm:inline select-none tracking-tight">
              Drag to reschedule
            </span>
          )}
          {/* View toggle — pill style */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => switchView('week')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all',
                view === 'week'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Week
            </button>
            <button
              onClick={() => switchView('list')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1',
                view === 'list'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <LayoutList className="w-3 h-3" /> List
            </button>
          </div>
        </div>
      </div>

      {/* Mobile week label */}
      <div className="sm:hidden px-4 py-1.5 border-b border-gray-50">
        <p className="text-[11px] text-gray-400 font-medium">{weekLabel}</p>
      </div>

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div className="overflow-x-auto">
          <div className="min-w-[580px]">

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {weekDates.map((date, i) => {
                const dateStr = toDateStr(date);
                const isToday = dateStr === today;
                const count = byDate[dateStr]?.length ?? 0;
                return (
                  <div
                    key={i}
                    className={cn(
                      'px-1.5 py-2 text-center border-r border-gray-50 last:border-r-0',
                      isToday && 'bg-teal-50/60'
                    )}
                  >
                    <p className={cn('text-[10px] font-semibold uppercase tracking-wider', isToday ? 'text-teal-600' : 'text-gray-400')}>
                      {DAY_NAMES[date.getDay()]}
                    </p>
                    <p className={cn(
                      'text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center mx-auto rounded-full',
                      isToday ? 'bg-teal-700 text-white' : 'text-gray-700'
                    )}>
                      {date.getDate()}
                    </p>
                    {count > 0 && (
                      <span className="text-[10px] text-gray-400 tabular-nums">{count}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            <div className="grid grid-cols-7 min-h-[340px]">
              {weekDates.map((date, i) => {
                const dateStr = toDateStr(date);
                const isToday = dateStr === today;
                const dayAppts = byDate[dateStr] ?? [];
                const isOver = dropTarget === dateStr && draggingId !== null;

                return (
                  <div
                    key={i}
                    onDragOver={onReschedule ? (e) => handleDragOver(e, dateStr) : undefined}
                    onDragLeave={onReschedule ? handleDragLeave : undefined}
                    onDrop={onReschedule ? (e) => handleDrop(e, dateStr) : undefined}
                    className={cn(
                      'p-1.5 border-r border-gray-50 last:border-r-0 space-y-1 transition-colors duration-150',
                      isToday && 'bg-teal-50/20',
                      isOver && (DRAG_OVER_COLORS[draggingStatus] ?? 'ring-1 ring-teal-300 bg-teal-50/60'),
                    )}
                  >
                    {dayAppts.length === 0 && (
                      <div className={cn(
                        'h-full min-h-[60px] flex items-center justify-center rounded-xl transition-all',
                        isOver
                          ? 'border border-dashed border-teal-300'
                          : 'border border-dashed border-transparent'
                      )}>
                        {isOver
                          ? <p className="text-[10px] text-teal-500 font-semibold">Drop here</p>
                          : <p className="text-[10px] text-gray-200">—</p>
                        }
                      </div>
                    )}

                    {dayAppts.length > 0 && isOver && (
                      <div className="border border-dashed border-teal-300 rounded-xl py-1 text-center">
                        <p className="text-[10px] text-teal-500 font-semibold">Drop here</p>
                      </div>
                    )}

                    {dayAppts.map((appt) => {
                      const isDragging = draggingId === appt.id;
                      const isSaving = saving === appt.id;
                      return (
                        <div
                          key={appt.id}
                          draggable={!!onReschedule}
                          onDragStart={onReschedule ? (e) => handleDragStart(e, appt) : undefined}
                          onDragEnd={onReschedule ? handleDragEnd : undefined}
                          onPointerDown={() => { pointerDownAt.current[appt.id] = Date.now(); }}
                          onClick={() => {
                            const delta = Date.now() - (pointerDownAt.current[appt.id] ?? 0);
                            if (delta < 300) onSelectAppointment(appt);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && onSelectAppointment(appt)}
                          className={cn(
                            'group relative w-full text-left px-2 py-1.5 rounded-xl border text-[10px] transition-all select-none',
                            SLOT_COLORS[appt.status] ?? SLOT_COLORS.Scheduled,
                            isDragging && 'opacity-40 scale-95',
                            isSaving && 'opacity-60 animate-pulse pointer-events-none',
                            onReschedule && !isDragging && 'cursor-grab active:cursor-grabbing',
                          )}
                        >
                          {onReschedule && (
                            <GripVertical className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 opacity-0 group-hover:opacity-25 transition-opacity" />
                          )}
                          {/* Colored left accent dot */}
                          <div className="flex items-start gap-1.5">
                            <span className={cn('mt-[3px] w-1.5 h-1.5 rounded-full flex-shrink-0', SLOT_DOT[appt.status] ?? 'bg-gray-300')} />
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight truncate pr-3">{getPatientName(appt.patient)}</p>
                              <p className="mt-0.5 opacity-70 truncate">{formatTime(appt.appointment_time)}</p>
                              <p className="mt-0.5 opacity-50 truncate text-[9px]">{appt.treatment_type}</p>
                            </div>
                          </div>
                          {isSaving && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
                              <svg className="w-3 h-3 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
          {/* Select-all bar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/70">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-gray-500 hover:text-teal-700 transition-colors"
            >
              {allSelected
                ? <CheckSquare className="w-3.5 h-3.5 text-teal-700" />
                : <Square className="w-3.5 h-3.5 text-gray-300" />
              }
              <span className="text-[11px] font-semibold">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </button>
            {someSelected && (
              <span className="text-[11px] text-gray-400 tabular-nums">{selected.size} selected</span>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {weekDates.map((date, i) => {
              const dateStr = toDateStr(date);
              const isToday = dateStr === today;
              const dayAppts = byDate[dateStr] ?? [];
              return (
                <div key={i}>
                  {/* Day header */}
                  <div className={cn('px-4 py-1.5 flex items-center gap-2', isToday ? 'bg-teal-50/60' : 'bg-gray-50/60')}>
                    <p className={cn('text-[11px] font-semibold tracking-wide', isToday ? 'text-teal-700' : 'text-gray-500')}>
                      {FULL_DAY_NAMES[date.getDay()]},{' '}
                      {date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                    {isToday && (
                      <span className="text-[10px] bg-teal-700 text-white px-1.5 py-0.5 rounded-full font-semibold">Today</span>
                    )}
                  </div>

                  {dayAppts.length === 0 ? (
                    <p className="px-4 py-2.5 text-[11px] text-gray-300">No appointments</p>
                  ) : (
                    dayAppts.map((appt) => {
                      const isChecked = selected.has(appt.id);
                      return (
                        <div
                          key={appt.id}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 transition-colors',
                            isChecked ? 'bg-teal-50/60' : 'hover:bg-gray-50/70'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleOne(appt.id)}
                            className="flex-shrink-0 text-gray-300 hover:text-teal-700 transition-colors"
                          >
                            {isChecked
                              ? <CheckSquare className="w-3.5 h-3.5 text-teal-700" />
                              : <Square className="w-3.5 h-3.5" />
                            }
                          </button>
                          <button
                            onClick={() => onSelectAppointment(appt)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <div className="w-14 flex-shrink-0">
                              <p className="text-[11px] font-semibold text-gray-800 tabular-nums">
                                {formatTime(appt.appointment_time)}
                              </p>
                            </div>
                            {/* Status dot */}
                            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', SLOT_DOT[appt.status] ?? 'bg-gray-300')} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-gray-800 truncate">
                                {getPatientName(appt.patient)}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {appt.treatment_type}
                                {appt.dentist?.first_name ? ` · ${appt.dentist.first_name} ${appt.dentist.last_name ?? ''}`.trim() : ''}
                              </p>
                            </div>
                            <Badge label={appt.status} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── BULK ACTION BAR ── */}
      {view === 'list' && someSelected && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-teal-600/30 bg-teal-700 px-4 py-2.5
          flex items-center justify-between gap-3 flex-wrap
          shadow-[0_-4px_24px_rgba(15,110,86,0.18)]">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
            <span className="text-[12px] font-semibold text-white">
              {selected.size} appointment{selected.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkUpdate('Done')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-white text-teal-700 text-[11px] font-semibold
                hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              Mark as Done
            </button>
            <button
              type="button"
              onClick={() => handleBulkUpdate('Cancelled')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[11px] font-semibold
                border border-teal-500/60 hover:bg-teal-500 transition-colors disabled:opacity-50"
            >
              Mark as Cancelled
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="p-1.5 rounded-lg text-teal-300 hover:text-white hover:bg-teal-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50 flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(SLOT_DOT).map(([status, dotCls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', dotCls)} />
            <span className="text-[10px] text-gray-400 font-medium">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}