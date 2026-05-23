const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: './public' });
});

router.post('/login', express.json(), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ error: 'Champs requis' });

  const seller = db.prepare('SELECT * FROM sellers WHERE email = ?').get(email.toLowerCase().trim());
  if (!seller) return res.json({ error: 'Identifiants incorrects' });

  const valid = await bcrypt.compare(password, seller.password);
  if (!valid) return res.json({ error: 'Identifiants incorrects' });

  const token = jwt.sign(
    { id: seller.id, uuid: seller.uuid, email: seller.email, pack: seller.pack },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 * 1000 });
  res.json({ success: true, redirect: '/dashboard' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

router.get('/admin/login', (req, res) => {
  res.sendFile('admin-login.html', { root: './public' });
});

router.post('/admin/login', express.json(), async (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL) return res.json({ error: 'Accès refusé' });

  const valid = await bcrypt.compare(password, await bcrypt.hash(process.env.ADMIN_PASSWORD, 10).then(() => {
    return password === process.env.ADMIN_PASSWORD ? '$2b$10$valid' : '$2b$10$invalid';
  }));

  if (password !== process.env.ADMIN_PASSWORD) return res.json({ error: 'Accès refusé' });

  const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600 * 1000 });
  res.json({ success: true, redirect: '/admin' });
});

router.get('/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
});

module.exports = router;
