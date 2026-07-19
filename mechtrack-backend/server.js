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
  const { email, password, name, daily_rate } = req.body;
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
          daily_rate: daily_rate ? parseFloat(daily_rate) : 200.00
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

// 3. Delete Mechanic (Admin Only) — cascades through related records
app.delete('/api/mechanics/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Step 1: Delete all payroll records for this mechanic (FK: payroll.mechanic_id)
    const { error: payrollError } = await supabase
      .from('payroll')
      .delete()
      .eq('mechanic_id', id);
    if (payrollError) throw payrollError;

    // Step 2: Unassign any jobs assigned to this mechanic (FK: jobs.assigned_to)
    const { error: jobsError } = await supabase
      .from('jobs')
      .update({ assigned_to: null })
      .eq('assigned_to', id);
    if (jobsError) throw jobsError;

    // Step 3: Delete from mechanics table
    const { error: dbError } = await supabase
      .from('mechanics')
      .delete()
      .eq('id', id);
    if (dbError) throw dbError;

    // Step 4: Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) console.warn('Auth delete warning:', authError.message);

    res.status(200).json({ message: 'Mechanic deleted successfully' });
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

// 3. Delete Job (Admin Only)
app.delete('/api/jobs/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Job Status (Authenticated: Owner or Admin)
app.patch('/api/jobs/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, completionNote } = req.body;
  
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

    const updateObj = { status };
    if (status === 'Completed' && completionNote !== undefined) {
      updateObj.completion_note = completionNote;
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update Job Billing (Admin Only)
app.patch('/api/jobs/:id/billing', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { customer_price, payment_status } = req.body;

  if (customer_price === undefined || !payment_status) {
    return res.status(400).json({ error: 'Missing customer_price or payment_status' });
  }
  if (!['Paid', 'Not paid'].includes(payment_status)) {
    return res.status(400).json({ error: 'payment_status must be "Paid" or "Not paid"' });
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .update({
        customer_price: parseFloat(customer_price),
        payment_status,
        billed_at: new Date().toISOString()
      })
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
 * --- Salary Advance Endpoints ---
 */

// 1. Get advances (Admin gets all with mechanic details; Mechanic gets own)
app.get('/api/advances', requireAuth, async (req, res) => {
  try {
    let query = supabase.from('salary_advances').select(`
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

// 2. Create advance request (Mechanic)
app.post('/api/advances', requireAuth, async (req, res) => {
  const { amount, reason } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  try {
    const { data, error } = await supabase
      .from('salary_advances')
      .insert([{
        mechanic_id:  req.user.id,
        amount:       parseFloat(amount),
        reason:       reason || null,
        request_date: new Date().toISOString().split('T')[0],
        status:       'Pending'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Approve or Reject an advance (Admin only)
app.patch('/api/advances/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be "Approved" or "Rejected"' });
  }

  try {
    const { data, error } = await supabase
      .from('salary_advances')
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
 * --- Job Metrics Endpoints ---
 */

// GET /api/jobs/revenue-metric?mechanicId=...&start=...&end=... (Admin only)
app.get('/api/jobs/revenue-metric', requireAuth, requireAdmin, async (req, res) => {
  const { mechanicId, start, end } = req.query;
  if (!mechanicId || !start || !end) {
    return res.status(400).json({ error: 'Missing mechanicId, start, or end' });
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('customer_price')
      .eq('assigned_to', mechanicId)
      .eq('status', 'Completed')
      .gte('completed_at', start)
      .lte('completed_at', end);

    if (error) throw error;

    const totalRevenue = data.reduce((sum, r) => sum + parseFloat(r.customer_price || 0), 0);
    res.status(200).json({ totalRevenue: parseFloat(totalRevenue.toFixed(2)) });
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
  const { mechanicId, periodStart, periodEnd, daysWorked, bonusAmount } = req.body;
  if (!mechanicId || daysWorked === undefined) {
    return res.status(400).json({ error: 'Missing mechanicId or daysWorked' });
  }

  try {
    const { data, error } = await supabase.rpc('process_mechanic_payroll', {
      p_mechanic_id: mechanicId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_days_worked: parseFloat(daysWorked),
      p_bonus_amount: parseFloat(bonusAmount || 0)
    });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * --- Profile & Seniority Endpoints ---
 */

// 1. Get all seniority levels (for dropdown in admin profile form)
app.get('/api/seniority-levels', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('seniority_levels')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update own profile — field-level access enforced here AND at DB trigger level
app.patch('/api/profile', requireAuth, async (req, res) => {
  const { full_name, contact_number, daily_rate, seniority_level_id, is_active, is_admin } = req.body;

  // Build the update object based on role
  const updates = {};

  // Both mechanics and admins can edit these
  if (full_name     !== undefined) updates.full_name     = full_name;
  if (contact_number !== undefined) updates.contact_number = contact_number;

  // Only admins can edit protected fields
  if (req.user.is_admin) {
    if (daily_rate        !== undefined) updates.daily_rate        = parseFloat(daily_rate);
    if (seniority_level_id !== undefined) updates.seniority_level_id = seniority_level_id ? parseInt(seniority_level_id) : null;
    if (is_active          !== undefined) updates.is_active          = Boolean(is_active);
    if (is_admin           !== undefined) updates.is_admin           = Boolean(is_admin);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  try {
    const { data, error } = await supabase
      .from('mechanics')
      .update(updates)
      .eq('id', req.user.id)
      .select(`*, seniority_level:seniority_levels(id, name)`)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * --- Financial Reports Endpoint ---
 */

// GET /api/reports/financial?year=2026&month=7 (Admin Only)
app.get('/api/reports/financial', requireAuth, requireAdmin, async (req, res) => {
  const year  = parseInt(req.query.year  || new Date().getFullYear());
  const month = parseInt(req.query.month || new Date().getMonth() + 1);

  // Build date range for the given month
  const periodStart = new Date(year, month - 1, 1).toISOString();
  const periodEnd   = new Date(year, month, 0, 23, 59, 59).toISOString();

  try {
    // 1. Revenue: sum of customer_price for Paid jobs billed in the month
    const { data: jobRows, error: jobErr } = await supabase
      .from('jobs')
      .select('customer_price')
      .eq('payment_status', 'Paid')
      .gte('billed_at', periodStart)
      .lte('billed_at', periodEnd);

    if (jobErr) throw jobErr;

    const revenue = jobRows.reduce((sum, r) => sum + parseFloat(r.customer_price || 0), 0);

    // 2. Salaries: sum of total_amount for Paid payroll records in the month
    const { data: payrollRows, error: payrollErr } = await supabase
      .from('payroll')
      .select('total_amount')
      .eq('status', 'Paid')
      .gte('period_end', periodStart)
      .lte('period_end', periodEnd);

    if (payrollErr) throw payrollErr;

    const salaries = payrollRows.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

    res.status(200).json({
      year,
      month,
      revenue:    parseFloat(revenue.toFixed(2)),
      salaries:   parseFloat(salaries.toFixed(2)),
      net_profit: parseFloat((revenue - salaries).toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/annual?year=2026 (Admin Only)
app.get('/api/reports/annual', requireAuth, requireAdmin, async (req, res) => {
  const year = parseInt(req.query.year || new Date().getFullYear());
  const yearStart = new Date(year, 0, 1).toISOString();
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59).toISOString();

  try {
    const { data: jobRows, error: jobErr } = await supabase
      .from('jobs')
      .select('customer_price, billed_at')
      .eq('payment_status', 'Paid')
      .gte('billed_at', yearStart)
      .lte('billed_at', yearEnd);
    if (jobErr) throw jobErr;

    const { data: payrollRows, error: payrollErr } = await supabase
      .from('payroll')
      .select('total_amount, period_end')
      .eq('status', 'Paid')
      .gte('period_end', yearStart)
      .lte('period_end', yearEnd);
    if (payrollErr) throw payrollErr;

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
      revenue: 0,
      salaries: 0
    }));

    jobRows.forEach(r => {
      const m = new Date(r.billed_at).getMonth();
      months[m].revenue += parseFloat(r.customer_price || 0);
    });
    payrollRows.forEach(r => {
      const m = new Date(r.period_end).getMonth();
      months[m].salaries += parseFloat(r.total_amount || 0);
    });

    const result = months.map(m => ({
      ...m,
      revenue:    parseFloat(m.revenue.toFixed(2)),
      salaries:   parseFloat(m.salaries.toFixed(2)),
      net_profit: parseFloat((m.revenue - m.salaries).toFixed(2))
    }));

    res.status(200).json({ year, months: result });
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
