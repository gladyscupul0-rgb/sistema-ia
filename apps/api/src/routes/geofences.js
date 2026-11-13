const express = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// Lista de geocercas
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('geofences')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ geofences: data });
});

// Crear geocerca. points: [[lat,lng], ...] con al menos 3 vertices.
router.post('/', async (req, res) => {
  const { name, color, points } = req.body || {};
  if (!name || !Array.isArray(points) || points.length < 3) {
    return res.status(400).json({ error: 'Nombre y al menos 3 puntos son requeridos' });
  }

  const normalized = points
    .filter((p) => Array.isArray(p) && p.length === 2)
    .map(([lat, lng]) => [Number(lat), Number(lng)]);
  if (normalized.length < 3) {
    return res.status(400).json({ error: 'Los puntos deben ser pares validos [lat, lng]' });
  }

  const { data, error } = await supabase
    .from('geofences')
    .insert({ name, color: color || '#38bdf8', points: normalized })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ geofence: data });
});

// Eliminar geocerca
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('geofences').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
