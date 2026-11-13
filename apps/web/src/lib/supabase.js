import { createClient } from '@supabase/supabase-js';

// import.meta.env las inyecta Vite en el build (igual que en config.js).
// En Vercel estas variables se definen en el proyecto y llegan al build.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith('PEGA_AQUI')) {
  console.error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en apps/web/.env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true
  }
});
