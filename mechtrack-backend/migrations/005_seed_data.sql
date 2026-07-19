-- ============================================================
-- MechTrack: Realistic Mock Seed Data (6 Months)
-- ⚠️  IMPORTANT: Run AFTER 005_salary_advances.sql
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

DO $$
DECLARE
  m1 uuid;
  m2 uuid;
  now_date date := CURRENT_DATE;
BEGIN
  SELECT id INTO m1 FROM public.mechanics WHERE is_admin = false ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO m2 FROM public.mechanics WHERE is_admin = false ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  IF m2 IS NULL THEN m2 := m1; END IF;

  INSERT INTO public.jobs (vehicle_details, description, assigned_to, status, completion_note, customer_price, payment_status, billed_at, created_at)
  VALUES
    ('2019 Toyota Camry',       'Full engine oil service and air filter replacement',                m1, 'Completed', 'Changed oil (5W-30), replaced air and cabin filters.',                       320.00, 'Paid', now_date - INTERVAL '5 months 20 days', now_date - INTERVAL '5 months 25 days'),
    ('2017 Honda Civic',        'Brake pad replacement front and rear',                              m2, 'Completed', 'Replaced all 4 brake pads, resurfaced rotors.',                              480.00, 'Paid', now_date - INTERVAL '5 months 10 days', now_date - INTERVAL '5 months 15 days'),
    ('2020 Nissan Qashqai',     'AC system not cooling, gas recharge',                               m1, 'Completed', 'Recharged AC refrigerant, replaced expansion valve.',                         550.00, 'Paid', now_date - INTERVAL '5 months 5 days',  now_date - INTERVAL '5 months 8 days'),
    ('2015 Ford Focus',         'Check engine light on, diagnostic and fix',                         m2, 'Completed', 'P0420 code — replaced catalytic converter and O2 sensor.',                   890.00, 'Paid', now_date - INTERVAL '4 months 22 days', now_date - INTERVAL '4 months 25 days'),
    ('2018 Mazda CX-5',         'Suspension noise diagnosis and repair',                             m1, 'Completed', 'Replaced both front lower control arm bushings.',                             620.00, 'Paid', now_date - INTERVAL '4 months 15 days', now_date - INTERVAL '4 months 18 days'),
    ('2016 Hyundai Tucson',     'Timing belt and water pump replacement',                            m2, 'Completed', 'Replaced timing belt kit, water pump, and thermostat.',                      1100.00, 'Paid', now_date - INTERVAL '4 months 5 days',  now_date - INTERVAL '4 months 8 days'),
    ('2022 Kia Sportage',       'Annual service: oil, filters, and tire rotation',                   m1, 'Completed', 'Full service completed. Tires rotated, all fluids topped up.',                280.00, 'Paid', now_date - INTERVAL '4 months 2 days',  now_date - INTERVAL '4 months 4 days'),
    ('2014 BMW 3 Series',       'Power steering fluid leak repair',                                  m2, 'Completed', 'Replaced power steering pump seal and high-pressure hose.',                  740.00, 'Paid', now_date - INTERVAL '3 months 22 days', now_date - INTERVAL '3 months 25 days'),
    ('2019 Mercedes C-Class',   'Battery replacement and electrical system check',                   m1, 'Completed', 'Installed new OEM battery, tested alternator output.',                        450.00, 'Paid', now_date - INTERVAL '3 months 18 days', now_date - INTERVAL '3 months 20 days'),
    ('2021 Toyota RAV4',        'Gearbox service and differential oil change',                       m2, 'Completed', 'Flushed gearbox fluid, changed front/rear differential oils.',                580.00, 'Paid', now_date - INTERVAL '3 months 10 days', now_date - INTERVAL '3 months 12 days'),
    ('2017 Volkswagen Golf',    'Clutch replacement',                                                m1, 'Completed', 'Full clutch kit replaced: disc, pressure plate, release bearing.',            1350.00, 'Paid', now_date - INTERVAL '3 months 5 days',  now_date - INTERVAL '3 months 8 days'),
    ('2016 Subaru Outback',     'Head gasket replacement',                                           m2, 'Completed', 'Replaced both head gaskets, pressure tested.',                               1800.00, 'Paid', now_date - INTERVAL '2 months 20 days', now_date - INTERVAL '2 months 25 days'),
    ('2020 Honda CR-V',         'Brake fluid flush and new brake lines',                             m1, 'Completed', 'Flushed old brake fluid, replaced worn steel lines.',                         390.00, 'Paid', now_date - INTERVAL '2 months 15 days', now_date - INTERVAL '2 months 18 days'),
    ('2018 Audi A4',            'Carbon cleaning and throttle body service',                         m2, 'Completed', 'Walnut blasted intake valves, cleaned throttle body.',                        680.00, 'Paid', now_date - INTERVAL '2 months 8 days',  now_date - INTERVAL '2 months 10 days'),
    ('2019 Mitsubishi Eclipse',  'Alternator replacement and belt tensioner',                        m1, 'Completed', 'Replaced alternator, belt tensioner, and serpentine belt.',                   520.00, 'Paid', now_date - INTERVAL '2 months 3 days',  now_date - INTERVAL '2 months 5 days'),
    ('2023 Toyota Corolla',     'First 10,000 km service',                                           m2, 'Completed', 'Oil change, multi-point inspection, reset service indicator.',                220.00, 'Paid', now_date - INTERVAL '1 month 18 days',  now_date - INTERVAL '1 month 20 days'),
    ('2015 Jeep Cherokee',      'Transfer case fluid change and 4WD check',                          m1, 'Completed', 'Drained and refilled transfer case. 4WD engagement confirmed.',               410.00, 'Paid', now_date - INTERVAL '1 month 12 days',  now_date - INTERVAL '1 month 15 days'),
    ('2020 Ford Puma',          'EGR valve cleaning and DPF service',                                m2, 'Completed', 'Chemically cleaned EGR valve, performed DPF regeneration.',                  650.00, 'Paid', now_date - INTERVAL '1 month 8 days',   now_date - INTERVAL '1 month 10 days'),
    ('2018 Renault Kadjar',     'Suspension overhaul: shocks and springs all round',                 m1, 'Completed', 'Replaced all 4 shock absorbers and springs. Wheel alignment set.',           1250.00, 'Paid', now_date - INTERVAL '1 month 4 days',   now_date - INTERVAL '1 month 5 days'),
    ('2021 Peugeot 2008',       'Coolant system pressure test and thermostat replacement',           m2, 'Completed', 'Replaced thermostat and housing. No further leaks.',                          360.00, 'Not paid', NULL, now_date - INTERVAL '5 days'),
    ('2022 Volkswagen T-Roc',   'Spoiler installation and front tyre replacement',                  m1, 'In Progress', NULL, 0, 'Not paid', NULL, now_date - INTERVAL '3 days'),
    ('2017 Suzuki Swift',       'Radiator repair',                                                   m2, 'Pending',    NULL, 0, 'Not paid', NULL, now_date - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.payroll (mechanic_id, period_start, period_end, days_worked, base_amount, bonus_amount, advance_deductions, total_amount, status, created_at)
  VALUES
    (m1, (now_date - INTERVAL '5 months')::date, (now_date - INTERVAL '5 months' + INTERVAL '25 days')::date, 21, 4200.00, 200.00, 0, 4400.00, 'Paid', now_date - INTERVAL '5 months'),
    (m2, (now_date - INTERVAL '5 months')::date, (now_date - INTERVAL '5 months' + INTERVAL '25 days')::date, 20, 3600.00, 0,      0, 3600.00, 'Paid', now_date - INTERVAL '5 months'),
    (m1, (now_date - INTERVAL '4 months')::date, (now_date - INTERVAL '4 months' + INTERVAL '25 days')::date, 22, 4400.00, 300.00, 0, 4700.00, 'Paid', now_date - INTERVAL '4 months'),
    (m2, (now_date - INTERVAL '4 months')::date, (now_date - INTERVAL '4 months' + INTERVAL '25 days')::date, 21, 3780.00, 150.00, 0, 3930.00, 'Paid', now_date - INTERVAL '4 months'),
    (m1, (now_date - INTERVAL '3 months')::date, (now_date - INTERVAL '3 months' + INTERVAL '25 days')::date, 20, 4000.00, 0,      0, 4000.00, 'Paid', now_date - INTERVAL '3 months'),
    (m2, (now_date - INTERVAL '3 months')::date, (now_date - INTERVAL '3 months' + INTERVAL '25 days')::date, 19, 3420.00, 200.00, 0, 3620.00, 'Paid', now_date - INTERVAL '3 months'),
    (m1, (now_date - INTERVAL '2 months')::date, (now_date - INTERVAL '2 months' + INTERVAL '25 days')::date, 21, 4200.00, 500.00, 300.00, 4400.00, 'Paid', now_date - INTERVAL '2 months'),
    (m2, (now_date - INTERVAL '2 months')::date, (now_date - INTERVAL '2 months' + INTERVAL '25 days')::date, 20, 3600.00, 100.00, 0, 3700.00, 'Paid', now_date - INTERVAL '2 months'),
    (m1, (now_date - INTERVAL '1 month')::date,  (now_date - INTERVAL '1 month'  + INTERVAL '25 days')::date, 22, 4400.00, 0,      0, 4400.00, 'Paid', now_date - INTERVAL '1 month'),
    (m2, (now_date - INTERVAL '1 month')::date,  (now_date - INTERVAL '1 month'  + INTERVAL '25 days')::date, 21, 3780.00, 250.00, 0, 4030.00, 'Paid', now_date - INTERVAL '1 month')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.salary_advances (mechanic_id, amount, reason, request_date, status, created_at)
  VALUES
    (m1, 300.00, 'Emergency car repair',           (now_date - INTERVAL '2 months 10 days')::date, 'Deducted', now_date - INTERVAL '2 months 12 days'),
    (m2, 500.00, 'Medical expenses for family',    (now_date - INTERVAL '1 month 20 days')::date,  'Approved', now_date - INTERVAL '1 month 22 days'),
    (m1, 200.00, 'School fees for children',       (now_date - INTERVAL '15 days')::date,           'Pending',  now_date - INTERVAL '15 days'),
    (m2, 150.00, 'Rent payment assistance',        (now_date - INTERVAL '8 days')::date,            'Pending',  now_date - INTERVAL '8 days'),
    (m1, 400.00, 'Home maintenance urgent repair', (now_date - INTERVAL '3 months')::date,          'Rejected', now_date - INTERVAL '3 months')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Seed data inserted for mechanics % and %', m1, m2;
END;
$$;

SELECT 'Seed data complete! ✅' AS status;
