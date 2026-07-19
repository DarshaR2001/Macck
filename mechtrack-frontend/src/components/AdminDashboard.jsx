import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area
} from 'recharts';
import { 
  getMechanics, 
  createMechanic,
  deleteMechanic,
  getJobs, 
  createJob,
  deleteJob,
  getPayrolls, 
  processPayroll,
  updateJobBilling,
  getFinancialReport,
  getAnnualReport,
  getAdvances,
  updateAdvanceStatus,
  getMechanicRevenueMetric
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

  // --- Candidate ROI Metric ---
  const [candidateRevenue, setCandidateRevenue] = useState(null);
  const [candidateLoading, setCandidateLoading] = useState(false);

  // --- Collapsible month state for payroll history ---
  const [expandedMonths, setExpandedMonths] = useState({});

  // --- Delete Confirmation State ---
  // { type: 'mechanic'|'job', id: string } or null
  const [confirmDelete, setConfirmDelete] = useState(null);

  // --- Billing Modal State ---
  const [billingJob, setBillingJob] = useState(null); // the job being billed
  const [billingPrice, setBillingPrice] = useState('');
  const [billingStatus, setBillingStatus] = useState('Not paid');
  const [billingError, setBillingError] = useState('');
  const [billingSuccess, setBillingSuccess] = useState('');

  // --- Financial Reports State ---
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // --- Annual Chart State ---
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');

  // --- Advances State ---
  const [advances, setAdvances] = useState([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);
  const [advancesError, setAdvancesError] = useState('');

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
    } else if (activeTab === 'billing') {
      fetchJobsData();
    } else if (activeTab === 'reports') {
      fetchReport();
      fetchAnnualChart();
    } else if (activeTab === 'advances') {
      fetchAdvancesData();
    }
  }, [activeTab]);

  const fetchAdvancesData = async () => {
    setAdvancesLoading(true);
    setAdvancesError('');
    try {
      const data = await getAdvances();
      setAdvances(data);
    } catch (err) {
      setAdvancesError(err.message || 'Failed to load advances.');
    } finally {
      setAdvancesLoading(false);
    }
  };

  // Watch inputs to fetch candidate value metric
  useEffect(() => {
    const fetchCandidateMetric = async () => {
      if (!selectedMechanic || !periodStart || !periodEnd) {
        setCandidateRevenue(null);
        return;
      }
      setCandidateLoading(true);
      try {
        const metric = await getMechanicRevenueMetric(selectedMechanic, periodStart, periodEnd);
        setCandidateRevenue(metric.totalRevenue);
      } catch (err) {
        console.error('Error fetching candidate revenue:', err);
        setCandidateRevenue(0);
      } finally {
        setCandidateLoading(false);
      }
    };
    fetchCandidateMetric();
  }, [selectedMechanic, periodStart, periodEnd]);

  const fetchAnnualChart = async () => {
    setChartLoading(true);
    setChartError('');
    try {
      const data = await getAnnualReport(chartYear);
      setChartData(data.months);
    } catch (err) {
      setChartError(err.message || 'Failed to load chart data.');
    } finally {
      setChartLoading(false);
    }
  };

  const handleAdvanceAction = async (advanceId, status) => {
    try {
      await updateAdvanceStatus(advanceId, status);
      fetchAdvancesData();
    } catch (err) {
      setAdvancesError(err.message || 'Failed to update advance status.');
    }
  };

  const fetchReport = async () => {
    setReportLoading(true);
    setReportError('');
    try {
      const data = await getFinancialReport(reportYear, reportMonth);
      setReportData(data);
    } catch (err) {
      setReportError(err.message || 'Failed to load report.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleBillJob = async (e) => {
    e.preventDefault();
    setBillingError('');
    try {
      await updateJobBilling(billingJob.id, {
        customer_price: parseFloat(billingPrice),
        payment_status: billingStatus
      });
      setBillingSuccess(`Job billed successfully!`);
      setBillingJob(null);
      setBillingPrice('');
      setBillingStatus('Not paid');
      fetchJobsData();
    } catch (err) {
      setBillingError(err.message || 'Failed to save billing info.');
    }
  };

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
        <button 
          onClick={() => setActiveTab('billing')} 
          className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
        >
          🧾 Billing
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
        >
          📊 Reports
        </button>
        <button 
          onClick={() => setActiveTab('advances')} 
          className={`tab-btn ${activeTab === 'advances' ? 'active' : ''}`}
        >
          💳 Advances
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

              {/* Mechanic ROI Value Metric Card */}
              {selectedMechanic && (
                <div className="glass-panel" style={{ marginTop: '20px', padding: '16px', borderLeft: '4px solid var(--accent-primary)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>💼 Mechanic Value Metric</h4>
                  {candidateLoading ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating generated revenue...</p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '500' }}>
                      During this period, {mechanics.find(m => m.id === selectedMechanic)?.full_name || 'selected mechanic'} successfully completed jobs generating <span style={{ color: 'var(--success)', fontWeight: '700' }}>${parseFloat(candidateRevenue || 0).toFixed(2)}</span> in total garage revenue.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payroll History */}
            <div>
              <h3 style={{ marginBottom: '20px' }}>Audit History</h3>
              {payrollLoading ? (
                <p>Loading payroll history...</p>
              ) : (
                (() => {
                  // Helper to get Month Year label from Date string
                  const getMonthYearLabel = (dateStr) => {
                    if (!dateStr) return 'Unknown Period';
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
                  };

                  // Group payrolls by month/year label
                  const groupedPayrolls = payrolls.reduce((acc, pr) => {
                    const label = getMonthYearLabel(pr.period_end || pr.created_at);
                    if (!acc[label]) acc[label] = [];
                    acc[label].push(pr);
                    return acc;
                  }, {});

                  const sortedGroups = Object.keys(groupedPayrolls).sort((a, b) => {
                    // Sort descending by date
                    return new Date(b) - new Date(a);
                  });

                  if (payrolls.length === 0) {
                    return <div className="form-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payroll records found.</div>;
                  }

                  return sortedGroups.map(label => {
                    const isOpen = expandedMonths[label] !== false; // Default to open
                    const toggleMonth = () => {
                      setExpandedMonths(prev => ({
                        ...prev,
                        [label]: !isOpen
                      }));
                    };

                    const groupTotal = groupedPayrolls[label].reduce((sum, pr) => sum + parseFloat(pr.total_amount || 0), 0);

                    return (
                      <div key={label} style={{ marginBottom: '16px' }} className="glass-panel">
                        <div 
                          onClick={toggleMonth}
                          style={{ 
                            padding: '14px 18px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            fontSize: '0.95rem'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isOpen ? '▼' : '▶'} {label}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                              ({groupedPayrolls[label].length} paycheck{groupedPayrolls[label].length > 1 ? 's' : ''})
                            </span>
                          </span>
                          <span style={{ color: 'var(--success)' }}>Total: ${groupTotal.toFixed(2)}</span>
                        </div>

                        {isOpen && (
                          <div style={{ padding: '10px', overflowX: 'auto' }} className="animate-fade-in">
                            <table className="data-table" style={{ margin: 0, width: '100%', border: 'none' }}>
                              <thead>
                                <tr>
                                  <th>Mechanic</th>
                                  <th>Period</th>
                                  <th>Days Worked</th>
                                  <th>Base Pay</th>
                                  <th>Bonus</th>
                                  <th>Advance Deduction</th>
                                  <th>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupedPayrolls[label].map((pr) => (
                                  <tr key={pr.id}>
                                    <td style={{ fontWeight: '600' }}>
                                      {pr.mechanic?.full_name || 'Unknown'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                      {pr.period_start ? `${new Date(pr.period_start).toLocaleDateString()} - ${new Date(pr.period_end).toLocaleDateString()}` : new Date(pr.created_at).toLocaleDateString()}
                                    </td>
                                    <td>{pr.days_worked} days</td>
                                    <td>${parseFloat(pr.base_amount).toFixed(2)}</td>
                                    <td style={{ color: parseFloat(pr.bonus_amount) > 0 ? 'var(--success)' : 'inherit' }}>
                                      +${parseFloat(pr.bonus_amount).toFixed(2)}
                                    </td>
                                    <td style={{ color: parseFloat(pr.advance_deduction || 0) > 0 ? '#ef4444' : 'inherit' }}>
                                      -${parseFloat(pr.advance_deduction || 0).toFixed(2)}
                                    </td>
                                    <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                                      ${parseFloat(pr.total_amount).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. BILLING MANAGEMENT TAB                                 */}
      {/* ======================================================== */}
      {activeTab === 'billing' && (
        <div className="animate-fade-in">
          <div className="section-header">
            <h2>Billing Management</h2>
          </div>

          {billingSuccess && <div className="alert alert-success">{billingSuccess}</div>}

          {jobsLoading ? (
            <p>Loading jobs...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Description & Notes</th>
                  <th>Mechanic</th>
                  <th>Customer Price</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.filter(j => j.status === 'Completed').length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>No completed jobs to bill yet.</td>
                  </tr>
                ) : (
                  jobs.filter(j => j.status === 'Completed').map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: '600' }}>{job.vehicle_details}</td>
                      <td>
                        <div>{job.description}</div>
                        {job.completion_note && (
                          <div style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)' }}>
                            <strong>Note:</strong> {job.completion_note}
                          </div>
                        )}
                      </td>
                      <td>{job.assigned_mechanic?.full_name || '—'}</td>
                      <td style={{ fontWeight: '600' }}>
                        {job.customer_price > 0 ? `$${parseFloat(job.customer_price).toFixed(2)}` : <span style={{ color: 'var(--text-muted)' }}>Not set</span>}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          background: job.payment_status === 'Paid' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.13)',
                          color: job.payment_status === 'Paid' ? 'var(--success)' : '#ef4444'
                        }}>
                          {job.payment_status === 'Paid' ? '🟢 Paid' : '🔴 Not paid'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 14px', fontSize: '0.82rem' }}
                          onClick={() => {
                            setBillingJob(job);
                            setBillingPrice(job.customer_price > 0 ? String(job.customer_price) : '');
                            setBillingStatus(job.payment_status || 'Not paid');
                            setBillingError('');
                          }}
                        >
                          🧾 Bill Job
                        </button>
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
      {/* 5. FINANCIAL REPORTS TAB                                  */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="animate-fade-in">
          <div className="section-header">
            <h2>Financial Reports</h2>
          </div>

          {/* Month / Year Filter */}
          <div className="form-card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '28px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Month</label>
              <select
                className="input-field"
                value={reportMonth}
                onChange={(e) => setReportMonth(parseInt(e.target.value))}
                style={{ minWidth: '130px' }}
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <input
                type="number"
                className="input-field"
                value={reportYear}
                min="2020"
                max="2100"
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                style={{ width: '100px' }}
              />
            </div>
            <button className="btn btn-primary" onClick={fetchReport} style={{ marginBottom: '0' }}>
              Generate Report
            </button>
          </div>

          {reportError && <div className="alert alert-error">{reportError}</div>}

          {reportLoading ? (
            /* Loading skeletons */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[1,2,3].map(n => (
                <div key={n} className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius)', minHeight: '120px', background: 'var(--bg-tertiary)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  <div style={{ height: '14px', background: 'var(--border-light)', borderRadius: '6px', width: '60%', marginBottom: '16px' }} />
                  <div style={{ height: '32px', background: 'var(--border-light)', borderRadius: '6px', width: '80%' }} />
                </div>
              ))}
            </div>
          ) : reportData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {/* Revenue Card */}
              <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius)', borderTop: '4px solid var(--success)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💵 Total Revenue
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success)' }}>
                  ${reportData.revenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>Paid jobs billed this month</div>
              </div>

              {/* Salaries Card */}
              <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius)', borderTop: '4px solid #ef4444' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  👷 Total Salaries
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444' }}>
                  ${reportData.salaries.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>Processed payroll this month</div>
              </div>

              {/* Net Profit Card */}
              <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius)', borderTop: `4px solid ${reportData.net_profit >= 0 ? 'var(--success)' : '#ef4444'}` }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⚖️ Net Profit
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: reportData.net_profit >= 0 ? 'var(--success)' : '#ef4444' }}>
                  {reportData.net_profit >= 0 ? '+' : ''}${reportData.net_profit.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>Revenue − Salaries</div>
              </div>
            </div>
          ) : (
            <div className="form-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a month and year, then click <strong>Generate Report</strong>.
            </div>
          )}

          {/* --- Annual Trend Chart --- */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ marginBottom: '16px' }}>📈 Annual Financial Trend</h3>
            <div className="form-card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Year</label>
                <select
                  className="input-field"
                  value={chartYear}
                  onChange={(e) => setChartYear(parseInt(e.target.value))}
                  style={{ minWidth: '100px' }}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={fetchAnnualChart} style={{ marginBottom: 0 }}>
                Load Chart
              </button>
            </div>
            {chartError && <div className="alert alert-error">{chartError}</div>}
            {chartLoading ? (
              <div style={{ height: '300px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Loading chart data...
              </div>
            ) : chartData ? (
              <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius)' }}>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light, #e2e8f0)" />
                    <XAxis dataKey="monthName" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '8px' }}
                      formatter={(value, name) => [`$${parseFloat(value).toFixed(2)}`, name]}
                    />
                    <Legend />
                    <Bar dataKey="revenue"    name="Revenue"    fill="#22c55e" radius={[4,4,0,0]} />
                    <Bar dataKey="salaries"   name="Salaries"   fill="#ef4444" radius={[4,4,0,0]} />
                    <Line dataKey="net_profit" name="Net Profit" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} type="monotone" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="form-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a year and click <strong>Load Chart</strong>.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BILLING MODAL OVERLAY                                     */}
      {/* ======================================================== */}
      {billingJob && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '520px', padding: '32px',
            backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginBottom: '6px' }}>🧾 Bill Job</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Set the customer invoice amount and payment status.
            </p>

            {/* Read-only job info */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: '20px', fontSize: '0.88rem' }}>
              <div><strong>Vehicle:</strong> {billingJob.vehicle_details}</div>
              <div style={{ marginTop: '4px' }}><strong>Description:</strong> {billingJob.description}</div>
              {billingJob.completion_note && (
                <div style={{ marginTop: '4px', borderLeft: '3px solid var(--success)', paddingLeft: '8px', color: 'var(--text-secondary)' }}>
                  <strong>Completion Note:</strong> {billingJob.completion_note}
                </div>
              )}
              <div style={{ marginTop: '4px' }}><strong>Mechanic:</strong> {billingJob.assigned_mechanic?.full_name || '—'}</div>
            </div>

            {billingError && <div className="alert alert-error" style={{ marginBottom: '14px' }}>{billingError}</div>}

            <form onSubmit={handleBillJob}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Customer Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={billingPrice}
                  onChange={(e) => setBillingPrice(e.target.value)}
                  placeholder="e.g. 350.00"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label">Payment Status</label>
                <select
                  className="input-field"
                  value={billingStatus}
                  onChange={(e) => setBillingStatus(e.target.value)}
                >
                  <option value="Not paid">🔴 Not paid</option>
                  <option value="Paid">🟢 Paid</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setBillingJob(null); setBillingError(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Save Invoice ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ADVANCES & APPROVALS TAB                               */}
      {/* ======================================================== */}
      {activeTab === 'advances' && (
        <div className="animate-fade-in">
          <div className="section-header">
            <h2>Salary Advances</h2>
          </div>

          {advancesError && <div className="alert alert-error">{advancesError}</div>}

          {advancesLoading ? (
            <p>Loading advances...</p>
          ) : (
            <>
              {/* Pending Approvals */}
              <h3 style={{ marginBottom: '14px' }}>⏳ Pending Approvals</h3>
              {advances.filter(a => a.status === 'Pending').length === 0 ? (
                <div className="form-card" style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px' }}>
                  No pending advance requests.
                </div>
              ) : (
                <table className="data-table" style={{ marginBottom: '30px' }}>
                  <thead>
                    <tr>
                      <th>Mechanic</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.filter(a => a.status === 'Pending').map(adv => (
                      <tr key={adv.id}>
                        <td style={{ fontWeight: '600' }}>{adv.mechanic?.full_name || '—'}</td>
                        <td style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>${parseFloat(adv.amount).toFixed(2)}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{adv.reason || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(adv.request_date).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-success"
                              style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                              onClick={() => handleAdvanceAction(adv.id, 'Approved')}
                            >
                              ✅ Approve
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                              onClick={() => handleAdvanceAction(adv.id, 'Rejected')}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Advance History */}
              <h3 style={{ marginBottom: '14px' }}>📋 Advance History</h3>
              {advances.filter(a => a.status !== 'Pending').length === 0 ? (
                <div className="form-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No advance history yet.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mechanic</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.filter(a => a.status !== 'Pending').map(adv => {
                      const statusColor = adv.status === 'Approved' ? '#3b82f6' : adv.status === 'Deducted' ? 'var(--success)' : '#ef4444';
                      return (
                        <tr key={adv.id}>
                          <td style={{ fontWeight: '600' }}>{adv.mechanic?.full_name || '—'}</td>
                          <td>${parseFloat(adv.amount).toFixed(2)}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{adv.reason || '—'}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(adv.request_date).toLocaleDateString()}</td>
                          <td>
                            <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', background: `${statusColor}22`, color: statusColor }}>
                              {adv.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {/* BILLING MODAL */}
      {billingJob && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '520px', padding: '32px',
            backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginBottom: '6px' }}>🧾 Bill Job</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Set the customer invoice amount and payment status.
            </p>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: '20px', fontSize: '0.88rem' }}>
              <div><strong>Vehicle:</strong> {billingJob.vehicle_details}</div>
              <div style={{ marginTop: '4px' }}><strong>Description:</strong> {billingJob.description}</div>
              {billingJob.completion_note && (
                <div style={{ marginTop: '4px', borderLeft: '3px solid var(--success)', paddingLeft: '8px', color: 'var(--text-secondary)' }}>
                  <strong>Completion Note:</strong> {billingJob.completion_note}
                </div>
              )}
              <div style={{ marginTop: '4px' }}><strong>Mechanic:</strong> {billingJob.assigned_mechanic?.full_name || '—'}</div>
            </div>
            {billingError && <div className="alert alert-error" style={{ marginBottom: '14px' }}>{billingError}</div>}
            <form onSubmit={handleBillJob}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Customer Price ($)</label>
                <input type="number" min="0" step="0.01" className="input-field" value={billingPrice} onChange={(e) => setBillingPrice(e.target.value)} placeholder="e.g. 350.00" required />
              </div>
              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label">Payment Status</label>
                <select className="input-field" value={billingStatus} onChange={(e) => setBillingStatus(e.target.value)}>
                  <option value="Not paid">🔴 Not paid</option>
                  <option value="Paid">🟢 Paid</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setBillingJob(null); setBillingError(''); }}>Cancel</button>
                <button type="submit" className="btn btn-success">Save Invoice ✅</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
