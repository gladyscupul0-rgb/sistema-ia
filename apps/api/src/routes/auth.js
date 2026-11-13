const express = require('express');
const supabase = require('../supabase');
const { hashPassword, verifyPassword, signToken } = require('../auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contrasena son requeridos' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
  }

  const password_hash = await hashPassword(password);
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash })
    .select('id, email')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'El email ya esta registrado' });
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ user: data, token: signToken(data) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contrasena son requeridos' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password_hash')
    .eq('email', email)
    .single();

  if (error || !user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  res.json({ user: { id: user.id, email: user.email }, token: signToken(user) });
});

module.exports = router;
