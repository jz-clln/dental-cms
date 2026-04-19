-- ============================================================
-- MIGRATION: Notifications table
-- Run this in Supabase SQL Editor BEFORE deploying the update
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'appointment', 'balance')),
  read BOOLEAN DEFAULT FALSE,
  href TEXT, -- optional link to navigate to when clicked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_clinic ON notifications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (clinic_id = get_clinic_id());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (clinic_id = get_clinic_id());

CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (clinic_id = get_clinic_id());
