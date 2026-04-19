'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Billing, Payment, VisitNote, Appointment } from '@/types';
import { formatDate, formatTime, formatPeso, getBillingStatus } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Stethoscope, FileText, Receipt, CreditCard,
  ChevronDown, ChevronUp, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  date: string;
  time?: string;
  type: 'visit' | 'charge' | 'payment';
  treatment?: string;
  status?: string;
  dentist?: string;
  note?: string;
  amount?: number;
  paymentMethod?: string;
  appointmentId?: string;
}

interface TreatmentTimelineProps {
  patientId: string;
}

export function TreatmentTimeline({ patientId }: TreatmentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [totalCharged, setTotalCharged] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    load();
  }, [patientId]);

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const [notesRes, apptRes, billRes, payRes] = await Promise.all([
      supabase
        .from('visit_notes')
        .select('*, appointment:appointments(treatment_type, appointment_date, appointment_time, status, dentist:dentists(name))')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('appointments')
        .select('*, dentist:dentists(name)')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false }),
      supabase
        .from('billing')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*')
        .eq('patient_id', patientId)
        .order('payment_date', { ascending: false }),
    ]);

    const notes = (notesRes.data ?? []) as (VisitNote & { appointment: any })[];
    const appointments = (apptRes.data ?? []) as (Appointment & { dentist: any })[];
    const billing = (billRes.data ?? []) as Billing[];
    const payments = (payRes.data ?? []) as Payment[];

    setTotalCharged(billing.reduce((s, b) => s + b.amount_charged, 0));
    setTotalPaid(payments.reduce((s, p) => s + p.amount_paid, 0));

    // Build unified event list
    const built: TimelineEvent[] = [];

    // Appointments as visit events (group notes into them)
    for (const appt of appointments) {
      const relatedNotes = notes.filter(n => n.appointment_id === appt.id);
      const relatedCharges = billing.filter(b => b.appointment_id === appt.id);

      built.push({
        id: `appt-${appt.id}`,
        date: appt.appointment_date,
        time: appt.appointment_time,
        type: 'visit',
        treatment: appt.treatment_type,
        status: appt.status,
        dentist: (appt as any).dentist?.name,
        note: relatedNotes[0]?.notes,
        amount: relatedCharges.reduce((s, b) => s + b.amount_charged, 0) || undefined,
        appointmentId: appt.id,
      });
    }

    // Standalone billing (no appointment_id)
    for (const b of billing.filter(b => !b.appointment_id)) {
      built.push({
        id: `bill-${b.id}`,
        date: b.created_at.split('T')[0],
        time: b.created_at.split('T')[1]?.slice(0, 5),
        type: 'charge',
        treatment: b.treatment_description,
        amount: b.amount_charged,
      });
    }

    // Standalone notes (no appointment_id)
    for (const n of notes.filter(n => !n.appointment_id)) {
      built.push({
        id: `note-${n.id}`,
        date: n.created_at.split('T')[0],
        time: n.created_at.split('T')[1]?.slice(0, 5),
        type: 'visit',
        note: n.notes,
      });
    }

    // Payments
    for (const p of payments) {
      built.push({
        id: `pay-${p.id}`,
        date: p.payment_date,
        type: 'payment',
        amount: p.amount_paid,
        paymentMethod: p.payment_method,
      });
    }

    // Sort newest first
    built.sort((a, b) => {
      const dateA = a.date + (a.time ?? '');
      const dateB = b.date + (b.time ?? '');
      return dateB.localeCompare(dateA);
    });

    setEvents(built);
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const balance = totalCharged - totalPaid;
  const billingStatus = getBillingStatus(totalCharged, totalPaid);

  if (loading) return <SkeletonTable rows={4} />;

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No treatment history yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400">Total Visits</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {events.filter(e => e.type === 'visit').length}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-400">Total Billed</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{formatPeso(totalCharged)}</p>
        </div>
        <div className={cn(
          'rounded-xl p-3 border text-center',
          balance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
        )}>
          <p className="text-xs text-gray-400">Balance</p>
          <p className={cn(
            'text-xl font-bold mt-0.5',
            balance > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {formatPeso(balance)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />

        <div className="space-y-1">
          {events.map((event, idx) => {
            const isExpanded = expanded.has(event.id);
            const isLast = idx === events.length - 1;

            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Icon dot */}
                <div className="flex-shrink-0 z-10">
                  <TimelineDot type={event.type} status={event.status} />
                </div>

                {/* Card */}
                <div className={cn(
                  'flex-1 mb-3',
                  isLast && 'mb-0'
                )}>
                  <button
                    onClick={() => toggleExpand(event.id)}
                    className="w-full text-left"
                  >
                    <div className={cn(
                      'rounded-xl border px-4 py-3 transition-all',
                      event.type === 'visit' && 'bg-white border-gray-100 hover:border-teal-200 hover:shadow-sm',
                      event.type === 'charge' && 'bg-blue-50 border-blue-100 hover:border-blue-200',
                      event.type === 'payment' && 'bg-green-50 border-green-100 hover:border-green-200',
                    )}>
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Date + time */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(event.date)}
                              {event.time && (
                                <span className="text-gray-400">· {formatTime(event.time)}</span>
                              )}
                            </p>
                          </div>

                          {/* Main label */}
                          <p className={cn(
                            'font-semibold mt-1 text-sm',
                            event.type === 'visit' && 'text-gray-900',
                            event.type === 'charge' && 'text-blue-800',
                            event.type === 'payment' && 'text-green-800',
                          )}>
                            {event.type === 'visit' && (event.treatment ?? 'Visit Note')}
                            {event.type === 'charge' && `Charged: ${event.treatment}`}
                            {event.type === 'payment' && `Payment received · ${event.paymentMethod}`}
                          </p>

                          {/* Sub row */}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {event.status && <Badge label={event.status} />}
                            {event.dentist && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" /> {event.dentist}
                              </span>
                            )}
                            {event.amount !== undefined && event.amount > 0 && (
                              <span className={cn(
                                'text-xs font-semibold',
                                event.type === 'payment' ? 'text-green-600' : 'text-gray-700'
                              )}>
                                {event.type === 'payment' ? '+' : ''}{formatPeso(event.amount)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand icon (only if there's a note) */}
                        {event.note && (
                          <div className="flex-shrink-0 text-gray-300 mt-1">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />}
                          </div>
                        )}
                      </div>

                      {/* Expanded note */}
                      {isExpanded && event.note && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                              {event.note}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Timeline dot by type ─────────────────────────────── */

function TimelineDot({ type, status }: { type: TimelineEvent['type']; status?: string }) {
  const base = 'w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0';

  if (type === 'payment') {
    return (
      <div className={cn(base, 'bg-green-100')}>
        <CreditCard className="w-4 h-4 text-green-600" />
      </div>
    );
  }

  if (type === 'charge') {
    return (
      <div className={cn(base, 'bg-blue-100')}>
        <Receipt className="w-4 h-4 text-blue-600" />
      </div>
    );
  }

  // Visit — color by appointment status
  const statusColors: Record<string, string> = {
    Done:       'bg-teal-100',
    Confirmed:  'bg-blue-100',
    Scheduled:  'bg-gray-100',
    'No-show':  'bg-red-100',
    Cancelled:  'bg-gray-100',
  };

  return (
    <div className={cn(base, statusColors[status ?? ''] ?? 'bg-gray-100')}>
      <Stethoscope className="w-4 h-4 text-teal-700" />
    </div>
  );
}
