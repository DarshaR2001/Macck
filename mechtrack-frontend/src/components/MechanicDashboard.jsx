import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMechanicJobs, updateJobStatus, getMechanicPayrolls, getAdvances, requestAdvance } from '../lib/api';

export default function MechanicDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- Completion Note Modal State ---
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [completionNote, setCompletionNote] = useState('');

  // --- Salary Advances State ---
  const [advances, setAdvances] = useState([]);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceError, setAdvanceError] = useState('');
  const [advanceSuccess, setAdvanceSuccess] = useState('');

  useEffect(() => {
    // Wait for auth to finish resolving before we do anything
    if (authLoading) return;

    const fetchMechanicData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        // Fetch both jobs and payroll logs in parallel for speed
        const [jobsData, payrollData] = await Promise.all([
          getMechanicJobs(),
          getMechanicPayrolls()
        ]);
        setJobs(jobsData);
        setPayrolls(payrollData);

        // Fetch advances in background
        const advData = await getAdvances();
        setAdvances(advData);
      } catch (err) {
        setErrorMsg(err.message || 'Error fetching data.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchMechanicData();
    } else {
      // Auth resolved but no user — stop the spinner
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  const handleUpdateStatus = async (jobId, newStatus, note) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      await updateJobStatus(jobId, newStatus, note);
      setSuccessMsg(`Status updated to "${newStatus}"!`);
      
      // Refresh jobs list
      const jobsData = await getMechanicJobs();
      setJobs(jobsData);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update job status.');
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!completionNote.trim()) return;

    setShowCompletionModal(false);
    await handleUpdateStatus(selectedJobId, 'Completed', completionNote);
    setSelectedJobId('');
    setCompletionNote('');
  };

  const handleRequestAdvance = async (e) => {
    e.preventDefault();
    setAdvanceError('');
    setAdvanceSuccess('');
    try {
      await requestAdvance({ amount: parseFloat(advanceAmount), reason: advanceReason });
      setAdvanceSuccess('Advance request submitted! Awaiting admin approval.');
      setAdvanceAmount('');
      setAdvanceReason('');
      setShowAdvanceForm(false);
      const advData = await getAdvances();
      setAdvances(advData);
    } catch (err) {
      setAdvanceError(err.message || 'Failed to submit advance request.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="section-header">
        <h2>Mechanic Portal</h2>
      </div>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {loading ? (
        <p>Loading details...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* Active Job Cards */}
          <div>
            <h3 style={{ marginBottom: '20px' }}>Assigned Repair Jobs</h3>
            {jobs.length === 0 ? (
              <div className="form-card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>No active repair jobs assigned to you at the moment. Good job!</p>
              </div>
            ) : (
              <div className="job-grid">
                {jobs.map((job) => (
                  <div key={job.id} className="glass-panel job-card">
                    <div>
                      <div className="job-header">
                        <h4 className="job-vehicle">{job.vehicle_details}</h4>
                        <span className={`badge ${job.status === 'Completed' ? 'badge-success' : job.status === 'In Progress' ? 'badge-progress' : 'badge-pending'}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="job-desc">{job.description}</p>
                      {job.completion_note && (
                        <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)' }}>
                          <strong>Completion Note:</strong> {job.completion_note}
                        </div>
                      )}
                    </div>

                    <div className="job-actions">
                      {job.status === 'Pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(job.id, 'In Progress')}
                          className="btn btn-primary"
                        >
                          Start Work 🚀
                        </button>
                      )}
                      {job.status === 'In Progress' && (
                        <button 
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setShowCompletionModal(true);
                          }}
                          className="btn btn-success"
                        >
                          Complete Repair ✅
                        </button>
                      )}
                      {job.status === 'Completed' && (
                        <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                          Finished 🎉
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payroll Auditing History */}
          <div>
            <h3 style={{ marginBottom: '20px' }}>Your Earnings History</h3>
            {payrolls.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No payroll processing history available yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Days Worked</th>
                    <th>Base Amount</th>
                    <th>Bonus Pay</th>
                    <th>Advance Deduction</th>
                    <th>Total Paycheck</th>
                    <th>Processed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((pr) => (
                    <tr key={pr.id}>
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
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {pr.period_start ? `${new Date(pr.period_start).toLocaleDateString()} - ${new Date(pr.period_end).toLocaleDateString()}` : new Date(pr.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Salary Advances Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>💳 Salary Advances</h3>
              <button
                className={`btn ${showAdvanceForm ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => { setShowAdvanceForm(!showAdvanceForm); setAdvanceError(''); setAdvanceSuccess(''); }}
              >
                {showAdvanceForm ? 'Cancel' : '+ Request Advance'}
              </button>
            </div>

            {advanceError  && <div className="alert alert-error">{advanceError}</div>}
            {advanceSuccess && <div className="alert alert-success">{advanceSuccess}</div>}

            {showAdvanceForm && (
              <div className="form-card animate-fade-in" style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '14px' }}>New Advance Request</h4>
                <form onSubmit={handleRequestAdvance}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Amount ($)</label>
                    <input
                      type="number" min="1" step="0.01"
                      className="input-field"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="e.g. 300.00"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Reason (optional)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={advanceReason}
                      onChange={(e) => setAdvanceReason(e.target.value)}
                      placeholder="e.g. Medical expenses"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit Request</button>
                </form>
              </div>
            )}

            {advances.length === 0 ? (
              <div className="form-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                No advance requests yet.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map(adv => {
                    const statusColor = adv.status === 'Approved' ? '#3b82f6' : adv.status === 'Deducted' ? 'var(--success)' : adv.status === 'Rejected' ? '#ef4444' : 'var(--text-muted)';
                    return (
                      <tr key={adv.id}>
                        <td style={{ fontWeight: '700' }}>${parseFloat(adv.amount).toFixed(2)}</td>
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
          </div>

        </div>
      )}

      {/* Completion Note Modal */}
      {showCompletionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '30px',
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginBottom: '15px' }}>📝 Add Completion Note</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>
              Please describe the repairs performed and any parts used to complete this job.
            </p>
            <form onSubmit={handleModalSubmit}>
              <div className="form-group">
                <textarea
                  className="input-field"
                  rows="4"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="e.g., Replaced brake pads, bled the brake lines, and road tested successfully."
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCompletionModal(false);
                    setSelectedJobId('');
                    setCompletionNote('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Complete Job ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
