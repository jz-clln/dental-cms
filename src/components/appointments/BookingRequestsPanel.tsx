// src/components/appointments/BookingRequestsPanel.tsx
//
// UPDATE: patient matching on approval now calls the match_patient_by_phone
// SQL function (002_patient_phone_dedup.sql) instead of an exact string
// match on contact_number. That function compares the last 10 digits of
// the phone after stripping formatting, so "09171234567", "0917 123 4567"
// and "+63 917 123 4567" are all recognized as the same person and no
// duplicate patient is created.
//
// Approve flow (all via the normal browser Supabase client — staff is
// authenticated, so this follows the same direct-insert convention as
// AppointmentForm.tsx / PatientForm.tsx, no API route needed):
//   1. Call match_patient_by_phone(clinic_id, contact_number) via RPC.
//   2. If none, insert a new patients row from the request's info,
//      carrying over consent_given/consent_given_at from the request
//      (same RA 10173 consent captured on the public form).
//   3. Insert an appointments row (status 'Scheduled') for that patient.
//   4. Mark the booking_requests row 'approved', with matched_patient_id,
//      created_appointment_id, reviewed_by, reviewed_at.
//
// Decline just sets status 'declined' + reviewed_by/reviewed_at — no
// patient or appointment is created.
//
// Note: this does NOT run AppointmentForm's conflict-check (same
// dentist/date/time already booked). Approving is a manual staff action
// where they're already looking at the calendar context, but if you want
// the same conflict warning here, say so and I'll port that logic in.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookingRequest } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatDateShort, formatTime } from '@/lib/utils';
import { Inbox, Check, X, Phone, Mail, StickyNote, UserCheck } from 'lucide-react';

interface BookingRequestsPanelProps {
  clinicId: string;
  staffId: string;
  toast: { success: (m: string) => void; error: (m: string) => void };
  onApproved?: () => void; // parent can refetch the calendar
}

export function BookingRequestsPanel({ clinicId, staffId, toast, onApproved }: BookingRequestsPanelProps) {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('booking_requests')
      .select('*, dentist:dentists(id, name)')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setRequests((data ?? []) as BookingRequest[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`booking-requests-${clinicId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'booking_requests', filter: `clinic_id=eq.${clinicId}`,
      }, () => { load(); })
      .subscribe(status => { if (status === 'SUBSCRIBED') load(); });
    return () => { supabase.removeChannel(channel); };
  }, [clinicId, load]);

  async function handleApprove(req: BookingRequest) {
    setActingOn(req.id);
    const supabase = createClient();

    try {
      // 1. Find an existing patient by phone within this clinic — matched
      // on the last 10 digits after stripping formatting, so "0917…" and
      // "+63 917…" resolve to the same person. See match_patient_by_phone
      // in 002_patient_phone_dedup.sql.
      const { data: matches, error: matchError } = await supabase.rpc(
        'match_patient_by_phone',
        { p_clinic_id: clinicId, p_phone: req.contact_number }
      );
      if (matchError) throw matchError;

      let patientId = matches?.[0]?.id as string | undefined;

      // 2. Create the patient if none matched.
      if (!patientId) {
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            clinic_id: clinicId,
            first_name: req.first_name,
            last_name: req.last_name,
            contact_number: req.contact_number,
            email: req.email,
            consent_given: req.consent_given,
            consent_given_at: req.consent_given_at,
          })
          .select('id')
          .single();

        if (patientError || !newPatient) throw patientError ?? new Error('Failed to create patient.');
        patientId = newPatient.id;
      }

      // 3. Create the appointment.
      const { data: newAppt, error: apptError } = await supabase
        .from('appointments')
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          dentist_id: req.dentist_id,
          treatment_type: req.treatment_type,
          appointment_date: req.requested_date,
          appointment_time: req.requested_time,
          status: 'Scheduled',
          notes: req.notes,
        })
        .select('id')
        .single();

      if (apptError || !newAppt) throw apptError ?? new Error('Failed to create appointment.');

      // 4. Mark the request approved.
      const { error: updateError } = await supabase
        .from('booking_requests')
        .update({
          status: 'approved',
          matched_patient_id: patientId,
          created_appointment_id: newAppt.id,
          reviewed_by: staffId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', req.id);

      if (updateError) throw updateError;

      toast.success(`Booked ${req.first_name} ${req.last_name} in.`);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      onApproved?.();
    } catch (err) {
      console.error('[BookingRequestsPanel] approve failed:', err);
      toast.error('Failed to approve this request. Please try again.');
    } finally {
      setActingOn(null);
    }
  }

  async function handleDecline(req: BookingRequest) {
    setActingOn(req.id);
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_requests')
      .update({
        status: 'declined',
        reviewed_by: staffId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    if (error) {
      toast.error('Failed to decline this request.');
    } else {
      toast.success('Request declined.');
      setRequests(prev => prev.filter(r => r.id !== req.id));
    }
    setActingOn(null);
  }

  if (loading) {
    return <div className="py-14 text-center text-sm text-gray-400">Loading requests…</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="py-14 text-center">
        <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No pending booking requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <div
          key={req.id}
          className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-800">
                {req.first_name} {req.last_name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {req.contact_number}
                </span>
                {req.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {req.email}
                  </span>
                )}
              </div>

              <div className="mt-2.5 text-[13px] text-gray-700">
                <span className="font-medium">{req.treatment_type}</span> ·{' '}
                {formatDateShort(req.requested_date)} at {formatTime(req.requested_time)}
                {req.dentist && <> · with {req.dentist.name}</>}
                {!req.dentist_id && <> · no dentist preference</>}
              </div>

              {req.notes && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-gray-500">
                  <StickyNote className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {req.notes}
                </p>
              )}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDecline(req)}
                disabled={actingOn === req.id}
              >
                <X className="w-3.5 h-3.5" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove(req)}
                loading={actingOn === req.id}
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}