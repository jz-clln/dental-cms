'use client';

import Link from 'next/link';
import { Appointment } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatTime, getPatientName } from '@/lib/utils';
import { Calendar, ChevronRight } from 'lucide-react';

interface AppointmentListProps {
  appointments: Appointment[];
  loading?: boolean;
}

export function AppointmentList({ appointments, loading }: AppointmentListProps) {
  if (loading) return <SkeletonTable rows={4} />;

  if (appointments.length === 0) {
    return (
      <div className="text-center py-10">
        <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No appointments scheduled for today</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {appointments.map(appt => (
        <Link
          key={appt.id}
          href={`/appointments?id=${appt.id}`}
          className="flex items-center gap-4 py-3.5 px-1 hover:bg-gray-50 rounded-lg transition-colors group"
        >
          {/* Time */}
          <div className="w-16 text-center flex-shrink-0">
            <p className="text-sm font-semibold text-gray-900">{formatTime(appt.appointment_time)}</p>
          </div>

          {/* Divider dot */}
          <div className="w-2 h-2 rounded-full bg-teal-200 flex-shrink-0" />

          {/* Patient + treatment */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {getPatientName(appt.patient)}
            </p>
            <p className="text-xs text-gray-500 truncate">{appt.treatment_type}</p>
          </div>

          {/* Dentist */}
          <p className="hidden sm:block text-xs text-gray-400 flex-shrink-0 max-w-[100px] truncate">
            {appt.dentist?.name ?? '—'}
          </p>

          {/* Status */}
          <Badge label={appt.status} />

          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
        </Link>
      ))}
    </div>
  );
}
