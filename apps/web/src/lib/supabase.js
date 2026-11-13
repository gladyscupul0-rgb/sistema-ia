import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

// SvelteKit lee PUBLIC_* del entorno del proceso en runtime ($env/dynamic/public).
// Esto funciona tanto en Vercel (variables del dashboard) como en local (apps/web/.env).
const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseAnonKey.startsWith('PEGA_AQUI')
);

if (!supabaseConfigured) {
  console.error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en el entorno del frontend');
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true
    }
  }
);
