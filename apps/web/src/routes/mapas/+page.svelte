<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiGet, apiPost, apiDelete } from '$lib/api';
  import { hasSession } from '$lib/auth';

  let error = $state('');
  let geofences = $state([]);
  let devices = $state([]);
  let newDevice = $state('');

  let mapEl;
  let map = null;
  let L = null;
  let drawnGeofences = null;   // FeatureGroup con geocercas guardadas
  let drawnDevices = null;     // FeatureGroup con marcadores
  let drawControl = null;

  const COLORS = ['#38bdf8', '#34d399', '#f87171', '#fbbf24', '#a78bfa'];

  // Ray casting: true si [lat,lng] esta dentro del poligono.
  function pointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [yi, xi] = polygon[i];
      const [yj, xj] = polygon[j];
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function deviceStatus(device) {
    if (device.last_lat === null || device.last_lat === undefined) {
      return { label: 'Sin ubicación', cls: 'muted' };
    }
    const inside = geofences.some((g) =>
      pointInPolygon(device.last_lat, device.last_lng, g.points)
    );
    return inside
      ? { label: 'Dentro de geocerca', cls: 'pos' }
      : { label: 'Fuera de geocerca', cls: 'neg' };
  }

  async function load() {
    error = '';
    try {
      const [g, d] = await Promise.all([apiGet('/api/geofences'), apiGet('/api/devices')]);
      geofences = g.geofences;
      devices = d.devices;
    } catch (e) {
      error = e.message;
    }
  }

  function popupGeofence(g) {
    return `<b>${g.name}</b><br>Geocerca (${g.points.length} puntos)`;
  }

  function popupDevice(d) {
    const status = deviceStatus(d);
    const seen = d.last_seen ? new Date(d.last_seen).toLocaleString() : 'nunca';
    return `<b>${d.name}</b><br>Estado: ${status.label}<br>Última señal: ${seen}`;
  }

  function renderGeofences() {
    if (!L || !drawnGeofences) return;
    drawnGeofences.clearLayers();
    geofences.forEach((g) => {
      const polygon = L.polygon(g.points, {
        color: g.color || '#38bdf8',
        fillOpacity: 0.15,
        weight: 2
      });
      polygon.bindPopup(popupGeofence(g));
      drawnGeofences.addLayer(polygon);
    });
  }

  function renderDevices() {
    if (!L || !drawnDevices) return;
    drawnDevices.clearLayers();
    devices.forEach((d) => {
      if (d.last_lat === null || d.last_lat === undefined) return;
      const status = deviceStatus(d);
      const color = status.cls === 'pos' ? '#34d399' : '#f87171';
      const marker = L.circleMarker([d.last_lat, d.last_lng], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2
      });
      marker.bindPopup(popupDevice(d));
      drawnDevices.addLayer(marker);
    });
  }

  async function saveGeofence(layer) {
    const latlngs = layer.getLatLngs()[0];
    const points = latlngs.map((p) => [p.lat, p.lng]);
    const name = prompt('Nombre de la geocerca:', `Geocerca ${geofences.length + 1}`);
    if (!name) {
      drawnGeofences.removeLayer(layer);
      return;
    }
    const color = COLORS[geofences.length % COLORS.length];
    try {
      const { geofence } = await apiPost('/api/geofences', { name, color, points });
      geofences = [geofence, ...geofences];
      drawnGeofences.removeLayer(layer);
      renderGeofences();
      renderDevices();
    } catch (e) {
      error = e.message;
      drawnGeofences.removeLayer(layer);
    }
  }

  async function removeGeofence(g) {
    if (!confirm(`¿Eliminar la geocerca "${g.name}"?`)) return;
    try {
      await apiDelete(`/api/geofences/${g.id}`);
      geofences = geofences.filter((x) => x.id !== g.id);
      renderGeofences();
      renderDevices();
    } catch (e) {
      error = e.message;
    }
  }

  async function addDevice(e) {
    e.preventDefault();
    error = '';
    if (!newDevice.trim()) return;
    try {
      const { device } = await apiPost('/api/devices', { name: newDevice.trim() });
      devices = [...devices, device].sort((a, b) => a.name.localeCompare(b.name));
      newDevice = '';
    } catch (e) {
      error = e.message;
    }
  }

  async function removeDevice(d) {
    if (!confirm(`¿Eliminar el dispositivo "${d.name}"?`)) return;
    try {
      await apiDelete(`/api/devices/${d.id}`);
      devices = devices.filter((x) => x.id !== d.id);
      renderDevices();
    } catch (e) {
      error = e.message;
    }
  }

  function refresh() {
    load().then(() => {
      renderGeofences();
      renderDevices();
    });
  }

  onMount(async () => {
    if (!(await hasSession())) { goto('/login'); return; }

    L = (await import('leaflet')).default;
    await import('leaflet-draw');

    map = L.map(mapEl).setView([19.4326, -99.1332], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    drawnGeofences = L.featureGroup().addTo(map);
    drawnDevices = L.featureGroup().addTo(map);

    drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, shapeOptions: { color: '#38bdf8' } },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false
      },
      edit: false
    });
    map.addControl(drawControl);
    map.on(L.Draw.Event.CREATED, (e) => {
      if (e.layerType === 'polygon') saveGeofence(e.layer);
    });

    await load();
    renderGeofences();
    renderDevices();
  });

  onDestroy(() => {
    if (map) map.remove();
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css"
  />
</svelte:head>

<div class="page">
  <header>
    <h1>Mapas y geocercas</h1>
    <div class="actions">
      <button class="ghost" onclick={refresh}>Actualizar</button>
      <a class="ghost link" href="/dashboard">Volver al panel</a>
    </div>
  </header>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="layout">
    <div class="map-wrap card">
      <div bind:this={mapEl} class="map"></div>
      <p class="hint">Usa el ícono de polígono (arriba a la izquierda) para dibujar una geocerca.</p>
    </div>

    <aside>
      <div class="card">
        <h2>Geocercas</h2>
        {#if geofences.length === 0}<p class="muted">Aún no hay geocercas. Dibuja una en el mapa.</p>{/if}
        <ul class="list">
          {#each geofences as g}
            <li>
              <span class="dot" style={`background:${g.color}`}></span>
              <span class="name">{g.name}</span>
              <span class="count">{g.points.length} pts</span>
              <button class="danger" onclick={() => removeGeofence(g)}>✕</button>
            </li>
          {/each}
        </ul>
      </div>

      <div class="card">
        <h2>Dispositivos</h2>
        <form class="inline" onsubmit={addDevice}>
          <input bind:value={newDevice} placeholder="Nombre del dispositivo" />
          <button type="submit">Agregar</button>
        </form>
        {#if devices.length === 0}<p class="muted">Sin dispositivos registrados.</p>{/if}
        <table>
          <thead><tr><th>Dispositivo</th><th>Estado</th><th>Última señal</th><th></th></tr></thead>
          <tbody>
            {#each devices as d}
              {@const status = deviceStatus(d)}
              <tr>
                <td>{d.name}</td>
                <td class={status.cls}>{status.label}</td>
                <td class="muted">{d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}</td>
                <td><button class="danger" onclick={() => removeDevice(d)}>✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="hint">
          Conecta un móvil con POST <code>/api/devices/report</code> enviando
          <code>{'{ device_key, lat, lng }'}</code>.
        </p>
      </div>
    </aside>
  </div>
</div>

<style>
  .page { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: .75rem; }
  h1 { font-size: 1.4rem; margin: 0; }
  h2 { font-size: 1rem; margin: 0 0 1rem; }
  .actions { display: flex; gap: .5rem; }
  .layout { display: grid; grid-template-columns: 1.6fr 1fr; gap: 1rem; align-items: start; }
  @media (max-width: 950px) { .layout { grid-template-columns: 1fr; } }
  .card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.25rem;
  }
  .map-wrap { padding: .75rem; }
  .map { height: 560px; border-radius: 8px; overflow: hidden; z-index: 0; }
  .hint { color: var(--muted); font-size: .78rem; margin: .6rem 0 0; }
  code { background: var(--panel-2); padding: .1rem .3rem; border-radius: 4px; font-size: .78rem; }
  aside { display: flex; flex-direction: column; gap: 1rem; }
  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .5rem; }
  .list li { display: flex; align-items: center; gap: .5rem; font-size: .9rem; }
  .dot { width: 12px; height: 12px; border-radius: 50%; flex: none; }
  .name { flex: 1; }
  .count { color: var(--muted); font-size: .78rem; }
  .inline { display: flex; gap: .5rem; margin-bottom: 1rem; }
  .inline input { flex: 1; }
  input {
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: .55rem .7rem; color: var(--text); font-size: .9rem; width: 100%;
  }
  input:focus { outline: none; border-color: var(--accent); }
  button {
    background: var(--accent); border: none; border-radius: 8px;
    padding: .55rem .9rem; font-weight: 600; cursor: pointer; color: #082f49; font-size: .85rem;
  }
  button.ghost, .ghost.link {
    background: transparent; color: var(--muted); border: 1px solid var(--border);
    text-decoration: none; display: inline-flex; align-items: center; padding: .55rem .9rem;
    border-radius: 8px; font-size: .85rem;
  }
  button.danger { background: transparent; color: var(--red); border: 1px solid var(--red); padding: .15rem .45rem; font-size: .75rem; }
  table { width: 100%; border-collapse: collapse; font-size: .85rem; }
  th { text-align: left; color: var(--muted); font-weight: 600; padding: .4rem .3rem; border-bottom: 1px solid var(--border); }
  td { padding: .45rem .3rem; border-bottom: 1px solid #26334a; }
  .muted { color: var(--muted); }
  .pos { color: var(--green); }
  .neg { color: var(--red); }
  .error { color: var(--red); background: #3b1d1d; border: 1px solid var(--red); border-radius: 8px; padding: .6rem .8rem; }
</style>
