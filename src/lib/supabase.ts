import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://rrjxvuvkniyxnocvlbqn.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyanh2dXZrbml5eG5vY3ZsYnFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODMxNjMsImV4cCI6MjEwNzQ1OTE2M30.wJFzIjkgXXDVHradO2Pze-n44CrLnzP4ql9BVyELcUc';

let envUrl = import.meta.env.VITE_SUPABASE_URL;
let envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envUrl || !envUrl.includes('supabase.co')) {
  envUrl = defaultUrl;
  envKey = defaultAnonKey;
}

export const supabase = createClient(envUrl, envKey || defaultAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    fetch: fetch.bind(globalThis),
    headers: { 'x-application-name': 'reportar-problema-tecnico' },
  },
  db: {
    schema: 'public',
  },
});
