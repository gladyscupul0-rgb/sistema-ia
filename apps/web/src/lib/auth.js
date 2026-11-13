import { supabase } from '$lib/supabase';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// --- Login tradicional (JWT propio del backend) ---

export function getLocalToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getLocalUser() {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearLocalSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function authRequest(path, body) {
  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  saveSession(data);
  return data;
}

export const loginWithPassword = (email, password) =>
  authRequest('/api/auth/login', { email, password });

export const registerWithPassword = (email, password) =>
  authRequest('/api/auth/register', { email, password });

// --- Sesión unificada (JWT propio o Supabase/Google) ---

// Devuelve el token a usar contra la API: primero el JWT propio, luego Supabase.
export async function getAuthToken() {
  const local = getLocalToken();
  if (local) return local;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function hasSession() {
  if (getLocalToken()) return true;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function logout() {
  clearLocalSession();
  await supabase.auth.signOut();
}
