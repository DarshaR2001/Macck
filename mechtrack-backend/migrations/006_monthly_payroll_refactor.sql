-- ============================================================
-- MechTrack: Monthly Payroll & Advance Deductions Refactoring
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payroll' AND column_name = 'advance_deductions'
  ) THEN
    ALTER TABLE public.payroll RENAME COLUMN advance_deductions TO advance_deduction;
  ELSE
    ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS advance_deduction numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.process_mechanic_payroll(uuid, date, date, numeric, numeric);
DROP FUNCTION IF EXISTS public.process_mechanic_payroll(uuid, numeric, numeric);

CREATE OR REPLACE FUNCTION public.process_mechanic_payroll(
  p_mechanic_id   uuid,
  p_period_start  date,
  p_period_end    date,
  p_days_worked   numeric,
  p_bonus_amount  numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_rate         numeric;
  v_base_amount        numeric;
  v_total_amount       numeric;
  v_advance_total      numeric := 0;
  v_advance_ids        uuid[];
  v_payroll_record     record;
BEGIN
  -- Check caller authorization: must be service_role or admin
  IF auth.role() != 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mechanics WHERE id = auth.uid() AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can process payroll';
    END IF;
  END IF;

  -- Fetch the mechanic's daily rate
  SELECT daily_rate INTO v_daily_rate
    FROM public.mechanics
   WHERE id = p_mechanic_id;

  IF v_daily_rate IS NULL THEN
    RAISE EXCEPTION 'Mechanic not found or has no daily rate set';
  END IF;

  -- Calculate base pay
  v_base_amount  := v_daily_rate * p_days_worked;
  v_total_amount := v_base_amount + p_bonus_amount;

  -- Sum all Approved advances for this mechanic (not yet deducted)
  SELECT COALESCE(SUM(amount), 0), ARRAY_AGG(id)
    INTO v_advance_total, v_advance_ids
    FROM public.salary_advances
   WHERE mechanic_id = p_mechanic_id
     AND status = 'Approved';

  -- Deduct advances (total cannot go below 0)
  IF v_advance_total > 0 THEN
    v_total_amount := GREATEST(v_total_amount - v_advance_total, 0);

    -- Mark those advances as Deducted
    UPDATE public.salary_advances
       SET status = 'Deducted'
     WHERE id = ANY(v_advance_ids);
  END IF;

  -- Insert the payroll record
  INSERT INTO public.payroll (
    mechanic_id,
    period_start,
    period_end,
    days_worked,
    base_amount,
    bonus_amount,
    advance_deduction,
    total_amount,
    status
  ) VALUES (
    p_mechanic_id,
    p_period_start,
    p_period_end,
    p_days_worked,
    v_base_amount,
    p_bonus_amount,
    v_advance_total,
    v_total_amount,
    'Paid'
  )
  RETURNING * INTO v_payroll_record;

  NOTIFY pgrst, 'reload schema';

  RETURN row_to_json(v_payroll_record);
END;
$$;

NOTIFY pgrst, 'reload schema';

SELECT 'Payroll advances system refactored successfully! ✅' AS status;
