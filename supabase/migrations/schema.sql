-- MechTrack Initial Schema and Security Setup

-- 1. Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create tables
CREATE TABLE IF NOT EXISTS public.mechanics (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    is_admin BOOLEAN DEFAULT false,
    hourly_rate NUMERIC DEFAULT 25.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_details TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES public.mechanics(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE CASCADE,
    total_hours NUMERIC NOT NULL CHECK (total_hours >= 0),
    base_amount NUMERIC NOT NULL CHECK (base_amount >= 0),
    bonus_amount NUMERIC NOT NULL CHECK (bonus_amount >= 0),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- 4. Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mechanics
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Mechanics Policies
-- Any authenticated user can view mechanics roster (necessary for assignment and logging in)
CREATE POLICY select_mechanics ON public.mechanics
    FOR SELECT TO authenticated USING (true);

-- Only Admins can modify mechanics
CREATE POLICY admin_modify_mechanics ON public.mechanics
    FOR ALL TO authenticated USING (public.is_admin());

-- 6. Jobs Policies
-- Admins have full access to all jobs
CREATE POLICY admin_all_jobs ON public.jobs
    FOR ALL TO authenticated USING (public.is_admin());

-- Mechanics can only select/read jobs assigned to them
CREATE POLICY mechanic_select_jobs ON public.jobs
    FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR public.is_admin());

-- Mechanics can update jobs assigned to them (e.g. status)
CREATE POLICY mechanic_update_jobs ON public.jobs
    FOR UPDATE TO authenticated USING (assigned_to = auth.uid() OR public.is_admin());

-- 7. Payroll Policies
-- Admins have full access to payroll
CREATE POLICY admin_all_payroll ON public.payroll
    FOR ALL TO authenticated USING (public.is_admin());

-- Mechanics can only view their own payroll records
CREATE POLICY mechanic_select_payroll ON public.payroll
    FOR SELECT TO authenticated USING (mechanic_id = auth.uid());

-- 8. Stored Procedure for Payroll Calculation (RPC)
CREATE OR REPLACE FUNCTION public.process_mechanic_payroll(
  p_mechanic_id UUID,
  p_total_hours NUMERIC
)
RETURNS public.payroll
SECURITY DEFINER
AS $$
DECLARE
  v_hourly_rate NUMERIC;
  v_base_amount NUMERIC;
  v_bonus_amount NUMERIC;
  v_total_amount NUMERIC;
  v_payroll_row public.payroll;
BEGIN
  -- Ensure the caller is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can process payroll';
  END IF;

  -- Fetch the mechanic's hourly rate
  SELECT hourly_rate INTO v_hourly_rate
  FROM public.mechanics
  WHERE id = p_mechanic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mechanic not found';
  END IF;

  -- Fallback to default rate if not set
  IF v_hourly_rate IS NULL OR v_hourly_rate <= 0 THEN
    v_hourly_rate := 25.00;
  END IF;

  -- Pay calculation
  IF p_total_hours <= 40 THEN
    v_base_amount := p_total_hours * v_hourly_rate;
    v_bonus_amount := 0.00;
  ELSE
    v_base_amount := 40 * v_hourly_rate;
    -- Overtime (hours > 40) is calculated at 1.5x hourly rate
    v_bonus_amount := (p_total_hours - 40) * (v_hourly_rate * 1.5);
  END IF;

  v_total_amount := v_base_amount + v_bonus_amount;

  -- Insert payroll record
  INSERT INTO public.payroll (
    mechanic_id,
    total_hours,
    base_amount,
    bonus_amount,
    total_amount
  )
  VALUES (
    p_mechanic_id,
    p_total_hours,
    v_base_amount,
    v_bonus_amount,
    v_total_amount
  )
  RETURNING * INTO v_payroll_row;

  RETURN v_payroll_row;
END;
$$ LANGUAGE plpgsql;
