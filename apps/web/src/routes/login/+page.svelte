<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase, supabaseConfigured } from '$lib/supabase';
  import { loginWithPassword, registerWithPassword, hasSession } from '$lib/auth';

  let mode = $state('login'); // 'login' | 'register'
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function loginWithGoogle() {
    error = '';
    loading = true;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (authError) {
      error = authError.message;
      loading = false;
    }
    // Si no hay error, el navegador redirige a Google.
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      if (mode === 'login') {
        await loginWithPassword(email, password);
      } else {
        await registerWithPassword(email, password);
      }
      goto('/dashboard');
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }

  function toggleMode() {
    mode = mode === 'login' ? 'register' : 'login';
    error = '';
  }

  onMount(async () => {
    if (await hasSession()) goto('/dashboard');
  });
</script>

<div class="login-wrap">
  <div class="card">
    <h1>Sistema de Administración</h1>
    <p class="muted">
      {mode === 'login' ? 'Inicia sesión con tu cuenta' : 'Crea una cuenta nueva'}
    </p>

    {#if error}<p class="error">{error}</p>{/if}
    {#if !supabaseConfigured}<p class="error">Google no está disponible: falta configurar Supabase en el servidor.</p>{/if}

    <form onsubmit={submit}>
      <label>Email
        <input type="email" bind:value={email} required autocomplete="email"
          placeholder="tu@correo.com" />
      </label>
      <label>Contraseña
        <input type="password" bind:value={password} required minlength="8"
          autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="Mínimo 8 caracteres" />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Un momento...' : (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
      </button>
    </form>

    <button type="button" class="link-btn" onclick={toggleMode}>
      {mode === 'login'
        ? '¿No tienes cuenta? Regístrate'
        : '¿Ya tienes cuenta? Inicia sesión'}
    </button>

    <div class="divider"><span>o</span></div>

    <button type="button" class="google" onclick={loginWithGoogle} disabled={loading}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"/>
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.14.01-3.6 2.8-.05.13C3.4 21.3 7.4 24 12 24z"/>
        <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.01-.16-3.7-2.9-.12.06C.4 8.3 0 10.1 0 12s.4 3.7 1.1 5.4l4.1-3z"/>
        <path fill="#EA4335" d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C18 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.1 6.6l4.1 3c1-2.9 3.7-5 6.8-5z"/>
      </svg>
      Continuar con Google
    </button>
  </div>
</div>

<style>
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    width: 360px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    text-align: center;
  }
  h1 { font-size: 1.3rem; margin: 0; }
  .muted { color: var(--muted); margin: 0 0 .5rem; font-size: .9rem; }
  form { display: flex; flex-direction: column; gap: .9rem; text-align: left; }
  label { display: flex; flex-direction: column; gap: .35rem; font-size: .82rem; color: var(--muted); }
  input {
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: .6rem .7rem; color: var(--text); font-size: .95rem; width: 100%;
  }
  input:focus { outline: none; border-color: var(--accent); }
  button {
    background: var(--accent); border: none; border-radius: 8px;
    padding: .7rem 1rem; font-weight: 600; cursor: pointer; color: #082f49;
    font-size: .95rem;
  }
  button:disabled { opacity: .6; cursor: default; }
  .link-btn {
    background: transparent; color: var(--accent); font-size: .88rem;
    padding: .2rem; font-weight: 500;
  }
  .divider {
    display: flex; align-items: center; gap: .75rem;
    color: var(--muted); font-size: .8rem;
  }
  .divider::before, .divider::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }
  .google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    width: 100%;
    background: #fff;
    color: #1f1f1f;
    border: 1px solid #dadce0;
    border-radius: 8px;
    padding: .7rem;
    font-weight: 600;
    font-size: .95rem;
    cursor: pointer;
  }
  .google:hover { background: #f7f8f8; }
  .google:disabled { opacity: .6; cursor: default; }
  .error { color: var(--red); font-size: .85rem; margin: 0; }
</style>
