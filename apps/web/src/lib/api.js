import { getAuthToken, clearLocalSession } from '$lib/auth';
import { supabase } from '$lib/supabase';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export async function api(path, options = {}) {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    clearLocalSession();
    await supabase.auth.signOut();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

export const apiGet = (path) => api(path);
export const apiPost = (path, data) =>
  api(path, { method: 'POST', body: JSON.stringify(data) });
export const apiPut = (path, data) =>
  api(path, { method: 'PUT', body: JSON.stringify(data) });
export const apiDelete = (path) => api(path, { method: 'DELETE' });
