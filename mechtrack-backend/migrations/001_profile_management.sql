-- ============================================================
-- MechTrack: Profile Management SQL Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create seniority_levels lookup table
CREATE TABLE IF NOT EXISTS public.seniority_levels (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
INSERT INTO public.seniority_levels (name) VALUES
  ('Junior'), ('Mid-Level'), ('Senior'), ('Lead')
ON CONFLICT (name) DO NOTHING;

-- 2. Add new columns to mechanics table
ALTER TABLE public.mechanics
  ADD COLUMN IF NOT EXISTS contact_number     TEXT,
  ADD COLUMN IF NOT EXISTS seniority_level_id INTEGER REFERENCES public.seniority_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Enable RLS on mechanics
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Authenticated users can read all mechanics" ON public.mechanics;
DROP POLICY IF EXISTS "Users can update their own mechanic row"    ON public.mechanics;

CREATE POLICY "Authenticated users can read all mechanics"
  ON public.mechanics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own mechanic row"
  ON public.mechanics FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5. Privilege-escalation prevention trigger
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE calling_user_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO calling_user_is_admin FROM public.mechanics WHERE id = auth.uid();
  IF NOT COALESCE(calling_user_is_admin, FALSE) THEN
    IF NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate OR
       NEW.seniority_level_id IS DISTINCT FROM OLD.seniority_level_id OR
       NEW.is_admin IS DISTINCT FROM OLD.is_admin OR
       NEW.is_active IS DISTINCT FROM OLD.is_active
    THEN
      RAISE EXCEPTION 'Permission denied: Mechanics cannot modify protected profile fields.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.mechanics;
CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- 6. RLS for seniority_levels
ALTER TABLE public.seniority_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can read seniority levels" ON public.seniority_levels;
CREATE POLICY "Anyone authenticated can read seniority levels"
  ON public.seniority_levels FOR SELECT TO authenticated USING (true);

SELECT 'Migration complete' AS status;
