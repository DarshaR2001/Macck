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
export const createMechanic = async ({ email, password, name, hourlyRate }) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/mechanics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, name, hourly_rate: hourlyRate })
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
export const updateJobStatus = async (jobId, status) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
};

/**
 * --- Payroll API ---
 */

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
export const processPayroll = async ({ mechanicId, totalHours }) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/payroll/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mechanicId, totalHours })
  });
  return handleResponse(res);
};
