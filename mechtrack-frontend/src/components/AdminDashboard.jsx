import { useState, useEffect } from 'react';
import { 
  getMechanics, 
  createMechanic,
  deleteMechanic,
  getJobs, 
  createJob,
  deleteJob,
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
  const [dailyRate, setDailyRate] = useState('200.00');
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

  // Helpers for payroll period defaults
  const getFirstDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const getLastDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  // --- Payroll Form/List State ---
  const [payrolls, setPayrolls] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [daysWorked, setDaysWorked] = useState('');
  const [periodStart, setPeriodStart] = useState(getFirstDayOfMonth());
  const [periodEnd, setPeriodEnd] = useState(getLastDayOfMonth());
  const [bonusAmount, setBonusAmount] = useState('0.00');
  const [payrollError, setPayrollError] = useState('');
  const [payrollSuccess, setPayrollSuccess] = useState('');

  // --- Delete Confirmation State ---
  // { type: 'mechanic'|'job', id: string } or null
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  const handleDeleteMechanic = async (mechanicId) => {
    try {
      await deleteMechanic(mechanicId);
      setConfirmDelete(null);
      fetchMechanics();
    } catch (err) {
      setRosterError(err.message || 'Failed to delete mechanic.');
      setConfirmDelete(null);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await deleteJob(jobId);
      setConfirmDelete(null);
      fetchJobsData();
    } catch (err) {
      setJobError(err.message || 'Failed to delete job.');
      setConfirmDelete(null);
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
        dailyRate
      });

      setRosterSuccess('Mechanic added successfully!');
      setName('');
      setEmail('');
      setPassword('');
      setDailyRate('200.00');
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
        periodStart,
        periodEnd,
        daysWorked,
        bonusAmount
      });

      setPayrollSuccess(`Payroll processed! Total Pay: $${parseFloat(result.total_amount).toFixed(2)}`);
      setSelectedMechanic('');
      setDaysWorked('');
      setBonusAmount('0.00');
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
                  <label className="form-label">Daily Rate ($)</label>
                  <input type="number" className="input-field" step="0.01" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} required />
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
                  <th>Daily Rate</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No mechanics found in roster.</td>
                  </tr>
                ) : (
                  mechanics.map((mech) => (
                    <tr key={mech.id}>
                      <td style={{ fontWeight: '500' }}>{mech.full_name || 'N/A'}</td>
                      <td>{mech.email}</td>
                      <td>${parseFloat(mech.daily_rate || 0).toFixed(2)}/day</td>
                      <td>
                        {mech.is_admin ? (
                          <span className="badge badge-success">Admin</span>
                        ) : (
                          <span className="badge badge-pending">Mechanic</span>
                        )}
                      </td>
                      <td>
                        {mech.is_admin ? null : (
                          confirmDelete?.type === 'mechanic' && confirmDelete?.id === mech.id ? (
                            <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sure?</span>
                              <button
                                onClick={() => handleDeleteMechanic(mech.id)}
                                className="btn btn-danger"
                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              >Yes</button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              >No</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete({ type: 'mechanic', id: mech.id })}
                              className="btn btn-danger"
                              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            >🗑 Delete</button>
                          )
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No repair jobs created yet.</td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: '600' }}>{job.vehicle_details}</td>
                      <td>
                        <div>{job.description}</div>
                        {job.completion_note && (
                          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)' }}>
                            <strong>Completion Note:</strong> {job.completion_note}
                          </div>
                        )}
                      </td>
                      <td>{job.assigned_mechanic?.full_name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${job.status === 'Completed' ? 'badge-success' : job.status === 'In Progress' ? 'badge-progress' : 'badge-pending'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>
                        {confirmDelete?.type === 'job' && confirmDelete?.id === job.id ? (
                          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sure?</span>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="btn btn-danger"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >Yes</button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >No</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete({ type: 'job', id: job.id })}
                            className="btn btn-danger"
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                          >🗑 Delete</button>
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
                      <option key={mech.id} value={mech.id}>{mech.full_name} (${parseFloat(mech.daily_rate || 0).toFixed(2)}/day)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Period Start Date</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={periodStart} 
                    onChange={(e) => setPeriodStart(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Period End Date</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={periodEnd} 
                    onChange={(e) => setPeriodEnd(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Total Days Worked</label>
                  <input 
                    type="number" 
                    className="input-field"
                    step="0.1" 
                    min="0"
                    value={daysWorked} 
                    onChange={(e) => setDaysWorked(e.target.value)} 
                    placeholder="e.g. 21.5" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bonus Payment ($)</label>
                  <input 
                    type="number" 
                    className="input-field"
                    step="0.01" 
                    min="0"
                    value={bonusAmount} 
                    onChange={(e) => setBonusAmount(e.target.value)} 
                    placeholder="e.g. 50.00" 
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
                      <th>Period</th>
                      <th>Days Worked</th>
                      <th>Base Pay</th>
                      <th>Bonus</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>No payroll records found.</td>
                      </tr>
                    ) : (() => {
                      // Group rows by mechanic so the name only shows on the first row per mechanic
                      let lastMechanicId = null;
                      return payrolls.map((pr) => {
                        const isFirstInGroup = pr.mechanic_id !== lastMechanicId;
                        lastMechanicId = pr.mechanic_id;
                        return (
                          <tr
                            key={pr.id}
                            style={isFirstInGroup && payrolls.indexOf(pr) !== 0
                              ? { borderTop: '2px solid var(--border-light, #e2e8f0)' }
                              : {}}
                          >
                            <td style={{ fontWeight: '600' }}>
                              {isFirstInGroup ? (pr.mechanic?.full_name || 'Unknown') : ''}
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {pr.period_start ? `${new Date(pr.period_start).toLocaleDateString()} - ${new Date(pr.period_end).toLocaleDateString()}` : new Date(pr.created_at).toLocaleDateString()}
                            </td>
                            <td>{pr.days_worked} days</td>
                            <td>${parseFloat(pr.base_amount).toFixed(2)}</td>
                            <td style={{ color: parseFloat(pr.bonus_amount) > 0 ? 'var(--danger)' : 'inherit' }}>
                              ${parseFloat(pr.bonus_amount).toFixed(2)}
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                              ${parseFloat(pr.total_amount).toFixed(2)}
                            </td>
                          </tr>
                        );
                      });
                    })()}
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
