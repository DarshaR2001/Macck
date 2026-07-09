import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import AdminDashboard from './components/AdminDashboard';


// --- Placeholder Login Page ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // If the user is ALREADY logged in, automatically move them to the dashboard
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
    } else {
      // SUCCESS! Move the user to the main dashboard page
      navigate('/'); 
    }
    
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
      <form onSubmit={handleLogin} style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '320px' }}>
        <h2 style={{ marginTop: 0, color: '#1f2937', textAlign: 'center' }}>🛠️ MechTrack Login</h2>
        
        {errorMsg && <p style={{ color: '#dc2626', fontSize: '14px', backgroundColor: '#fee2e2', padding: '8px', borderRadius: '4px' }}>{errorMsg}</p>}
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#4b5563' }}>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#4b5563' }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

// --- Placeholder Dashboard Page ---
// --- Placeholder Dashboard Page ---
const Dashboard = () => {
  const { user, profile } = useAuth();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', color: 'white', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>⚙️ MechTrack</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Welcome, {profile?.name || user?.email}</span>
          <button onClick={handleLogout} style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* If they are an admin, show the AdminDashboard. Otherwise, show a mechanic placeholder */}
      {profile?.is_admin ? (
        <AdminDashboard />
      ) : (
        <div><h3>🔧 Mechanic Portal</h3><p>Your tasks will appear here.</p></div>
      )}
      
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
