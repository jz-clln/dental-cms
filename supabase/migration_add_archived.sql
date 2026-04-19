-- ============================================================
-- MIGRATION: Add archived column to patients
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_patients_archived ON patients(archived);
