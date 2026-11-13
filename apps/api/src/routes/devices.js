const express = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../auth');

const router = express.Router();

// ---------- Reporte de posicion (lo llama el dispositivo movil) ----------
// No usa requireAuth: se autentica con device_key. Monitorear es para el panel.
router.post('/report', async (req, res) => {
  const { device_key, lat, lng } = req.body || {};
  if (!device_key || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'device_key, lat y lng son requeridos' });
  }

  const { data, error } = await supabase
    .from('devices')
    .update({
      last_lat: Number(lat),
      last_lng: Number(lng),
      last_seen: new Date().toISOString()
    })
    .eq('device_key', device_key)
    .select('id, name, last_lat, last_lng, last_seen');

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }
  res.json({ device: data[0] });
});

// ---------- Rutas del panel (requieren sesion) ----------
router.use(requireAuth);

// Lista de dispositivos con su ultima ubicacion
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('devices')
    .select('id, name, device_key, last_lat, last_lng, last_seen, created_at')
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ devices: data });
});

// Crear dispositivo. Devuelve device_key para configurar en el movil.
router.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  const { data, error } = await supabase
    .from('devices')
    .insert({ name })
    .select('id, name, device_key, last_lat, last_lng, last_seen, created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ device: data });
});

// Eliminar dispositivo
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('devices').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
