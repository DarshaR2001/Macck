require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('mechanics')
    .select('id, full_name, email, is_admin')
    .eq('email', 'darsharanasinghe2001@gmail.com')
    .single();

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Admin record:', data);

  if (!data.is_admin) {
    console.log('\n⚠️  is_admin is FALSE! Fixing now...');
    const { error: updateErr } = await supabase
      .from('mechanics')
      .update({ is_admin: true })
      .eq('email', 'darsharanasinghe2001@gmail.com');

    if (updateErr) {
      console.error('Update failed:', updateErr.message);
    } else {
      console.log('✅ is_admin set to TRUE successfully!');
    }
  } else {
    console.log('\n✅ is_admin is already TRUE — database is correct.');
  }
}

check();
