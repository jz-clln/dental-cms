// All shared types in one place — eliminates `as any` casts everywhere else.

import type { Appointment, ActivityItem, PatientJoin, DentistJoin } from '@/types';
export type { Appointment, ActivityItem, PatientJoin, DentistJoin };

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface Stats {
  todaysAppointments: number;
  totalPatients: number;
  lowStockAlerts: number;
  revenueThisWeek: number;
  revenueAverage: number;
  dailyRevenue: number[];
}

export interface DashboardState {
  stats: Stats;
  appointments: Appointment[];
  activity: ActivityItem[];
}

// ─── Typed Supabase join shapes ───────────────────────────────────────────────
// These replace every `as any` cast when consuming joined rows.

export interface AppointmentRow {
  id: string;
  clinic_id: string;
  appointment_date: string;
  appointment_time: string;
  treatment_type: string;
  status: string;
  created_at: string;
  patient: PatientJoin | null;
  dentist: DentistJoin | null;
}

export interface RecentAppointmentRow {
  id: string;
  created_at: string;
  treatment_type: string;
  patient: PatientJoin | null;
}

export interface RecentPatientRow {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
}

export interface RecentPaymentRow {
  id: string;
  created_at: string;
  amount_paid: number;
  patient: PatientJoin | null;
}

export interface PaymentRow {
  amount_paid: number;
  payment_date: string;
}

export interface InventoryRow {
  quantity: number;
  reorder_level: number;
}

// ─── Bitey ────────────────────────────────────────────────────────────────────

export type BiteyEmotion =
  | 'shocked' | 'panicked' | 'worried' | 'sleepy'
  | 'celebrating' | 'excited' | 'sad' | 'happy' | 'new';

export interface BiteyState {
  emotion: BiteyEmotion;
  message: string;
  isNewUser: boolean;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

export interface CacheEntry {
  data: DashboardState;
  ts: number;
}