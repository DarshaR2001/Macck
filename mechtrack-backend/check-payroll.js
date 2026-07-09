require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkColumns() {
  // Try inserting a minimal record to see what columns are required
  const { data: mechs } = await supabase.from('mechanics').select('id').eq('is_admin', false).limit(1);
  if (!mechs || mechs.length === 0) { console.log('No mechanics found'); return; }

  const { data, error } = await supabase
    .from('payroll')
    .select('*')
    .limit(0);
  
  // Also try a simple select to see column names from an empty result
  console.log('Select result:', data);
  console.log('Select error:', error);

  // Try inserting with all possible columns
  const testInsert = await supabase
    .from('payroll')
    .insert({
      mechanic_id: mechs[0].id,
      total_hours: 40,
      base_amount: 1000,
      bonus_amount: 0,
      total_amount: 1000,
      period_start: '2025-06-01',
      period_end: '2025-06-15'
    })
    .select();

  console.log('\nTest insert data:', testInsert.data);
  console.log('Test insert error:', testInsert.error);
}

checkColumns();
