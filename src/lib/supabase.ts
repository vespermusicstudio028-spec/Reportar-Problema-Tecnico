import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://kcarjbybxaeyfechklko.supabase.co';
const defaultAnonKey = 'sb_publishable_DO0U-CVM5jIFEZKQ4oTcDw_8-zmbAPA';

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
  db: {
    schema: 'public',
  },
});
