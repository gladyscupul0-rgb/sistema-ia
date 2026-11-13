const express = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// Balance de cargas: ventas totales - cargos/gastos registrados
router.get('/', async (req, res) => {
  const [{ data: orders, error: e1 }, { data: charges, error: e2 }] = await Promise.all([
    supabase.from('orders').select('amount, status'),
    supabase.from('charges').select('amount')
  ]);
  if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });

  const ventas = (orders || [])
    .filter((o) => o.status !== 'cancelado')
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const cargas = (charges || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);

  res.json({
    ventas: Number(ventas.toFixed(2)),
    cargas: Number(cargas.toFixed(2)),
    balance: Number((ventas - cargas).toFixed(2))
  });
});

// Listar cargos registrados
router.get('/charges', async (req, res) => {
  const { data, error } = await supabase
    .from('charges')
    .select('*')
    .order('charge_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ charges: data });
});

// Registrar un cargo/gasto
router.post('/charges', async (req, res) => {
  const { concept, amount, charge_date } = req.body || {};
  if (!concept || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'Concepto y monto son requeridos' });
  }

  const { data, error } = await supabase
    .from('charges')
    .insert({
      concept,
      amount: Number(amount),
      charge_date: charge_date || new Date().toISOString().slice(0, 10)
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ charge: data });
});

// Eliminar cargo
router.delete('/charges/:id', async (req, res) => {
  const { error } = await supabase.from('charges').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
