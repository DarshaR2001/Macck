import { useState, useEffect } from 'react';
import { 
  getMechanics, 
  createMechanic, 
  getJobs, 
  createJob, 
  getPayrolls, 
  processPayroll 
} from '../lib/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('roster');
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Roster Form State ---
  const [showRosterForm, setShowRosterForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hourlyRate, setHourlyRate] = useState('25.00');
  const [rosterError, setRosterError] = useState('');
  const [rosterSuccess, setRosterSuccess] = useState('');

  // --- Job Form/List State ---
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [jobError, setJobError] = useState('');
  const [jobSuccess, setJobSuccess] = useState('');

  // --- Payroll Form/List State ---
  const [payrolls, setPayrolls] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [payrollError, setPayrollError] = useState('');
  const [payrollSuccess, setPayrollSuccess] = useState('');

  // --- API Fetch Functions ---
  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const data = await getMechanics();
      setMechanics(data);
    } catch (err) {
      console.error('Error fetching mechanics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobsData = async () => {
    try {
      setJobsLoading(true);
      const data = await getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Error fetching jobs:', err.message);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchPayrollsData = async () => {
    try {
      setPayrollLoading(true);
      const data = await getPayrolls();
      setPayrolls(data);
    } catch (err) {
      console.error('Error fetching payrolls:', err.message);
    } finally {
      setPayrollLoading(false);
    }
  };

  // Run when component mounts & tab changes
  useEffect(() => {
    fetchMechanics();
  }, []);

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobsData();
    } else if (activeTab === 'payroll') {
      fetchPayrollsData();
    }
  }, [activeTab]);

  // --- Handlers ---
  const handleAddMechanic = async (e) => {
    e.preventDefault();
    setRosterError('');
    setRosterSuccess('');

    try {
      await createMechanic({
        email,
        password,
        name,
        hourlyRate
      });

      setRosterSuccess('Mechanic added successfully!');
      setName('');
      setEmail('');
      setPassword('');
      setHourlyRate('25.00');
      setShowRosterForm(false);
      fetchMechanics();
    } catch (err) {
      setRosterError(err.message || 'Something went wrong.');
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setJobError('');
    setJobSuccess('');

    try {
      await createJob({
        vehicleDetails,
        description,
        assignedTo
      });

      setJobSuccess('Job created and assigned successfully!');
      setVehicleDetails('');
      setDescription('');
      setAssignedTo('');
      setShowJobForm(false);
      fetchJobsData();
    } catch (err) {
      setJobError(err.message || 'Could not create job.');
    }
  };

  const handleProcessPayroll = async (e) => {
    e.preventDefault();
    setPayrollError('');
    setPayrollSuccess('');

    try {
      const result = await processPayroll({
        mechanicId: selectedMechanic,
        totalHours: hoursWorked
      });

      setPayrollSuccess(`Payroll processed! Total Pay: $${parseFloat(result.total_amount).toFixed(2)}`);
      setSelectedMechanic('');
      setHoursWorked('');
      fetchPayrollsData();
    } catch (err) {
      setPayrollError(err.message || 'Failed to process payroll.');
    }
  };

  return (
    <div className="animate-fade-in">
      
      {/* Tab Switcher */}
      <div className="tabs-container">
        <button 
          onClick={() => setActiveTab('roster')} 
          className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
        >
          👥 Mechanics
        </button>
        <button 
          onClick={() => setActiveTab('jobs')} 
          className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
        >
          📋 Jobs
        </button>
        <button 
          onClick={() => setActiveTab('payroll')} 
          className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`}
        >
          💰 Payroll
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. MECHANICS ROSTER TAB */}
      {/* ======================================================== */}
      {activeTab === 'roster' && (
        <div className="animate-fade-in">
          <div className="section-header">
            <h2>Mechanics Roster</h2>
            <button 
              onClick={() => setShowRosterForm(!showRosterForm)} 
              className={`btn ${showRosterForm ? 'btn-secondary' : 'btn-primary'}`}
            >
              {showRosterForm ? 'Cancel' : '➕ Add Mechanic'}
            </button>
          </div>

          {showRosterForm && (
            <div className="form-card animate-fade-in">
              <h3 style={{ marginBottom: '20px' }}>Add New Mechanic</h3>
              {rosterError && <div className="alert alert-error">{rosterError}</div>}
              
              <form onSubmit={handleAddMechanic} className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Hourly Rate ($)</label>
                  <input type="number" className="input-field" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" />
                </div>

                <div className="full-width">
                  <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                    Save Mechanic
                  </button>
                </div>
              </form>
            </div>
          )}

          {rosterSuccess && <div className="alert alert-success">{rosterSuccess}</div>}

          {loading ? (
            <p>Loading roster...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Hourly Rate</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>No mechanics found in roster.</td>
                  </tr>
                ) : (
                  mechanics.map((mech) => (
                    <tr key={mech.id}>
                      <td style={{ fontWeight: '500' }}>{mech.full_name || 'N/A'}</td>
                      <td>{mech.email}</td>
                      <td>${parseFloat(mech.hourly_rate || 0).toFixed(2)}/hr</td>
                      <td>
                        {mech.is_admin ? (
                          <span className="badge badge-success">Admin</span>
                        ) : (
                          <span className="badge badge-pending">Mechanic</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. JOB MANAGEMENT TAB */}
      {/* ======================================================== */}
      {activeTab === 'jobs' && (
        <div className="animate-fade-in">
          <div className="section-header">
            <h2>Repair Job Management</h2>
            <button 
              onClick={() => setShowJobForm(!showJobForm)} 
              className={`btn ${showJobForm ? 'btn-secondary' : 'btn-primary'}`}
            >
              {showJobForm ? 'Cancel' : '➕ Create Job'}
            </button>
          </div>

          {showJobForm && (
            <div className="form-card animate-fade-in">
              <h3 style={{ marginBottom: '20px' }}>Create Repair Job</h3>
              {jobError && <div className="alert alert-error">{jobError}</div>}

              <form onSubmit={handleCreateJob} className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Vehicle Details</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={vehicleDetails} 
                    onChange={(e) => setVehicleDetails(e.target.value)} 
                    placeholder="e.g. 2018 Honda Civic (Plate: ABC-1234)" 
                    required 
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Job Description</label>
                  <textarea 
                    className="input-field"
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Describe repair required" 
                    required 
                    rows="3" 
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Assign Mechanic</label>
                  <select 
                    className="input-field"
                    value={assignedTo} 
                    onChange={(e) => setAssignedTo(e.target.value)} 
                    required
                  >
                    <option value="">-- Select a Mechanic --</option>
                    {mechanics.filter(m => !m.is_admin).map(mech => (
                      <option key={mech.id} value={mech.id}>{mech.full_name} ({mech.email})</option>
                    ))}
                  </select>
                </div>

                <div className="full-width">
                  <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                    Assign Repair Job
                  </button>
                </div>
              </form>
            </div>
          )}

          {jobSuccess && <div className="alert alert-success">{jobSuccess}</div>}

          {jobsLoading ? (
            <p>Loading repair jobs...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Description</th>
                  <th>Assigned Mechanic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>No repair jobs created yet.</td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: '600' }}>{job.vehicle_details}</td>
                      <td>{job.description}</td>
                      <td>{job.assigned_mechanic?.full_name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${job.status === 'Completed' ? 'badge-success' : job.status === 'In Progress' ? 'badge-progress' : 'badge-pending'}`}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PAYROLL PROCESSING TAB */}
      {/* ======================================================== */}
      {activeTab === 'payroll' && (
        <div className="animate-fade-in">
          <div className="section-header">
            <h2>Payroll Management</h2>
          </div>

          <div className="split-layout">
            {/* Run Payroll Form */}
            <div className="form-card" style={{ margin: 0 }}>
              <h3 style={{ marginBottom: '20px' }}>Process Payroll</h3>
              {payrollError && <div className="alert alert-error">{payrollError}</div>}
              {payrollSuccess && <div className="alert alert-success">{payrollSuccess}</div>}

              <form onSubmit={handleProcessPayroll}>
                <div className="form-group">
                  <label className="form-label">Select Mechanic</label>
                  <select 
                    className="input-field"
                    value={selectedMechanic} 
                    onChange={(e) => setSelectedMechanic(e.target.value)} 
                    required
                  >
                    <option value="">-- Select Mechanic --</option>
                    {mechanics.filter(m => !m.is_admin).map(mech => (
                      <option key={mech.id} value={mech.id}>{mech.full_name} (${parseFloat(mech.hourly_rate || 0).toFixed(2)}/hr)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Hours Worked</label>
                  <input 
                    type="number" 
                    className="input-field"
                    step="0.1" 
                    min="0"
                    value={hoursWorked} 
                    onChange={(e) => setHoursWorked(e.target.value)} 
                    placeholder="e.g. 45" 
                    required 
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Calculate & Save
                </button>
              </form>
            </div>

            {/* Payroll History */}
            <div>
              <h3 style={{ marginBottom: '20px' }}>Audit History</h3>
              {payrollLoading ? (
                <p>Loading payroll history...</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mechanic</th>
                      <th>Hours</th>
                      <th>Base Pay</th>
                      <th>Bonus (OT)</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center' }}>No payroll records found.</td>
                      </tr>
                    ) : (
                      payrolls.map((pr) => (
                        <tr key={pr.id}>
                          <td style={{ fontWeight: '600' }}>{pr.mechanic?.full_name || 'Unknown'}</td>
                          <td>{pr.total_hours}h</td>
                          <td>${parseFloat(pr.base_amount).toFixed(2)}</td>
                          <td style={{ color: parseFloat(pr.bonus_amount) > 0 ? 'var(--danger)' : 'inherit' }}>
                            ${parseFloat(pr.bonus_amount).toFixed(2)}
                          </td>
                          <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                            ${parseFloat(pr.total_amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
