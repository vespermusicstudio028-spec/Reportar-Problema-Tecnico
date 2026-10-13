import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://kcarjbybxaeyfechklko.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_DO0U-CVM5jIFEZKQ4oTcDw_8-zmbAPA';

// Assegura o uso do projeto oficial kcarjbybxaeyfechklko mesmo se a Vercel tiver variáveis de ambiente desatualizadas
let envUrl = import.meta.env.VITE_SUPABASE_URL;
let envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envUrl || !envUrl.includes('kcarjbybxaeyfechklko')) {
  envUrl = SUPABASE_URL;
  envKey = SUPABASE_ANON_KEY;
}

export const supabase = createClient(envUrl, envKey, {
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
