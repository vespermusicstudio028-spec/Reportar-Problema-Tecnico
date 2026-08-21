import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://kwmautkzxgwxdfwbfuha.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bWF1dGt6eGd3eGRmd2JmdWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDIzMjMsImV4cCI6MjA4NjgxODMyM30.haCDn--0_h3bHSXC4bBxQh6KD5XLiEVIY-r6_oB2MS8';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

