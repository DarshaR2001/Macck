import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import MechanicDashboard from './components/MechanicDashboard';
import ProfilePage from './components/ProfilePage';
import './App.css';

// --- Root Handler: always signs out then shows login ---
// Supabase stores sessions in localStorage, so we must explicitly clear it
// before redirecting to the login page.
const RootHandler = () => {
  const { signOut } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const clearSession = async () => {
      await signOut(); // wipe existing session
      setDone(true);
    };
    clearSession();
  }, []);

  if (!done) return null; // brief moment while signing out
  return <Navigate to="/login" replace />;
};

// --- Login Page ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      // Navigate to dashboard only after a successful fresh login
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="login-page animate-fade-in">
      <div className="glass-panel login-card">
        <h2 className="login-title">⚙️ MechTrack</h2>
        
        {errorMsg && (
          <div className="alert alert-error">
            <span>⚠️</span> {errorMsg}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Dashboard Page ---
const Dashboard = () => {
  const { user, profile, profileLoading, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-container animate-fade-in">
      <header className="dashboard-header">
        <div className="brand-title">⚙️ MechTrack</div>
        <div className="user-controls">
          <span className="welcome-text">Welcome, {profile?.full_name || user?.email}</span>
          <button onClick={() => navigate('/profile')} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            👤 Profile
          </button>
          <button onClick={signOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="main-content">
        {profileLoading ? (
          // Wait for profile (is_admin flag) before deciding which dashboard to show
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '20px', height: '20px',
              border: '3px solid var(--border-light, #e2e8f0)',
              borderTopColor: 'var(--accent-primary, #3b82f6)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            Loading your dashboard...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : profile?.is_admin ? (
          <AdminDashboard />
        ) : (
          <MechanicDashboard />
        )}
      </main>
    </div>
  );
};


// --- Security Guard Component ---
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};

// --- Master Route Map ---
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root: sign out any existing session, then go to login */}
          <Route path="/" element={<RootHandler />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          {/* Catch-all: redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
