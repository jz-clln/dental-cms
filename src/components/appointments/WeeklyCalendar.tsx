'use client';

import { useState, useMemo } from 'react';
import { Appointment } from '@/types';
import { formatTime, getPatientName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';

// Color by status for calendar slots
const SLOT_COLORS: Record<string, string> = {
  Scheduled:  'bg-blue-50  border-blue-200  text-blue-800  hover:bg-blue-100',
  Confirmed:  'bg-teal-50  border-teal-200  text-teal-800  hover:bg-teal-100',
  Done:       'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
  'No-show':  'bg-red-50   border-red-200   text-red-800   hover:bg-red-100',
  Cancelled:  'bg-gray-50  border-gray-200  text-gray-500  hover:bg-gray-100',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeeklyCalendarProps {
  appointments: Appointment[];
  loading?: boolean;
  onSelectAppointment: (appt: Appointment) => void;
}

function getWeekDates(referenceDate: Date): Date[] {
  const day = referenceDate.getDay(); // 0 = Sun
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

export function WeeklyCalendar({ appointments, loading, onSelectAppointment }: WeeklyCalendarProps) {
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'list'>('week');

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
    for (const appt of appointments) {
      if (!map[appt.appointment_date]) map[appt.appointment_date] = [];
      map[appt.appointment_date].push(appt);
    }
    // Sort each day by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
    return map;
  }, [appointments]);

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekLabel = weekStart.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })
    + ' – '
    + weekEnd.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

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
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'week' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50')}
            >
              Week
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                view === 'list' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50')}
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

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
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
                      'px-2 py-3 text-center border-r border-gray-50 last:border-r-0',
                      isToday && 'bg-teal-50'
                    )}
                  >
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

            {/* Appointment slots */}
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDates.map((date, i) => {
                const dateStr = toDateStr(date);
                const isToday = dateStr === today;
                const dayAppts = byDate[dateStr] ?? [];
                return (
                  <div
                    key={i}
                    className={cn(
                      'p-2 border-r border-gray-50 last:border-r-0 space-y-1.5',
                      isToday && 'bg-teal-50/30'
                    )}
                  >
                    {dayAppts.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs text-gray-200 text-center">—</p>
                      </div>
                    )}
                    {dayAppts.map(appt => (
                      <button
                        key={appt.id}
                        onClick={() => onSelectAppointment(appt)}
                        className={cn(
                          'w-full text-left p-2 rounded-lg border text-xs transition-all',
                          SLOT_COLORS[appt.status] ?? SLOT_COLORS.Scheduled
                        )}
                      >
                        <p className="font-semibold leading-tight truncate">
                          {getPatientName(appt.patient)}
                        </p>
                        <p className="mt-0.5 opacity-75 truncate">{formatTime(appt.appointment_time)}</p>
                        <p className="mt-0.5 opacity-60 truncate text-[10px]">{appt.treatment_type}</p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="divide-y divide-gray-50">
          {weekDates.map((date, i) => {
            const dateStr = toDateStr(date);
            const isToday = dateStr === today;
            const dayAppts = byDate[dateStr] ?? [];
            return (
              <div key={i}>
                {/* Day label */}
                <div className={cn(
                  'px-5 py-2 flex items-center gap-3',
                  isToday ? 'bg-teal-50' : 'bg-gray-50'
                )}>
                  <p className={cn('text-sm font-semibold', isToday ? 'text-teal-700' : 'text-gray-500')}>
                    {FULL_DAY_NAMES[date.getDay()]}, {date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </p>
                  {isToday && (
                    <span className="text-xs bg-teal-700 text-white px-2 py-0.5 rounded-full">Today</span>
                  )}
                </div>

                {dayAppts.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-gray-300">No appointments</p>
                ) : (
                  dayAppts.map(appt => (
                    <button
                      key={appt.id}
                      onClick={() => onSelectAppointment(appt)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-16 flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{formatTime(appt.appointment_time)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{getPatientName(appt.patient)}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {appt.treatment_type}
                          {appt.dentist?.name ? ` · ${appt.dentist.name}` : ''}
                        </p>
                      </div>
                      <Badge label={appt.status} />
                    </button>
                  ))
                )}
              </div>
            );
          })}
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
