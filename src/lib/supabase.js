import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only throw error at runtime, not during build
// This allows the module to be imported during static generation
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables. Please check .env.local file.');
}

// During build, create a client with empty strings if env vars are missing
// This prevents build errors, but the client won't work until env vars are set
const url = supabaseUrl || '';
const key = supabaseAnonKey || '';

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
