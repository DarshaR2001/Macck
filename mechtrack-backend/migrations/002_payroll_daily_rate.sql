-- ============================================================
-- MechTrack: Payroll Daily-Rate Refactoring & Schema Fix
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Rename column hourly_rate to daily_rate in mechanics table
ALTER TABLE public.mechanics RENAME COLUMN hourly_rate TO daily_rate;

-- 2. Rename column total_hours to days_worked in payroll table
ALTER TABLE public.payroll RENAME COLUMN total_hours TO days_worked;

-- 3. Drop existing process_mechanic_payroll functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.process_mechanic_payroll(p_mechanic_id uuid, p_total_hours numeric);
DROP FUNCTION IF EXISTS public.process_mechanic_payroll(p_mechanic_id uuid, p_period_start date, p_period_end date, p_days_worked numeric, p_bonus_amount numeric);

-- 4. Rebuild the RPC function with daily-rate parameters
CREATE OR REPLACE FUNCTION public.process_mechanic_payroll(
  p_mechanic_id uuid,
  p_period_start date,
  p_period_end date,
  p_days_worked numeric,
  p_bonus_amount numeric
)
RETURNS public.payroll
SECURITY DEFINER
AS $$
DECLARE
  v_daily_rate numeric;
  v_base_amount numeric;
  v_total_amount numeric;
  v_payroll_row public.payroll;
BEGIN
  -- Ensure the caller is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can process payroll';
  END IF;

  -- Fetch the mechanic's daily rate
  SELECT daily_rate INTO v_daily_rate
  FROM public.mechanics
  WHERE id = p_mechanic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mechanic not found';
  END IF;

  -- Fallback to default daily rate if not set
  IF v_daily_rate IS NULL OR v_daily_rate <= 0 THEN
    v_daily_rate := 200.00; -- Default daily rate of $200
  END IF;

  -- Pay calculation
  v_base_amount := v_daily_rate * p_days_worked;
  v_total_amount := v_base_amount + COALESCE(p_bonus_amount, 0.00);

  -- Insert payroll record
  INSERT INTO public.payroll (
    mechanic_id,
    period_start,
    period_end,
    days_worked,
    base_amount,
    bonus_amount,
    total_amount,
    status
  )
  VALUES (
    p_mechanic_id,
    p_period_start,
    p_period_end,
    p_days_worked,
    v_base_amount,
    COALESCE(p_bonus_amount, 0.00),
    v_total_amount,
    'Pending'
  )
  RETURNING * INTO v_payroll_row;

  RETURN v_payroll_row;
END;
$$ LANGUAGE plpgsql;

-- 5. Re-create the prevent_privilege_escalation trigger to check daily_rate instead of hourly_rate
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calling_user_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO calling_user_is_admin
  FROM public.mechanics
  WHERE id = auth.uid();

  IF NOT COALESCE(calling_user_is_admin, FALSE) THEN
    IF NEW.daily_rate        IS DISTINCT FROM OLD.daily_rate        OR
       NEW.seniority_level_id IS DISTINCT FROM OLD.seniority_level_id OR
       NEW.is_admin           IS DISTINCT FROM OLD.is_admin           OR
       NEW.is_active          IS DISTINCT FROM OLD.is_active
    THEN
      RAISE EXCEPTION 'Permission denied: Mechanics cannot modify protected profile fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

SELECT 'Schema and RPC successfully updated to daily-rate model! ✅' AS status;
