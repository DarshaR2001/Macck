import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, getSeniorityLevels } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Form state — initialised from global profile
  const [fullName, setFullName]               = useState('');
  const [contactNumber, setContactNumber]     = useState('');
  const [dailyRate, setDailyRate]             = useState('');
  const [seniorityLevelId, setSeniorityLevelId] = useState('');
  const [isActive, setIsActive]               = useState(true);
  const [isAdminFlag, setIsAdminFlag]         = useState(false);

  const [seniorityLevels, setSeniorityLevels] = useState([]);
  const [saving, setSaving]                   = useState(false);
  const [successMsg, setSuccessMsg]           = useState('');
  const [errorMsg, setErrorMsg]               = useState('');

  // Populate form from profile on mount / when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setContactNumber(profile.contact_number || '');
      setDailyRate(profile.daily_rate ?? '');
      setSeniorityLevelId(profile.seniority_level_id ?? '');
      setIsActive(profile.is_active ?? true);
      setIsAdminFlag(profile.is_admin ?? false);
    }
  }, [profile]);

  // Load seniority levels for admin dropdown
  useEffect(() => {
    if (profile?.is_admin) {
      getSeniorityLevels()
        .then(setSeniorityLevels)
        .catch(() => {});
    }
  }, [profile?.is_admin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const fields = { full_name: fullName, contact_number: contactNumber };

    // Admin-only fields
    if (profile?.is_admin) {
      fields.daily_rate         = dailyRate;
      fields.seniority_level_id = seniorityLevelId || null;
      fields.is_active          = isActive;
      fields.is_admin           = isAdminFlag;
    }

    try {
      await updateProfile(fields);
      await refreshProfile(); // update global context so header name refreshes
      setSuccessMsg('Profile updated successfully! ✅');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <p style={{ padding: '40px' }}>Loading profile...</p>;

  const seniorityName = seniorityLevels.find(s => s.id === profile.seniority_level_id)?.name
    || profile.seniority_level?.name
    || '—';

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-card glass-panel">

        {/* Avatar + header */}
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {(profile.full_name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="profile-name">{profile.full_name || user?.email}</h2>
            <span className={`badge ${profile.is_admin ? 'badge-success' : 'badge-pending'}`}>
              {profile.is_admin ? '🛡 Admin' : '🔧 Mechanic'}
            </span>
          </div>
        </div>

        {errorMsg  && <div className="alert alert-error">⚠️ {errorMsg}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Always-visible fields ── */}
          <div className="profile-section-title">Personal Information</div>

          <div className="profile-grid">
            {/* Full Name — editable for everyone */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Contact Number — editable for everyone */}
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="tel"
                className="input-field"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="e.g. +94 77 123 4567"
              />
            </div>

            {/* Email — always read-only */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="field-readonly">
                <span>{user?.email}</span>
                <span className="readonly-badge">Managed via Auth</span>
              </div>
            </div>

            {/* Daily Rate — editable for admin, read-only for mechanic */}
            <div className="form-group">
              <label className="form-label">Daily Rate</label>
              {profile.is_admin ? (
                <input
                  type="number"
                  className="input-field"
                  step="0.01"
                  min="0"
                  value={dailyRate}
                  onChange={e => setDailyRate(e.target.value)}
                />
              ) : (
                <div className="field-readonly">
                  <span>${parseFloat(profile.daily_rate || 0).toFixed(2)} / day</span>
                  <span className="readonly-badge">Read Only</span>
                </div>
              )}
            </div>

            {/* Seniority Level */}
            <div className="form-group">
              <label className="form-label">Seniority Level</label>
              {profile.is_admin ? (
                <select
                  className="input-field"
                  value={seniorityLevelId}
                  onChange={e => setSeniorityLevelId(e.target.value)}
                >
                  <option value="">— Not assigned —</option>
                  {seniorityLevels.map(sl => (
                    <option key={sl.id} value={sl.id}>{sl.name}</option>
                  ))}
                </select>
              ) : (
                <div className="field-readonly">
                  <span>{seniorityName}</span>
                  <span className="readonly-badge">Read Only</span>
                </div>
              )}
            </div>

            {/* Account Status — admin only */}
            {profile.is_admin && (
              <>
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <div className="toggle-row">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={isActive}
                        onChange={e => setIsActive(e.target.checked)}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-text">{isActive ? 'Active' : 'Inactive'}</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Admin Privileges</label>
                  <div className="toggle-row">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={isAdminFlag}
                        onChange={e => setIsAdminFlag(e.target.checked)}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-text">{isAdminFlag ? 'Admin' : 'Mechanic'}</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              ← Back to Dashboard
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
