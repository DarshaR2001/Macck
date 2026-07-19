-- ============================================================
-- MechTrack: Billing & Financial Reporting Schema Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add billing columns to the jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_price  numeric       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status  text          NOT NULL DEFAULT 'Not paid'
    CONSTRAINT jobs_payment_status_check CHECK (payment_status IN ('Paid', 'Not paid')),
  ADD COLUMN IF NOT EXISTS billed_at       timestamptz;

-- Reload the PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

SELECT 'Billing columns added to jobs table! ✅' AS status;
