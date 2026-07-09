import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Make sure this path is correct

// Create the context
const AuthContext = createContext();

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Start in a loading state

  useEffect(() => {
    // This effect runs once when the component mounts
    const fetchSessionAndProfile = async () => {
      // 1. Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      // 2. If there's a user, fetch their profile from our 'mechanics' table
      if (currentUser) {
        const { data: profileData, error } = await supabase
          .from('mechanics')
          .select('*')
          .eq('id', currentUser.id)
          .single(); // .single() expects one row and simplifies the result

        if (error) {
          console.error("Error fetching profile:", error.message);
        } else {
          setProfile(profileData);
        }
      }
      
      // 3. We are done loading
      setLoading(false);
    };

    // Run the initial fetch
    fetchSessionAndProfile();

    // 4. Set up a listener for any future changes in auth state (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        setProfile(null); // Clear old profile

        // If a new user logs in, fetch their profile
        if (currentUser) {
          const { data: profileData } = await supabase
            .from('mechanics')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          setProfile(profileData);
        }
        
        // After a login/logout event, we are also done loading
        setLoading(false);
      }
    );

    // Cleanup: remove the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // The empty array [] means this effect runs only once

  const value = {
    user,
    profile,
    loading
  };

  // While loading, we can show a blank screen or a spinner.
  // This prevents the rest of the app from rendering with incomplete data.
  // The 'return loading ? null : ...' pattern is the key fix.
  return (
    <AuthContext.Provider value={value}>
      {loading ? null : children}
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
