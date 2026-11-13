const express = require('express');
const cors = require('cors');
const config = require('./config');

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const ordersRoutes = require('./routes/orders');
const statsRoutes = require('./routes/stats');
const balanceRoutes = require('./routes/balance');
const geofencesRoutes = require('./routes/geofences');
const devicesRoutes = require('./routes/devices');

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/geofences', geofencesRoutes);
app.use('/api/devices', devicesRoutes);

// 404 para rutas /api no encontradas
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo de errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
