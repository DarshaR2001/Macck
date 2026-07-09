import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import MechanicDashboard from './components/MechanicDashboard';
import './App.css';

// --- Login Page ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Only redirect to dashboard if user is logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setErrorMsg(error.message);
    }
    // Don't navigate here — the AuthContext listener will update `user`,
    // which triggers the useEffect above to navigate to '/'
    
    setLoading(false);
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
  const { user, profile, signOut } = useAuth();

  return (
    <div className="app-container animate-fade-in">
      <header className="dashboard-header">
        <div className="brand-title">⚙️ MechTrack</div>
        <div className="user-controls">
          <span className="welcome-text">Welcome, {profile?.full_name || user?.email}</span>
          <button onClick={signOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="main-content">
        {profile?.is_admin ? (
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
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
