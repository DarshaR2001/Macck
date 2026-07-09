import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminDashboard() {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Supabase Auth requires a password to create a user
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch all mechanics when the component loads
  const fetchMechanics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mechanics')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching mechanics:', error.message);
    } else {
      setMechanics(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  // Handle adding a new mechanic
  const handleAddMechanic = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      // 1. Create the user in Supabase Auth (this registers them)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (authError) throw authError;

      // 2. Add the profile record into our public 'mechanics' table
      const { error: profileError } = await supabase
        .from('mechanics')
        .insert([
          {
            id: authData.user.id, // Link to their new Auth ID!
            name: name,
            email: email,
            is_admin: false // Default to standard mechanic
          }
        ]);

      if (profileError) throw profileError;

      // Success!
      setFormSuccess('🔧 Mechanic added successfully!');
      setName('');
      setEmail('');
      setPassword('');
      setShowForm(false);
      fetchMechanics(); // Refresh our table list!

    } catch (err) {
      setFormError(err.message || 'Something went wrong.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0 }}>👥 Mechanics Roster</h2>
        <button 
          onClick={() => setShowForm(!showForm)} 
          style={{ padding: '8px 16px', background: showForm ? '#4b5563' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {showForm ? 'Cancel' : '➕ Add Mechanic'}
        </button>
      </div>

      {/* --- ADD MECHANIC FORM --- */}
      {showForm && (
        <form onSubmit={handleAddMechanic} style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Add New Mechanic</h3>
          {formError && <p style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px', borderRadius: '4px' }}>{formError}</p>}
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Temporary Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px' }} />
          </div>

          <button type="submit" style={{ padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
            Save Mechanic
          </button>
        </form>
      )}

      {formSuccess && <p style={{ color: '#059669', backgroundColor: '#d1fae5', padding: '10px', borderRadius: '4px', marginTop: '15px' }}>{formSuccess}</p>}

      {/* --- ROSTER TABLE --- */}
      {loading ? (
        <p style={{ marginTop: '20px' }}>Loading roster...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {mechanics.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No mechanics found in roster.</td>
              </tr>
            ) : (
              mechanics.map((mech) => (
                <tr key={mech.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{mech.name || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{mech.email}</td>
                  <td style={{ padding: '12px' }}>
                    {mech.is_admin ? '👑 Admin' : '🔧 Mechanic'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
