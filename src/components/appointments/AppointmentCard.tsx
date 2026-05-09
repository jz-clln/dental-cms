'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Appointment, AppointmentStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatDate, formatTime, getPatientName } from '@/lib/utils';
import { User, Stethoscope, Clock, FileText, CalendarDays, Trash2 } from 'lucide-react';

const STATUSES: AppointmentStatus[] = ['Scheduled', 'Confirmed', 'Done', 'No-show', 'Cancelled'];

interface AppointmentCardProps {
  appointment: Appointment;
  onUpdated: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

const AppointmentCard = React.memo(function AppointmentCard({
  appointment, onUpdated, onEdit, onDeleted, toast,
}: AppointmentCardProps) {
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleStatusChange(newStatus: AppointmentStatus) {
    setStatus(newStatus);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointment.id);

    if (error) {
      toast.error('Failed to update status.');
      setStatus(appointment.status);
    } else {
      toast.success(`Status updated to ${newStatus}.`);
      onUpdated();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointment.id);

    if (error) {
      toast.error('Failed to delete appointment.');
      setDeleting(false);
      return;
    }

    toast.success('Appointment deleted.');
    setDeleting(false);
    setShowDeleteConfirm(false);
    onDeleted();
  }

  return (
    <>
      <div className="space-y-5">
        {/* Patient */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <span className="text-teal-700 font-semibold text-sm">
              {appointment.patient
                ? `${appointment.patient.first_name?.[0] ?? ''}${appointment.patient.last_name?.[0] ?? ''}` || 'P'
                : 'P'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{getPatientName(appointment.patient)}</p>
            {appointment.patient?.contact_number && (          // ← this line
              <p className="text-xs text-gray-500">{appointment.patient.contact_number}</p>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Date</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(appointment.appointment_date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Time</p>
              <p className="text-sm font-medium text-gray-900">{formatTime(appointment.appointment_time)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Treatment</p>
              <p className="text-sm font-medium text-gray-900">{appointment.treatment_type}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Dentist</p>
              <p className="text-sm font-medium text-gray-900">
                {appointment.dentist
                  ? `${appointment.dentist.first_name} ${appointment.dentist.last_name ?? ''}`.trim()
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <FileText className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">{appointment.notes}</p>
          </div>
        )}

        {/* Status updater */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={saving}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                  ${status === s
                    ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400
              hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit Appointment
          </Button>
        </div>
      </div>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Appointment"
        message={`Delete ${getPatientName(appointment.patient)}'s appointment on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)}? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </>
  );
});

export default AppointmentCard;