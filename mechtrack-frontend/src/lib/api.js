import { supabase } from './supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Helper to get Authorization headers
 */
const getAuthHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session) throw new Error('No active session. Please log in.');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
};

/**
 * Helper to handle response and parse JSON errors
 */
const handleResponse = async (res) => {
  if (!res.ok) {
    let errorMessage = await res.text();
    try {
      const errorJson = JSON.parse(errorMessage);
      errorMessage = errorJson.error || errorMessage;
    } catch (e) {
      // Not JSON, keep original text
    }
    throw new Error(errorMessage);
  }
  return res.json();
};

/**
 * --- Mechanics API ---
 */

// Fetch all mechanics
export const getMechanics = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/mechanics`, { headers });
  return handleResponse(res);
};

// Create a new mechanic securely
export const createMechanic = async ({ email, password, name, dailyRate }) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/mechanics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, name, daily_rate: dailyRate })
  });
  return handleResponse(res);
};

// Delete a mechanic (admin only)
export const deleteMechanic = async (mechanicId) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/mechanics/${mechanicId}`, {
    method: 'DELETE',
    headers
  });
  return handleResponse(res);
};

/**
 * --- Jobs API ---
 */

// Fetch all jobs (for Admin)
export const getJobs = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs`, { headers });
  return handleResponse(res);
};

// Fetch jobs assigned to a specific mechanic (Using same endpoint, backend filters by token)
export const getMechanicJobs = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// Create a job (Admin only)
export const createJob = async ({ vehicleDetails, description, assignedTo }) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ vehicleDetails, description, assignedTo })
  });
  return handleResponse(res);
};

// Update status of a job (Mechanics or Admins)
export const updateJobStatus = async (jobId, status, completionNote) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status, completionNote })
  });
  return handleResponse(res);
};

// Delete a job (admin only)
export const deleteJob = async (jobId) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
    method: 'DELETE',
    headers
  });
  return handleResponse(res);
};

// Update billing info on a completed job (Admin only)
export const updateJobBilling = async (jobId, { customer_price, payment_status }) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/billing`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ customer_price, payment_status })
  });
  return handleResponse(res);
};

// Fetch financial report for a given month/year (Admin only)
export const getFinancialReport = async (year, month) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/reports/financial?year=${year}&month=${month}`, { headers });
  return handleResponse(res);
};

// Fetch annual report data (all 12 months) for charts (Admin only)
export const getAnnualReport = async (year) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/reports/annual?year=${year}`, { headers });
  return handleResponse(res);
};

// Fetch total completed job revenue for a mechanic within a date range (Admin only)
export const getMechanicRevenueMetric = async (mechanicId, start, end) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs/revenue-metric?mechanicId=${mechanicId}&start=${start}&end=${end}`, { headers });
  return handleResponse(res);
};

/**
 * --- Salary Advances API ---
 */

// Fetch advances (Admin: all; Mechanic: own)
export const getAdvances = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/advances`, { headers });
  return handleResponse(res);
};

// Mechanic requests a salary advance
export const requestAdvance = async ({ amount, reason }) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/advances`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount, reason })
  });
  return handleResponse(res);
};

// Admin approves or rejects an advance
export const updateAdvanceStatus = async (advanceId, status) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/advances/${advanceId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
};



// Fetch all payroll history records (Admin only)
export const getPayrolls = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/payroll`, { headers });
  return handleResponse(res);
};

// Fetch payroll history for a specific mechanic (Backend filters by token)
export const getMechanicPayrolls = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/payroll`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// Run the payroll calculation RPC (Admin only)
export const processPayroll = async ({ mechanicId, periodStart, periodEnd, daysWorked, bonusAmount }) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/payroll/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mechanicId, periodStart, periodEnd, daysWorked, bonusAmount })
  });
  return handleResponse(res);
};

/**
 * --- Profile API ---
 */

// Fetch all seniority levels (for admin dropdown)
export const getSeniorityLevels = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/seniority-levels`, { headers });
  return handleResponse(res);
};

// Update the calling user's own profile (field access enforced by backend)
export const updateProfile = async (fields) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(fields)
  });
  return handleResponse(res);
};

