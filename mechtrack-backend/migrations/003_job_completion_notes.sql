-- ============================================================
-- MechTrack: Add Job Completion Notes Column
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add completion_note column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completion_note text;

-- Reload Supabase API PostgREST cache immediately
NOTIFY pgrst, 'reload schema';

SELECT 'Completion note column added to jobs table! ✅' AS status;
