const express = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['pendiente', 'en_proceso', 'entregado', 'cancelado'];

// Agenda / lista de pedidos
router.get('/', async (req, res) => {
  const { status } = req.query;
  let query = supabase
    .from('orders')
    .select('*, clients(name, phone)')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (status && STATUSES.includes(status)) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data });
});

// Crear pedido
router.post('/', async (req, res) => {
  const { client_id, description, amount, status, order_date } = req.body || {};
  if (!description || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'Descripcion y monto son requeridos' });
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      client_id: client_id || null,
      description,
      amount: Number(amount),
      status: STATUSES.includes(status) ? status : 'pendiente',
      order_date: order_date || new Date().toISOString().slice(0, 10)
    })
    .select('*, clients(name, phone)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ order: data });
});

// Actualizar pedido (estado, monto, etc.)
router.put('/:id', async (req, res) => {
  const { description, amount, status, order_date, client_id } = req.body || {};
  const updates = {};
  if (description !== undefined) updates.description = description;
  if (amount !== undefined) updates.amount = Number(amount);
  if (status !== undefined && STATUSES.includes(status)) updates.status = status;
  if (order_date !== undefined) updates.order_date = order_date;
  if (client_id !== undefined) updates.client_id = client_id || null;

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', req.params.id)
    .select('*, clients(name, phone)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ order: data });
});

// Eliminar pedido
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('orders').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
