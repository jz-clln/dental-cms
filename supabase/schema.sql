-- ============================================================
-- DENTAL CMS - SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Clinics (one per paying customer)
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  contact_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff / Users (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'front_desk')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dentists
CREATE TABLE IF NOT EXISTS dentists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  schedule_days TEXT[], -- e.g. ['Monday','Wednesday','Friday']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birthday DATE,
  address TEXT,
  contact_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dentist_id UUID REFERENCES dentists(id) ON DELETE SET NULL,
  treatment_type TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled'
    CHECK (status IN ('Scheduled', 'Confirmed', 'Done', 'No-show', 'Cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visit Notes (linked to patient + optional appointment)
CREATE TABLE IF NOT EXISTS visit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  reorder_level INTEGER NOT NULL DEFAULT 10,
  last_restocked DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing (charges per treatment)
CREATE TABLE IF NOT EXISTS billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  treatment_description TEXT NOT NULL,
  amount_charged NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (what was actually paid)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'GCash', 'Maya', 'Card')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_staff_clinic ON staff(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user ON staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_inventory_clinic ON inventory_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_billing_clinic ON billing(clinic_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_clinic ON payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This is the multi-tenant security layer. Every clinic only
-- sees their own data, enforced at the database level.
-- ============================================================

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper function: get the clinic_id for the currently logged-in user
CREATE OR REPLACE FUNCTION get_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- CLINICS: only see your own clinic
CREATE POLICY "clinics_select" ON clinics
  FOR SELECT USING (id = get_clinic_id());

CREATE POLICY "clinics_update" ON clinics
  FOR UPDATE USING (id = get_clinic_id());

-- STAFF: only see staff in your clinic
CREATE POLICY "staff_select" ON staff
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "staff_insert" ON staff
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "staff_update" ON staff
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "staff_delete" ON staff
  FOR DELETE USING (clinic_id = get_clinic_id());

-- DENTISTS
CREATE POLICY "dentists_select" ON dentists
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "dentists_insert" ON dentists
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "dentists_update" ON dentists
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "dentists_delete" ON dentists
  FOR DELETE USING (clinic_id = get_clinic_id());

-- PATIENTS
CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "patients_delete" ON patients
  FOR DELETE USING (clinic_id = get_clinic_id());

-- APPOINTMENTS
CREATE POLICY "appointments_select" ON appointments
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "appointments_insert" ON appointments
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "appointments_update" ON appointments
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "appointments_delete" ON appointments
  FOR DELETE USING (clinic_id = get_clinic_id());

-- VISIT NOTES (no clinic_id — secured via patient ownership)
CREATE POLICY "visit_notes_select" ON visit_notes
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE clinic_id = get_clinic_id())
  );

CREATE POLICY "visit_notes_insert" ON visit_notes
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE clinic_id = get_clinic_id())
  );

CREATE POLICY "visit_notes_update" ON visit_notes
  FOR UPDATE USING (
    patient_id IN (SELECT id FROM patients WHERE clinic_id = get_clinic_id())
  );

CREATE POLICY "visit_notes_delete" ON visit_notes
  FOR DELETE USING (
    patient_id IN (SELECT id FROM patients WHERE clinic_id = get_clinic_id())
  );

-- INVENTORY
CREATE POLICY "inventory_select" ON inventory_items
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "inventory_insert" ON inventory_items
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "inventory_update" ON inventory_items
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "inventory_delete" ON inventory_items
  FOR DELETE USING (clinic_id = get_clinic_id());

-- BILLING
CREATE POLICY "billing_select" ON billing
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "billing_insert" ON billing
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "billing_update" ON billing
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "billing_delete" ON billing
  FOR DELETE USING (clinic_id = get_clinic_id());

-- PAYMENTS
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "payments_update" ON payments
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "payments_delete" ON payments
  FOR DELETE USING (clinic_id = get_clinic_id());
