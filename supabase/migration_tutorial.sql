-- ============================================================
-- MIGRATION: Tutorial tracking
-- Run in Supabase SQL Editor BEFORE deploying
-- ============================================================

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT FALSE;
