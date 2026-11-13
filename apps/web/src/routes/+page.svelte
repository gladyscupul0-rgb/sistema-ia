<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto(localStorage.getItem('token') ? '/dashboard' : '/login');
  });
</script>

<p style="text-align:center; margin-top: 4rem; color: #94a3b8;">Cargando...</p>
