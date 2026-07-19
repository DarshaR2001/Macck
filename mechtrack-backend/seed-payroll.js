/**
 * MechTrack - Payroll Seed Script
 * Inserts payroll records directly with correct column schema.
 * Run: node seed-payroll.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seedPayroll() {
  console.log('💰 Seeding payroll records...\n');

  // Clean up test record from diagnostic
  await supabase.from('payroll').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Get all non-admin mechanics
  const { data: mechanics, error: mechErr } = await supabase
    .from('mechanics')
    .select('id, full_name, daily_rate')
    .eq('is_admin', false);

  if (mechErr || !mechanics || mechanics.length === 0) {
    console.error('Could not fetch mechanics:', mechErr?.message);
    return;
  }

  const payrollRecords = [];
  const periods = [
    { start: '2026-06-01', end: '2026-06-15', status: 'Paid' },
    { start: '2026-06-16', end: '2026-06-30', status: 'Paid' },
  ];
  const daysOptions = [15, 20, 21, 22, 18, 23, 19, 21.5];

  mechanics.forEach((mech, i) => {
    periods.forEach((period, round) => {
      const days = daysOptions[(i * 2 + round) % daysOptions.length];
      const rate = parseFloat(mech.daily_rate) || 200.00;
      
      const baseAmount = days * rate;
      const bonusAmount = round === 0 ? 0 : 100;
      const totalAmount = baseAmount + bonusAmount;

      payrollRecords.push({
        mechanic_id: mech.id,
        period_start: period.start,
        period_end: period.end,
        days_worked: days,
        base_amount: baseAmount,
        bonus_amount: bonusAmount,
        total_amount: totalAmount,
        status: period.status
      });
    });
  });

  const { data, error } = await supabase
    .from('payroll')
    .insert(payrollRecords)
    .select();

  if (error) {
    console.error('❌ Payroll insert error:', error.message);
  } else {
    console.log(`%c Created ${data.length} payroll records:\n`, 'color: green');
    for (const pr of data) {
      const mech = mechanics.find(m => m.id === pr.mechanic_id);
      console.log(`   ${mech?.full_name}: ${pr.period_start} to ${pr.period_end} | ${pr.days_worked} days worked → $${parseFloat(pr.total_amount).toFixed(2)} (${pr.status})`);
    }
  }

  console.log('\n🎉 Payroll seeding complete!');
}

seedPayroll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
