const { createClient } = require('@supabase/supabase-js');

// Cliente con service role: SOLO usar en el backend, nunca exponer al frontend.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;
