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
    .select('id, full_name, hourly_rate')
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
  const hoursOptions = [35, 40, 42, 45, 38, 48, 36, 44];

  mechanics.forEach((mech, i) => {
    periods.forEach((period, round) => {
      const hours = hoursOptions[(i * 2 + round) % hoursOptions.length];
      const rate = parseFloat(mech.hourly_rate) || 25.00;
      
      let baseAmount, bonusAmount;
      if (hours <= 40) {
        baseAmount = hours * rate;
        bonusAmount = 0;
      } else {
        baseAmount = 40 * rate;
        bonusAmount = (hours - 40) * (rate * 1.5);
      }
      const totalAmount = baseAmount + bonusAmount;

      payrollRecords.push({
        mechanic_id: mech.id,
        period_start: period.start,
        period_end: period.end,
        total_hours: hours,
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
    console.log(`✅ Created ${data.length} payroll records:\n`);
    for (const pr of data) {
      const mech = mechanics.find(m => m.id === pr.mechanic_id);
      console.log(`   ${mech?.full_name}: ${pr.period_start} to ${pr.period_end} | ${pr.total_hours}h → $${parseFloat(pr.total_amount).toFixed(2)} (${pr.status})`);
    }
  }

  console.log('\n🎉 Payroll seeding complete!');
}

seedPayroll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
