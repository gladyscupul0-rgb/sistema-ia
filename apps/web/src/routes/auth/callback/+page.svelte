<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';

  let error = $state('');

  onMount(async () => {
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        goto('/dashboard');
      } else {
        error = 'No se pudo iniciar sesión. Intenta de nuevo.';
      }
    } catch (e) {
      error = e.message || 'Error al completar el inicio de sesión.';
    }
  });
</script>

<div class="login-wrap">
  <div class="card">
    {#if error}
      <h1>Algo salió mal</h1>
      <p class="error">{error}</p>
      <a class="link" href="/login">Volver al login</a>
    {:else}
      <h1>Iniciando sesión...</h1>
      <p class="muted">Un momento por favor.</p>
    {/if}
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
    align-items: center;
    text-align: center;
  }
  h1 { font-size: 1.3rem; margin: 0; }
  .muted { color: var(--muted); margin: 0; font-size: .9rem; }
  .error { color: var(--red); font-size: .85rem; margin: 0; }
  .link { color: var(--accent); font-size: .9rem; }
</style>
