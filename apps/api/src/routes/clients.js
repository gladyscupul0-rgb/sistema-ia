const express = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// Lista de clientes
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ clients: data });
});

// Crear cliente
router.post('/', async (req, res) => {
  const { name, phone, email } = req.body || {};
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  const { data, error } = await supabase
    .from('clients')
    .insert({ name, phone: phone || null, email: email || null })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ client: data });
});

// Clientes frecuentes: ordenados por cantidad de pedidos
router.get('/frequent', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, email, orders(id, amount, status)')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });

  const frecuentes = data
    .map((c) => {
      const pedidos = c.orders || [];
      const totalGastado = pedidos
        .filter((o) => o.status !== 'cancelado')
        .reduce((sum, o) => sum + Number(o.amount || 0), 0);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalPedidos: pedidos.length,
        totalGastado: Number(totalGastado.toFixed(2))
      };
    })
    .filter((c) => c.totalPedidos > 0)
    .sort((a, b) => b.totalPedidos - a.totalPedidos || b.totalGastado - a.totalGastado);

  res.json({ frecuentes });
});

module.exports = router;
