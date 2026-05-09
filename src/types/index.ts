// ============================================================
// DENTAL CMS - TypeScript Types
// ============================================================

export interface Clinic {
  id: string;
  name: string;
  address: string | null;
  contact_number: string | null;
  email: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  clinic_id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: 'admin' | 'front_desk';
  created_at: string;
}

export interface Dentist {
  id: string;
  clinic_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
  schedule_days: string[] | null;
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  first_name: string | null;
  last_name: string | null;
  birthday: string | null;
  address: string | null;
  contact_number: string | null;
  email: string | null;
  archived: boolean;   // add this
  created_at: string;
}

export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Done' | 'No-show' | 'Cancelled';

// FIX: joined patient/dentist fields use partial join shapes, not the full
// interface. Queries only select specific columns (first_name, last_name etc.)
// so typing them as the full Patient/Dentist interface was falsely broad —
// accessing e.g. patient.clinic_id on a join result would be undefined at
// runtime even though TypeScript wouldn't complain.
export interface PatientJoin {
  first_name: string | null;
  last_name: string | null;
  contact_number: string | null;
}

export interface DentistJoin {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  dentist_id: string | null;
  treatment_type: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  // Joined fields — partial shapes matching actual SELECT columns
  patient?: PatientJoin;
  dentist?: DentistJoin;
}

export interface VisitNote {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  notes: string;
  created_at: string;
  appointment?: Appointment;
}

export interface InventoryItem {
  id: string;
  clinic_id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  last_restocked: string | null;
  created_at: string;
  is_low_stock?: boolean;
}

export interface Billing {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  treatment_description: string;
  amount_charged: number;
  created_at: string;
  patient?: PatientJoin;
}

export type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'Card';

export interface Payment {
  id: string;
  clinic_id: string;
  patient_id: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes: string | null;
  created_at: string;
  patient?: PatientJoin;
}

export type BillingStatus = 'Paid' | 'Partial' | 'Unpaid';

export interface PatientBillingSummary {
  patient: Patient;
  total_charged: number;
  total_paid: number;
  balance: number;
  status: BillingStatus;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface PatientFormData {
  first_name: string;
  last_name: string;
  birthday: string;
  address: string;
  contact_number: string;
  email: string;
}

export interface AppointmentFormData {
  patient_id: string;
  dentist_id: string;
  treatment_type: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string;
}

export interface InventoryFormData {
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  last_restocked: string;
}

export interface BillingFormData {
  patient_id: string;
  appointment_id: string;
  treatment_description: string;
  amount_charged: number;
}

export interface PaymentFormData {
  patient_id: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes: string;
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  todays_appointments: number;
  total_patients: number;
  low_stock_alerts: number;
  revenue_this_week: number;
}

export interface ActivityItem {
  id: string;
  type: 'appointment' | 'patient' | 'payment' | 'inventory';
  description: string;
  timestamp: string;
}

// ============================================================
// REPORT TYPES
// ============================================================

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface AppointmentStatusCount {
  status: AppointmentStatus;
  count: number;
}

export interface TreatmentCount {
  treatment_type: string;
  count: number;
}