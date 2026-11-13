<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api';
  import { hasSession, logout as doLogout } from '$lib/auth';

  let tab = $state('pedidos');
  let stats = $state(null);
  let orders = $state([]);
  let clients = $state([]);
  let frequent = $state([]);
  let balance = $state(null);
  let charges = $state([]);
  let error = $state('');

  // Form nuevo pedido
  let fClientId = $state('');
  let fNewClient = $state('');
  let fDesc = $state('');
  let fAmount = $state('');
  let fDate = $state(new Date().toISOString().slice(0, 10));
  let fStatus = $state('pendiente');

  // Form nueva carga
  let cConcept = $state('');
  let cAmount = $state('');
  let cDate = $state(new Date().toISOString().slice(0, 10));

  const money = (n) => `$${Number(n || 0).toFixed(2)}`;
  const statusLabel = { pendiente: 'Pendiente', en_proceso: 'En proceso', entregado: 'Entregado', cancelado: 'Cancelado' };

  async function load() {
    error = '';
    try {
      const [s, o, c, f, b, ch] = await Promise.all([
        apiGet('/api/stats'),
        apiGet('/api/orders'),
        apiGet('/api/clients'),
        apiGet('/api/clients/frequent'),
        apiGet('/api/balance'),
        apiGet('/api/balance/charges')
      ]);
      stats = s; orders = o.orders; clients = c.clients;
      frequent = f.frecuentes; balance = b; charges = ch.charges;
    } catch (e) {
      error = e.message;
    }
  }

  async function addOrder(e) {
    e.preventDefault();
    error = '';
    try {
      let client_id = fClientId || null;
      if (!client_id && fNewClient.trim()) {
        const { client } = await apiPost('/api/clients', { name: fNewClient.trim() });
        clients = [...clients, client].sort((a, b) => a.name.localeCompare(b.name));
        client_id = client.id;
      }
      await apiPost('/api/orders', {
        client_id,
        description: fDesc,
        amount: Number(fAmount),
        status: fStatus,
        order_date: fDate
      });
      fDesc = ''; fAmount = ''; fNewClient = ''; fClientId = '';
      await load();
    } catch (e) { error = e.message; }
  }

  async function setStatus(o, status) {
    await apiPut(`/api/orders/${o.id}`, { status });
    o.status = status;
    load();
  }

  async function removeOrder(o) {
    if (!confirm(`¿Eliminar pedido "${o.description}"?`)) return;
    await apiDelete(`/api/orders/${o.id}`);
    load();
  }

  async function addCharge(e) {
    e.preventDefault();
    error = '';
    try {
      await apiPost('/api/balance/charges', { concept: cConcept, amount: Number(cAmount), charge_date: cDate });
      cConcept = ''; cAmount = '';
      load();
    } catch (e) { error = e.message; }
  }

  async function removeCharge(ch) {
    if (!confirm(`¿Eliminar carga "${ch.concept}"?`)) return;
    await apiDelete(`/api/balance/charges/${ch.id}`);
    load();
  }

  async function logout() {
    await doLogout();
    goto('/login');
  }

  onMount(async () => {
    if (!(await hasSession())) { goto('/login'); return; }
    load();
  });
</script>

