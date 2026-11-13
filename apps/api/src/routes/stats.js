const express = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// Resumen general: total de ventas, pedidos y clientes frecuentes
router.get('/', async (req, res) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, amount, status, order_date, client_id, clients(name)');

  if (error) return res.status(500).json({ error: error.message });

  const validas = orders.filter((o) => o.status !== 'cancelado');
  const totalVentas = validas.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  const porCliente = {};
  for (const o of validas) {
    const nombre = o.clients?.name || 'Sin cliente';
    porCliente[nombre] = (porCliente[nombre] || 0) + 1;
  }
  const clientesFrecuentes = Object.entries(porCliente)
    .map(([nombre, pedidos]) => ({ nombre, pedidos }))
    .sort((a, b) => b.pedidos - a.pedidos)
    .slice(0, 5);

  res.json({
    totalVentas: Number(totalVentas.toFixed(2)),
    totalPedidos: orders.length,
    pedidosPendientes: orders.filter((o) => o.status === 'pendiente').length,
    clientesFrecuentes
  });
});

module.exports = router;
