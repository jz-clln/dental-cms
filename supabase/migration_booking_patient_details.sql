-- Apply before deploying the QR booking form patient details update.
-- Optional columns preserve existing booking requests.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS address text;
