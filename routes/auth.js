const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { sendPasswordResetEmail } = require('../services/email');

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

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600 * 1000
  });
  res.json({ success: true, redirect: '/dashboard' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

router.get('/admin/login', (req, res) => {
  res.sendFile('admin-login.html', { root: './public' });
});

router.post('/admin/login', express.json(), (req, res) => {
  const { email, password } = req.body;
  if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return res.json({ error: 'Configuration serveur incomplète. Contactez le support.' });
  }
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.json({ error: 'Accès refusé' });
  }
  try {
    const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 3600 * 1000
    });
    res.json({ success: true, redirect: '/admin' });
  } catch (e) {
    res.json({ error: 'Erreur serveur. Contactez le support.' });
  }
});

router.get('/creer-compte-test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).send('Not found');
  try {
    const { v4: uuidv4 } = require('uuid');
    const accounts = [
      { email: 'matthiasbrieux260598@gmail.com', password: 'VPM2026!', pack: 'serenite' },
      { email: 'associe@test.fr', password: 'Test2025', pack: 'serenite' },
    ];
    const results = [];
    for (const acc of accounts) {
      const hashed = await bcrypt.hash(acc.password, 12);
      const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(acc.email);
      if (existing) {
        db.prepare('UPDATE sellers SET password=?, paid_at=CURRENT_TIMESTAMP WHERE email=?').run(hashed, acc.email);
        results.push(`MàJ: ${acc.email} — mdp: ${acc.password}`);
      } else {
        const r = db.prepare('INSERT INTO sellers (uuid, email, password, pack, paid_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)')
          .run(uuidv4(), acc.email, hashed, acc.pack);
        db.prepare('INSERT INTO properties (uuid, seller_id, slug, acheteur_token, notaire_token, status) VALUES (?,?,?,?,?,?)')
          .run(uuidv4(), r.lastInsertRowid, `bien-${r.lastInsertRowid}`, uuidv4(), uuidv4(), 'preparation');
        results.push(`Créé: ${acc.email} — mdp: ${acc.password}`);
      }
    }
    res.send(results.join('<br>'));
  } catch(e) { res.status(500).send('Erreur: ' + e.message); }
});

router.get('/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
});

// ── Mot de passe oublié ────────────────────────────────────────
const forgotLimit = require('express-rate-limit')({ windowMs: 15 * 60 * 1000, max: 5, keyGenerator: (req) => req.ip });

router.post('/api/forgot-password', forgotLimit, express.json(), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: true }); // toujours succès (anti-enum)

  const seller = db.prepare('SELECT id FROM sellers WHERE email=?').get(email.toLowerCase().trim());
  if (seller) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000).toISOString(); // +1h
    db.prepare('INSERT INTO password_reset_tokens (seller_id, token, expires_at) VALUES (?,?,?)').run(seller.id, token, expires);
    const base = process.env.BASE_URL || 'https://venduparmoi.fr';
    await sendPasswordResetEmail(email.toLowerCase().trim(), `${base}/reset-password?token=${token}`).catch(() => {});
  }
  res.json({ success: true });
});

router.get('/reset-password', (req, res) => {
  res.sendFile('reset-password.html', { root: './public' });
});

router.post('/api/reset-password', express.json(), async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) return res.json({ error: 'Données invalides.' });

  const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token=? AND used_at IS NULL AND expires_at > datetime('now')").get(token);
  if (!row) return res.json({ error: 'Lien expiré ou invalide. Demandez un nouveau lien.' });

  const hashed = await bcrypt.hash(password, 12);
  db.prepare('UPDATE sellers SET password=? WHERE id=?').run(hashed, row.seller_id);
  db.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE id=?").run(row.id);

  res.json({ success: true });
});

module.exports = router;
