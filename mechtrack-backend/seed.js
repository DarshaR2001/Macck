/**
 * MechTrack - Database Seed Script
 * 
 * Creates mock mechanics (with Supabase Auth users), jobs, and payroll records.
 * Run: node seed.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// --- Mock Data ---
const mockMechanics = [
  { email: 'kalana@mechtrack.test', password: 'Test1234!', full_name: 'Kalana Madumalka', hourly_rate: 30.00 },
  { email: 'nimal@mechtrack.test',  password: 'Test1234!', full_name: 'Nimal Perera',     hourly_rate: 28.50 },
  { email: 'sahan@mechtrack.test',  password: 'Test1234!', full_name: 'Sahan Fernando',   hourly_rate: 32.00 },
  { email: 'dilshi@mechtrack.test', password: 'Test1234!', full_name: 'Dilshi Kumari',    hourly_rate: 27.00 },
];

const jobTemplates = [
  { vehicle_details: '2022 Toyota Corolla (KD-1234)',   description: 'Full engine oil change and filter replacement',    status: 'Completed' },
  { vehicle_details: '2019 Honda Civic (WP-CAB-5678)',  description: 'Brake pad replacement - front and rear',           status: 'In Progress' },
  { vehicle_details: '2021 Suzuki Swift (SP-9012)',      description: 'AC compressor repair and gas recharge',            status: 'Pending' },
  { vehicle_details: '2020 Nissan X-Trail (NW-3456)',    description: 'Transmission fluid flush and gearbox inspection',  status: 'In Progress' },
  { vehicle_details: '2018 Hyundai Tucson (SG-7890)',    description: 'Timing belt replacement and water pump service',   status: 'Pending' },
  { vehicle_details: '2023 Toyota HiAce (WP-1122)',      description: 'Full vehicle inspection and safety certification', status: 'Completed' },
  { vehicle_details: '2017 Mazda 3 (CP-3344)',           description: 'Clutch plate and pressure plate replacement',      status: 'Pending' },
  { vehicle_details: '2021 KIA Sportage (EP-5566)',      description: 'Wheel alignment and tire rotation',                status: 'Completed' },
];

async function seed() {
  console.log('🌱 Starting MechTrack database seeding...\n');

  // =============================================
  // 1. Ensure the admin user has a mechanics row
  // =============================================
  console.log('👤 Setting up admin account...');
  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
  const adminUser = existingUsers.find(u => u.email === 'darsharanasinghe2001@gmail.com');
  
  if (adminUser) {
    // Upsert admin into mechanics table
    const { error: adminErr } = await supabase
      .from('mechanics')
      .upsert({
        id: adminUser.id,
        full_name: 'Darsha Ranasinghe',
        email: adminUser.email,
        is_admin: true,
        hourly_rate: 50.00
      }, { onConflict: 'id' });
    
    if (adminErr) {
      console.error('  ⚠️  Admin upsert error:', adminErr.message);
    } else {
      console.log('  ✅ Admin "Darsha Ranasinghe" is set up with is_admin=true');
    }
  } else {
    console.log('  ⚠️  Admin user darsharanasinghe2001@gmail.com not found in auth.users. Skipping.');
  }

  // =============================================
  // 2. Create mock mechanic users
  // =============================================
  console.log('\n🔧 Creating mock mechanics...');
  const createdMechanicIds = [];

  for (const mech of mockMechanics) {
    // Check if user already exists
    const existing = existingUsers.find(u => u.email === mech.email);
    
    if (existing) {
      console.log(`  ⏭️  ${mech.full_name} (${mech.email}) already exists. Updating mechanics row...`);
      await supabase.from('mechanics').upsert({
        id: existing.id,
        full_name: mech.full_name,
        email: mech.email,
        is_admin: false,
        hourly_rate: mech.hourly_rate
      }, { onConflict: 'id' });
      createdMechanicIds.push(existing.id);
      continue;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: mech.email,
      password: mech.password,
      email_confirm: true,
      user_metadata: { full_name: mech.full_name }
    });

    if (authError) {
      console.error(`  ❌ Failed to create ${mech.email}:`, authError.message);
      continue;
    }

    // Insert into mechanics table
    const { error: dbError } = await supabase.from('mechanics').insert({
      id: authData.user.id,
      full_name: mech.full_name,
      email: mech.email,
      is_admin: false,
      hourly_rate: mech.hourly_rate
    });

    if (dbError) {
      console.error(`  ❌ DB insert failed for ${mech.email}:`, dbError.message);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
    } else {
      console.log(`  ✅ Created: ${mech.full_name} (${mech.email}) — Rate: $${mech.hourly_rate}/hr`);
      createdMechanicIds.push(authData.user.id);
    }
  }

  if (createdMechanicIds.length === 0) {
    console.log('\n⚠️  No mechanics were created. Cannot seed jobs or payroll.');
    return;
  }

  // =============================================
  // 3. Create mock jobs
  // =============================================
  console.log('\n📋 Creating mock repair jobs...');
  const jobsToInsert = jobTemplates.map((job, index) => ({
    vehicle_details: job.vehicle_details,
    description: job.description,
    assigned_to: createdMechanicIds[index % createdMechanicIds.length],
    status: job.status
  }));

  const { data: insertedJobs, error: jobsError } = await supabase
    .from('jobs')
    .insert(jobsToInsert)
    .select();

  if (jobsError) {
    console.error('  ❌ Jobs insert error:', jobsError.message);
  } else {
    console.log(`  ✅ Created ${insertedJobs.length} repair jobs`);
    insertedJobs.forEach(j => {
      const statusIcon = j.status === 'Completed' ? '🟢' : j.status === 'In Progress' ? '🟡' : '🔴';
      console.log(`     ${statusIcon} ${j.vehicle_details} — ${j.status}`);
    });
  }

  // =============================================
  // 4. Create mock payroll records
  // =============================================
  console.log('\n💰 Creating mock payroll records...');
  const payrollRecords = [];
  const hoursOptions = [35, 40, 42, 45, 38, 48, 36, 44];

  for (let i = 0; i < createdMechanicIds.length; i++) {
    // Each mechanic gets 2 payroll records
    for (let round = 0; round < 2; round++) {
      const mechId = createdMechanicIds[i];
      const hours = hoursOptions[(i * 2 + round) % hoursOptions.length];

      // Use the RPC function to calculate payroll correctly
      const { data, error } = await supabase.rpc('process_mechanic_payroll', {
        p_mechanic_id: mechId,
        p_total_hours: hours
      });

      if (error) {
        console.error(`  ❌ Payroll RPC error for mechanic ${i + 1}:`, error.message);
      } else {
        const total = typeof data === 'object' ? data.total_amount : data;
        console.log(`  ✅ Payroll processed: Mechanic ${i + 1}, ${hours}h → $${parseFloat(total || 0).toFixed(2)}`);
      }
    }
  }

  console.log('\n🎉 Seeding complete! Refresh your browser to see the data.');
  console.log('\n📝 Test Credentials (for mechanic login):');
  mockMechanics.forEach(m => {
    console.log(`   Email: ${m.email} | Password: ${m.password}`);
  });
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