<div class="page">
  <header>
    <h1>Panel de Administración</h1>
    <div class="actions">
      <a class="ghost link" href="/mapas">Mapas</a>
      <button class="ghost" onclick={logout}>Cerrar sesión</button>
    </div>
  </header>

  {#if error}<p class="error">{error}</p>{/if}

  {#if stats}
    <section class="cards">
      <div class="card stat"><span class="label">Ventas totales</span><strong>{money(stats.totalVentas)}</strong></div>
      <div class="card stat"><span class="label">Pedidos</span><strong>{stats.totalPedidos}</strong></div>
      <div class="card stat"><span class="label">Pendientes</span><strong>{stats.pedidosPendientes}</strong></div>
      <div class="card stat"><span class="label">Balance</span><strong class:neg={balance && balance.balance < 0}>{money(balance?.balance)}</strong></div>
    </section>
  {/if}

  <nav class="tabs">
    <button class:active={tab === 'pedidos'} onclick={() => tab = 'pedidos'}>Pedidos</button>
    <button class:active={tab === 'clientes'} onclick={() => tab = 'clientes'}>Clientes</button>
    <button class:active={tab === 'cargas'} onclick={() => tab = 'cargas'}>Cargas</button>
  </nav>

  {#if tab === 'pedidos'}
    <div class="grid2">
      <form class="card" onsubmit={addOrder}>
        <h2>Nuevo pedido</h2>
        <label>Cliente existente
          <select bind:value={fClientId}>
            <option value="">— Ninguno / nuevo —</option>
            {#each clients as c}<option value={c.id}>{c.name}</option>{/each}
          </select>
        </label>
        <label>O nombre de cliente nuevo
          <input bind:value={fNewClient} placeholder="Nombre del cliente" />
        </label>
        <label>Descripción
          <input bind:value={fDesc} required placeholder="Ej. 2 camisetas talla M" />
        </label>
        <div class="row">
          <label>Monto
            <input type="number" step="0.01" min="0" bind:value={fAmount} required />
          </label>
          <label>Fecha
            <input type="date" bind:value={fDate} required />
          </label>
          <label>Estado
            <select bind:value={fStatus}>
              {#each Object.entries(statusLabel) as [v, l]}<option value={v}>{l}</option>{/each}
            </select>
          </label>
        </div>
        <button type="submit">Agregar pedido</button>
      </form>

      <div class="card">
        <h2>Agenda de pedidos</h2>
        {#if orders.length === 0}<p class="muted">Sin pedidos todavía.</p>{/if}
        <table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Descripción</th><th>Monto</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {#each orders as o}
              <tr>
                <td>{o.order_date}</td>
                <td>{o.clients?.name || '—'}</td>
                <td>{o.description}</td>
                <td>{money(o.amount)}</td>
                <td>
                  <select value={o.status} onchange={(e) => setStatus(o, e.target.value)}>
                    {#each Object.entries(statusLabel) as [v, l]}<option value={v}>{l}</option>{/each}
                  </select>
                </td>
                <td><button class="danger" onclick={() => removeOrder(o)}>✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if tab === 'clientes'}
    <div class="grid2">
      <div class="card">
        <h2>Clientes frecuentes</h2>
        {#if frequent.length === 0}<p class="muted">Aún no hay pedidos registrados.</p>{/if}
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Pedidos</th><th>Total gastado</th></tr></thead>
          <tbody>
            {#each frequent as c, i}
              <tr>
                <td>{i + 1}</td>
                <td>{c.name}{c.phone ? ` · ${c.phone}` : ''}</td>
                <td>{c.totalPedidos}</td>
                <td>{money(c.totalGastado)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>Todos los clientes</h2>
        {#if clients.length === 0}<p class="muted">Sin clientes registrados.</p>{/if}
        <table>
          <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th></tr></thead>
          <tbody>
            {#each clients as c}
              <tr><td>{c.name}</td><td>{c.phone || '—'}</td><td>{c.email || '—'}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if tab === 'cargas'}
    <div class="grid2">
      <form class="card" onsubmit={addCharge}>
        <h2>Registrar carga / gasto</h2>
        <label>Concepto
          <input bind:value={cConcept} required placeholder="Ej. Compra de material" />
        </label>
        <div class="row">
          <label>Monto
            <input type="number" step="0.01" min="0" bind:value={cAmount} required />
          </label>
          <label>Fecha
            <input type="date" bind:value={cDate} required />
          </label>
        </div>
        <button type="submit">Agregar carga</button>
      </form>
      <div class="card">
        <h2>Balance de cargas</h2>
        {#if balance}
          <div class="balance">
            <div><span>Ventas</span><strong class="pos">{money(balance.ventas)}</strong></div>
            <div><span>Cargas</span><strong class="neg">-{money(balance.cargas)}</strong></div>
            <div class="total"><span>Balance</span><strong class:neg={balance.balance < 0}>{money(balance.balance)}</strong></div>
          </div>
        {/if}
        <table>
          <thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th><th></th></tr></thead>
          <tbody>
            {#each charges as ch}
              <tr>
                <td>{ch.charge_date}</td>
                <td>{ch.concept}</td>
                <td>{money(ch.amount)}</td>
                <td><button class="danger" onclick={() => removeCharge(ch)}>✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .page { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
  .actions { display: flex; gap: .5rem; align-items: center; }
  .ghost.link { text-decoration: none; display: inline-flex; align-items: center; }
  h1 { font-size: 1.4rem; margin: 0; }
  h2 { font-size: 1rem; margin: 0 0 1rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
  .stat { display: flex; flex-direction: column; gap: .3rem; }
  .label { color: var(--muted); font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
  .stat strong { font-size: 1.6rem; }
  .neg { color: var(--red); }
  .pos { color: var(--green); }
  .tabs { display: flex; gap: .5rem; margin-bottom: 1rem; }
  .tabs button {
    background: var(--panel); color: var(--muted); border: 1px solid var(--border);
    padding: .5rem 1.1rem; border-radius: 8px; cursor: pointer; font-size: .9rem;
  }
  .tabs button.active { background: var(--accent); color: #082f49; border-color: var(--accent); font-weight: 600; }
  .grid2 { display: grid; grid-template-columns: 1fr 1.4fr; gap: 1rem; align-items: start; }
  @media (max-width: 850px) { .grid2 { grid-template-columns: 1fr; } }
  .card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.25rem;
  }
  form.card { display: flex; flex-direction: column; gap: .9rem; }
  label { display: flex; flex-direction: column; gap: .35rem; font-size: .82rem; color: var(--muted); }
  .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }
  input, select {
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: .6rem .7rem; color: var(--text); font-size: .95rem; width: 100%;
  }
  input:focus, select:focus { outline: none; border-color: var(--accent); }
  button {
    background: var(--accent); border: none; border-radius: 8px;
    padding: .65rem 1rem; font-weight: 600; cursor: pointer; color: #082f49;
  }
  button.ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
  button.danger { background: transparent; color: var(--red); border: 1px solid var(--red); padding: .2rem .5rem; font-size: .8rem; }
  table { width: 100%; border-collapse: collapse; font-size: .88rem; }
  th { text-align: left; color: var(--muted); font-weight: 600; padding: .4rem .3rem; border-bottom: 1px solid var(--border); }
  td { padding: .5rem .3rem; border-bottom: 1px solid #26334a; vertical-align: middle; }
  .muted { color: var(--muted); }
  .error { color: var(--red); background: #3b1d1d; border: 1px solid var(--red); border-radius: 8px; padding: .6rem .8rem; }
  .balance { display: flex; flex-direction: column; gap: .6rem; margin-bottom: 1rem; }
  .balance div { display: flex; justify-content: space-between; font-size: .95rem; }
  .balance .total { border-top: 1px solid var(--border); padding-top: .6rem; font-size: 1.1rem; }
</style>
