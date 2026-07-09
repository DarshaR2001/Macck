import { createClient } from '@supabase/supabase-js';

// Grab our keys from the .env file we just set up
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create the connection client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
