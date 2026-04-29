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

const DRAG_OVER_COLORS: Record<string, string> = {
  Scheduled: 'ring-2 ring-blue-400  bg-blue-100',
  Confirmed: 'ring-2 ring-teal-400  bg-teal-100',
  Done:      'ring-2 ring-green-400 bg-green-100',
  'No-show': 'ring-2 ring-red-400   bg-red-100',
  Cancelled: 'ring-2 ring-gray-400  bg-gray-100',
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
  return d.toISOString().split('T')[0];
}

export function WeeklyCalendar({
  appointments,
  loading,
  onSelectAppointment,
  onReschedule,
  onBulkUpdated,
  toast,
}: WeeklyCalendarProps) {
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'list'>('week');

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Optimistic local state
  const [localAppts, setLocalAppts] = useState<Appointment[]>(appointments);
  const prevApptsRef = useRef(appointments);
  if (appointments !== prevApptsRef.current) {
    prevApptsRef.current = appointments;
    setLocalAppts(appointments);
  }

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingStatus, setDraggingStatus] = useState<string>('Scheduled');
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);
  const today = toDateStr(new Date());

  function prevWeek() {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 7);
    setReferenceDate(d);
  }
  function nextWeek() {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 7);
    setReferenceDate(d);
  }
  function goToday() { setReferenceDate(new Date()); }

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

  // All visible appointments in list view (for select all)
  const allVisibleIds = useMemo(() => {
    return weekDates.flatMap(date => (byDate[toDateStr(date)] ?? []).map(a => a.id));
  }, [weekDates, byDate]);

  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allVisibleIds));
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // Switch view — clear selection
  function switchView(v: 'week' | 'list') {
    setView(v);
    clearSelection();
  }

  async function handleBulkUpdate(status: 'Done' | 'Cancelled') {
    if (selected.size === 0) return;
    setBulkLoading(true);

    const supabase = createClient();
    const ids = Array.from(selected);

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .in('id', ids);

    if (error) {
      toast?.error(`Failed to update appointments.`);
    } else {
      toast?.success(`${ids.length} appointment${ids.length > 1 ? 's' : ''} marked as ${status}.`);
      clearSelection();
      onBulkUpdated?.();
    }

    setBulkLoading(false);
  }

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekLabel =
    weekStart.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' }) +
    ' – ' +
    weekEnd.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  /* ── drag handlers ── */
  function handleDragStart(e: React.DragEvent, appt: Appointment) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('apptId', appt.id);
    e.dataTransfer.setData('apptTime', appt.appointment_time);
    setDraggingId(appt.id);
    setDraggingStatus(appt.status);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDraggingStatus('Scheduled');
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(dateStr);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }

  async function handleDrop(e: React.DragEvent, newDateStr: string) {
    e.preventDefault();
    setDropTarget(null);

    const apptId = e.dataTransfer.getData('apptId');
    const apptTime = e.dataTransfer.getData('apptTime');
    if (!apptId || !onReschedule) return;

    const appt = localAppts.find((a) => a.id === apptId);
    if (!appt) return;
    if (appt.appointment_date === newDateStr) return;

    const snapshot = [...localAppts];
    setLocalAppts((prev) =>
      prev.map((a) => a.id === apptId ? { ...a, appointment_date: newDateStr } : a)
    );

    setSaving(apptId);
    try {
      await onReschedule(apptId, newDateStr, apptTime);
    } catch {
      setLocalAppts(snapshot);
    } finally {
      setSaving(null);
      setDraggingId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="h-8 w-48 bg-gray-100 animate-pulse rounded-lg" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-teal-700">
            Today
          </Button>
          <span className="text-sm font-medium text-gray-700 ml-1 hidden sm:inline">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {onReschedule && view === 'week' && (
            <span className="text-xs text-gray-400 hidden sm:inline select-none">
              Drag appointments to reschedule
            </span>
          )}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => switchView('week')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'week' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              Week
            </button>
            <button
              onClick={() => switchView('list')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                view === 'list' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <LayoutList className="w-3 h-3" /> List
            </button>
          </div>
        </div>
      </div>

      {/* Week label (mobile) */}
      <div className="sm:hidden px-5 py-2 border-b border-gray-50">
        <p className="text-xs text-gray-500 font-medium">{weekLabel}</p>
      </div>

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {weekDates.map((date, i) => {
                const dateStr = toDateStr(date);
                const isToday = dateStr === today;
                const count = byDate[dateStr]?.length ?? 0;
                return (
                  <div key={i} className={cn('px-2 py-3 text-center border-r border-gray-50 last:border-r-0', isToday && 'bg-teal-50')}>
                    <p className={cn('text-xs font-medium', isToday ? 'text-teal-700' : 'text-gray-400')}>
                      {DAY_NAMES[date.getDay()]}
                    </p>
                    <p className={cn(
                      'text-lg font-bold mt-0.5 w-8 h-8 flex items-center justify-center mx-auto rounded-full',
                      isToday ? 'bg-teal-700 text-white' : 'text-gray-800'
                    )}>
                      {date.getDate()}
                    </p>
                    {count > 0 && (
                      <span className="text-xs text-gray-400">{count} appt{count > 1 ? 's' : ''}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 min-h-[400px]">
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
                      'p-2 border-r border-gray-50 last:border-r-0 space-y-1.5 transition-colors duration-150',
                      isToday && 'bg-teal-50/30',
                      isOver && (DRAG_OVER_COLORS[draggingStatus] ?? 'ring-2 ring-teal-400 bg-teal-50'),
                    )}
                  >
                    {dayAppts.length === 0 && (
                      <div className={cn(
                        'h-full min-h-[80px] flex items-center justify-center rounded-lg transition-all',
                        isOver ? 'border-2 border-dashed border-teal-400' : 'border-2 border-dashed border-transparent'
                      )}>
                        {isOver
                          ? <p className="text-xs text-teal-600 font-medium">Drop here</p>
                          : <p className="text-xs text-gray-200">—</p>
                        }
                      </div>
                    )}

                    {dayAppts.length > 0 && isOver && (
                      <div className="border-2 border-dashed border-teal-400 rounded-lg py-1.5 text-center">
                        <p className="text-xs text-teal-600 font-medium">Drop here</p>
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
                          onPointerDown={() => { (appt as any).__pointerDownAt = Date.now(); }}
                          onClick={() => {
                            const delta = Date.now() - ((appt as any).__pointerDownAt ?? 0);
                            if (delta < 300) onSelectAppointment(appt);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && onSelectAppointment(appt)}
                          className={cn(
                            'group relative w-full text-left p-2 rounded-lg border text-xs transition-all select-none',
                            SLOT_COLORS[appt.status] ?? SLOT_COLORS.Scheduled,
                            isDragging && 'opacity-40 scale-95 shadow-inner',
                            isSaving && 'opacity-60 animate-pulse pointer-events-none',
                            onReschedule && !isDragging && 'cursor-grab active:cursor-grabbing',
                          )}
                        >
                          {onReschedule && (
                            <GripVertical className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
                          )}
                          <div className="w-full">
                            <p className="font-semibold leading-tight truncate pr-3">{getPatientName(appt.patient)}</p>
                            <p className="mt-0.5 opacity-75 truncate">{formatTime(appt.appointment_time)}</p>
                            <p className="mt-0.5 opacity-60 truncate text-[10px]">{appt.treatment_type}</p>
                          </div>
                          {isSaving && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
                              <svg className="w-3.5 h-3.5 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
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
          {/* Select all bar */}
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-700 transition-colors"
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-teal-700" />
                : <Square className="w-4 h-4 text-gray-400" />
              }
              <span className="text-xs font-medium">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </button>
            {someSelected && (
              <span className="text-xs text-gray-400">
                {selected.size} selected
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {weekDates.map((date, i) => {
              const dateStr = toDateStr(date);
              const isToday = dateStr === today;
              const dayAppts = byDate[dateStr] ?? [];
              return (
                <div key={i}>
                  <div className={cn('px-5 py-2 flex items-center gap-3', isToday ? 'bg-teal-50' : 'bg-gray-50')}>
                    <p className={cn('text-sm font-semibold', isToday ? 'text-teal-700' : 'text-gray-500')}>
                      {FULL_DAY_NAMES[date.getDay()]},{' '}
                      {date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                    {isToday && (
                      <span className="text-xs bg-teal-700 text-white px-2 py-0.5 rounded-full">Today</span>
                    )}
                  </div>

                  {dayAppts.length === 0 ? (
                    <p className="px-5 py-3 text-sm text-gray-300">No appointments</p>
                  ) : (
                    dayAppts.map((appt) => {
                      const isChecked = selected.has(appt.id);
                      return (
                        <div
                          key={appt.id}
                          className={cn(
                            'flex items-center gap-3 px-5 py-3.5 transition-colors',
                            isChecked ? 'bg-teal-50' : 'hover:bg-gray-50'
                          )}
                        >
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleOne(appt.id)}
                            className="flex-shrink-0 text-gray-400 hover:text-teal-700 transition-colors"
                          >
                            {isChecked
                              ? <CheckSquare className="w-4 h-4 text-teal-700" />
                              : <Square className="w-4 h-4" />
                            }
                          </button>

                          {/* Row content — clicking opens detail */}
                          <button
                            onClick={() => onSelectAppointment(appt)}
                            className="flex items-center gap-4 flex-1 min-w-0 text-left"
                          >
                            <div className="w-16 flex-shrink-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatTime(appt.appointment_time)}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {getPatientName(appt.patient)}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {appt.treatment_type}
                                {appt.dentist?.name ? ` · ${appt.dentist.name}` : ''}
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
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-teal-100 bg-teal-700 px-5 py-3
          flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-teal-200" />
            <span className="text-sm font-medium text-white">
              {selected.size} appointment{selected.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkUpdate('Done')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-white text-teal-700 text-xs font-semibold
                hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              Mark as Done
            </button>
            <button
              type="button"
              onClick={() => handleBulkUpdate('Cancelled')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold
                border border-teal-500 hover:bg-teal-500 transition-colors disabled:opacity-50"
            >
              Mark as Cancelled
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-5 py-3 border-t border-gray-50 bg-gray-50 flex flex-wrap gap-3">
        {Object.entries(SLOT_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded-sm border', cls)} />
            <span className="text-xs text-gray-500">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}