import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

console.log('AEGIS Client System Diagnostic (Fresh Build Check):', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey && supabaseAnonKey !== 'placeholder',
  envKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
