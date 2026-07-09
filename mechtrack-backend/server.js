const express = require('express');
const cors = require('cors');
const { supabase } = require('./lib/supabase');
const { requireAuth, requireAdmin } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

/**
 * --- Mechanics Endpoints ---
 */

// 1. Get Mechanics Roster (Authenticated)
app.get('/api/mechanics', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mechanics')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add a Mechanic (Admin Only, secure creation of user)
app.post('/api/mechanics', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, name, hourly_rate } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields (email, password, name)' });
  }

  try {
    // A. Create the user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authError) throw authError;

    const newUser = authData.user;

    // B. Create the mechanic profile in public.mechanics table
    const { data: mechanicData, error: dbError } = await supabase
      .from('mechanics')
      .insert([
        {
          id: newUser.id,
          full_name: name,
          email,
          is_admin: false,
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : 25.00
        }
      ])
      .select()
      .single();

    if (dbError) {
      // Revert user creation on database error
      await supabase.auth.admin.deleteUser(newUser.id);
      throw dbError;
    }

    res.status(201).json({ user: newUser, mechanic: mechanicData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * --- Repair Job Endpoints ---
 */

// 1. Get Jobs (Authenticated: Admin gets all, Mechanics get assigned)
app.get('/api/jobs', requireAuth, async (req, res) => {
  try {
    let query = supabase.from('jobs').select(`
      *,
      assigned_mechanic:mechanics(id, full_name, email)
    `);

    // If not an admin, filter by assigned_to
    if (!req.user.is_admin) {
      query = query.eq('assigned_to', req.user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create Job (Admin Only)
app.post('/api/jobs', requireAuth, requireAdmin, async (req, res) => {
  const { vehicleDetails, description, assignedTo } = req.body;
  if (!vehicleDetails || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          vehicle_details: vehicleDetails,
          description,
          assigned_to: assignedTo || null,
          status: 'Pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Job Status (Authenticated: Owner or Admin)
app.patch('/api/jobs/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['Pending', 'In Progress', 'Completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    // If not an admin, verify ownership
    if (!req.user.is_admin) {
      const { data: job, error: fetchError } = await supabase
        .from('jobs')
        .select('assigned_to')
        .eq('id', id)
        .single();
      
      if (fetchError || !job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You can only update your assigned jobs' });
      }
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * --- Payroll Endpoints ---
 */

// 1. Get Payroll logs (Authenticated: Admin gets all, Mechanics get personal)
app.get('/api/payroll', requireAuth, async (req, res) => {
  try {
    let query = supabase.from('payroll').select(`
      *,
      mechanic:mechanics(id, full_name, email)
    `);

    if (!req.user.is_admin) {
      query = query.eq('mechanic_id', req.user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Process Payroll via DB stored procedure (Admin Only)
app.post('/api/payroll/process', requireAuth, requireAdmin, async (req, res) => {
  const { mechanicId, totalHours } = req.body;
  if (!mechanicId || totalHours === undefined) {
    return res.status(400).json({ error: 'Missing mechanicId or totalHours' });
  }

  try {
    const { data, error } = await supabase.rpc('process_mechanic_payroll', {
      p_mechanic_id: mechanicId,
      p_total_hours: parseFloat(totalHours)
    });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling fallback
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 MechTrack backend server running on http://localhost:${PORT}`);
});
