'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Patient, VisitNote, Appointment, Billing, Payment } from '@/types';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { TreatmentTimeline } from '@/components/patients/TreatmentTimeline';
import { ToothChart } from '@/components/patients/ToothChart';
import { PatientForm } from '@/components/patients/PatientForm';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { useAppToast } from '@/app/(dashboard)/layout';
import {
  calculateAge, formatDate, formatTime, formatPeso,
  getBillingStatus, getPatientName,
} from '@/lib/utils';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  Clock, Plus, Pencil, CalendarPlus, Tooth,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfileTab = 'overview' | 'chart' | 'history';

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useAppToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [billing, setBilling] = useState<Billing[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [timelineKey, setTimelineKey] = useState(0);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from('staff').select('clinic_id').eq('auth_user_id', user.id).single();
      setClinicId(staffData?.clinic_id ?? null);
    }

    const today = new Date().toISOString().split('T')[0];

    const [patientRes, apptRes, billRes, payRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).single(),
      supabase.from('appointments')
        .select('*, dentist:dentists(name)')
        .eq('patient_id', id)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(5),
      supabase.from('billing').select('*').eq('patient_id', id),
      supabase.from('payments').select('*').eq('patient_id', id),
    ]);

    if (patientRes.error || !patientRes.data) {
      toast.error('Patient not found.');
      router.push('/patients');
      return;
    }

    setPatient(patientRes.data as Patient);
    setAppointments((apptRes.data ?? []) as Appointment[]);
    setBilling((billRes.data ?? []) as Billing[]);
    setPayments((payRes.data ?? []) as Payment[]);
    setLoading(false);
  }

  async function handleAddNote() {
    if (!newNote.trim()) { setNoteError('Please write a note before saving.'); return; }
    setSavingNote(true);
    const supabase = createClient();
    const { error } = await supabase.from('visit_notes').insert({
      patient_id: id,
      notes: newNote.trim(),
    });

    if (error) {
      toast.error('Failed to save note.');
    } else {
      toast.success('Visit note added.');
      setNewNote('');
      setNoteError('');
      setShowNoteInput(false);
      setTimelineKey(k => k + 1);
    }
    setSavingNote(false);
  }

  const totalCharged = billing.reduce((s, b) => s + (b.amount_charged ?? 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount_paid ?? 0), 0);
  const balance = totalCharged - totalPaid;
  const billingStatus = getBillingStatus(totalCharged, totalPaid);

  const PROFILE_TABS: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'chart',    label: 'Tooth Chart', icon: Calendar },
    { id: 'history',  label: 'History', icon: Clock },
  ];

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-lg" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  if (!patient) return null;

  const age = calculateAge(patient.birthday);

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/patients')} className="text-gray-500">
        <ArrowLeft className="w-4 h-4" /> All Patients
      </Button>

      {/* Patient header */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
            <span className="text-teal-700 text-2xl font-bold">
              {patient.first_name[0]}{patient.last_name[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{getPatientName(patient)}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {age !== null && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> {age} years old
                </span>
              )}
              {patient.contact_number && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {patient.contact_number}
                </span>
              )}
              {patient.email && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {patient.email}
                </span>
              )}
              {patient.address && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {patient.address}
                </span>
              )}
            </div>
            {patient.birthday && (
              <p className="text-xs text-gray-400 mt-1">Birthday: {formatDate(patient.birthday)}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button size="sm" onClick={() => router.push(`/appointments/new?patient_id=${patient.id}`)}>
              <CalendarPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Appt</span>
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Tab navigation */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ──────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* Billing Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Billing Summary</h3>
                <Badge label={billingStatus} />
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total Billed</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{formatPeso(totalCharged)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="text-lg font-bold text-green-600 mt-0.5">{formatPeso(totalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className={cn('text-lg font-bold mt-0.5', balance > 0 ? 'text-red-600' : 'text-gray-900')}>
                    {formatPeso(balance)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Upcoming Appointments */}
          {appointments.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Upcoming Appointments
                </h3>
              </CardHeader>
              <CardBody className="py-2">
                <div className="divide-y divide-gray-50">
                  {appointments.map(appt => (
                    <div key={appt.id} className="flex items-center gap-4 py-3">
                      <div className="text-center w-12 flex-shrink-0">
                        <p className="text-xs text-gray-400">
                          {new Date(appt.appointment_date + 'T00:00:00')
                            .toLocaleDateString('en-PH', { month: 'short' })}
                        </p>
                        <p className="text-lg font-bold text-gray-900 leading-none">
                          {new Date(appt.appointment_date + 'T00:00:00').getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{appt.treatment_type}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(appt.appointment_time)}
                          {(appt as any).dentist?.name && ` · ${(appt as any).dentist.name}`}
                        </p>
                      </div>
                      <Badge label={appt.status} />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* ── TAB: Tooth Chart ───────────────────────────────── */}
      {activeTab === 'chart' && clinicId && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg">🦷</span> Dental Chart
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Tap any tooth to log a treatment. Colors indicate treatment type.
            </p>
          </CardHeader>
          <CardBody>
            <ToothChart
              patientId={id}
              clinicId={clinicId}
              toast={toast}
            />
          </CardBody>
        </Card>
      )}

      {/* ── TAB: Treatment History ─────────────────────────── */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Treatment History
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setShowNoteInput(v => !v)}>
                <Plus className="w-3.5 h-3.5" /> Add Note
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {showNoteInput && (
              <div className="mb-5 p-4 bg-teal-50 rounded-xl border border-teal-100 space-y-3">
                <p className="text-sm font-medium text-teal-800">New Visit Note</p>
                <Textarea
                  placeholder="Write treatment notes, observations, or follow-up instructions…"
                  value={newNote}
                  onChange={e => { setNewNote(e.target.value); setNoteError(''); }}
                  error={noteError}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddNote} loading={savingNote}>Save Note</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowNoteInput(false); setNewNote(''); setNoteError('');
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <TreatmentTimeline key={timelineKey} patientId={id} />
          </CardBody>
        </Card>
      )}

      {/* Edit Patient Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Patient" size="lg">
        {clinicId && (
          <PatientForm
            clinicId={clinicId}
            existing={patient}
            toast={toast}
            onSuccess={updated => { setPatient(updated); setShowEditModal(false); }}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </Modal>
    </div>
  );
}
