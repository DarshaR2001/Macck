import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMechanicJobs, updateJobStatus, getMechanicPayrolls } from '../lib/api';

export default function MechanicDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchMechanicData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        
        // Fetch both jobs and payroll logs for this mechanic
        const jobsData = await getMechanicJobs(); // Now fetched securely via API with JWT
        setJobs(jobsData);
        
        const payrollData = await getMechanicPayrolls();
        setPayrolls(payrollData);
      } catch (err) {
        setErrorMsg(err.message || 'Error fetching data.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchMechanicData();
    }
  }, [user?.id]);

  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      await updateJobStatus(jobId, newStatus);
      setSuccessMsg(`Status updated to "${newStatus}"!`);
      
      // Refresh jobs list
      const jobsData = await getMechanicJobs();
      setJobs(jobsData);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update job status.');
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
                          onClick={() => handleUpdateStatus(job.id, 'Completed')}
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
                    <th>Hours Worked</th>
                    <th>Base Amount</th>
                    <th>Bonus Pay (OT)</th>
                    <th>Total Paycheck</th>
                    <th>Processed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((pr) => (
                    <tr key={pr.id}>
                      <td>{pr.total_hours}h</td>
                      <td>${parseFloat(pr.base_amount).toFixed(2)}</td>
                      <td style={{ color: parseFloat(pr.bonus_amount) > 0 ? 'var(--danger)' : 'inherit' }}>
                        ${parseFloat(pr.bonus_amount).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                        ${parseFloat(pr.total_amount).toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(pr.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
