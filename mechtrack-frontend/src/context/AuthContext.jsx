import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Create the context
const AuthContext = createContext();

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Helper to fetch a user's mechanic profile
  const fetchProfile = async (userId) => {
    setProfileLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from('mechanics')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
        return null;
      }
      return profileData;
    } catch (err) {
      console.error("Profile fetch exception:", err);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchSessionAndProfile = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
        }

        const currentUser = data?.session?.user || null;

        if (!isMounted) return;
        setUser(currentUser);

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          if (isMounted) setProfile(profileData);
        }
      } catch (err) {
        console.error("Unhandled error in AuthContext:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSessionAndProfile();

    // Safety timeout: if loading takes more than 5 seconds, force show the app
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setProfileLoading(false);
      }
    }, 5000);

    // Listen for auth state changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        const currentUser = session?.user || null;
        setUser(currentUser);
        setProfile(null);

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          if (isMounted) setProfile(profileData);
        }

        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    // 1. Immediately clear local state so ProtectedRoute redirects instantly
    setUser(null);
    setProfile(null);

    // 2. Wipe all Supabase keys from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 3. Call Supabase signOut (best effort)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Supabase signOut error:', err);
    }
  };

  const value = {
    user,
    profile,
    loading,
    profileLoading,
    signOut: handleSignOut
  };

  // Show a loading spinner while auth OR profile is loading
  if (loading || profileLoading) {
    return (
      <AuthContext.Provider value={value}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-primary, #f8fafc)',
          color: 'var(--text-secondary, #475569)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          gap: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid var(--border-light, #e2e8f0)',
            borderTopColor: 'var(--accent-primary, #3b82f6)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          Loading MechTrack...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily use the context in other components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
