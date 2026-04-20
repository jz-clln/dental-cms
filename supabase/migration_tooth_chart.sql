-- ============================================================
-- MIGRATION: Tooth chart records
-- Run in Supabase SQL Editor BEFORE deploying
-- ============================================================

CREATE TABLE IF NOT EXISTS tooth_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 1 AND 32),
  treatment_type TEXT NOT NULL,
  surface TEXT, -- e.g. 'Mesial', 'Distal', 'Occlusal', 'Buccal', 'Lingual'
  notes TEXT,
  treated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tooth_records_patient ON tooth_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_tooth_records_clinic ON tooth_records(clinic_id);

-- RLS
ALTER TABLE tooth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tooth_records_select" ON tooth_records
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "tooth_records_insert" ON tooth_records
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "tooth_records_update" ON tooth_records
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "tooth_records_delete" ON tooth_records
  FOR DELETE USING (clinic_id = get_clinic_id());
