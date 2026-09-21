const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { sendPasswordResetEmail } = require('../services/email');
const { isPasswordPwned } = require('../services/passwordCheck');
const { issue2FACode, verify2FACode } = require('../services/twoFactor');

// Limite dédiée sur les tentatives de connexion (la limite globale de
// server.js est partagée par toutes les routes et bien trop large pour
// contenir du brute-force ciblé sur un compte).
const loginLimit = require('express-rate-limit')({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: (req) => req.ip });
// Limite séparée pour la vérification du code 2FA : le blocage par code
// (5 essais, voir services/twoFactor.js) protège déjà du brute-force sur le
// code lui-même, donc ce compteur peut être plus large — il ne doit pas
// pénaliser un utilisateur qui a déjà consommé son quota sur /login juste
// pour avoir mal tapé son mot de passe une fois avant de réussir.
const verify2faLimit = require('express-rate-limit')({ windowMs: 15 * 60 * 1000, max: 20, keyGenerator: (req) => req.ip });

// Le 2FA par email n'est demandé qu'en réaction à plusieurs mots de passe
// erronés d'affilée sur le compte (signe d'une tentative d'intrusion) — pas
// à chaque connexion normale, qui reste directe comme avant.
const FAILED_ATTEMPTS_2FA_THRESHOLD = 3;

function maskEmail(email) {
  const [user, domain] = email.split('@');
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

function issuePendingToken(accountType, accountId) {
  return jwt.sign({ pending2fa: true, accountType, accountId }, process.env.JWT_SECRET, { expiresIn: '10m' });
}

router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: './public' });
});

router.post('/login', loginLimit, express.json(), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ error: 'Champs requis' });

  const seller = db.prepare('SELECT * FROM sellers WHERE email = ?').get(email.toLowerCase().trim());
  if (!seller) return res.json({ error: 'Identifiants incorrects' });

  const valid = await bcrypt.compare(password, seller.password);
  if (!valid) {
    db.prepare('UPDATE sellers SET failed_login_attempts = failed_login_attempts + 1 WHERE id=?').run(seller.id);
    return res.json({ error: 'Identifiants incorrects' });
  }

  // Mot de passe correct mais plusieurs échecs récents sur ce compte →
  // vérification par email avant de laisser passer.
  if (seller.failed_login_attempts >= FAILED_ATTEMPTS_2FA_THRESHOLD) {
    await issue2FACode('seller', seller.id, seller.email);
    return res.json({
      requires2fa: true,
      pendingToken: issuePendingToken('seller', seller.id),
      maskedEmail: maskEmail(seller.email),
    });
  }

  db.prepare('UPDATE sellers SET failed_login_attempts = 0 WHERE id=?').run(seller.id);
  const token = jwt.sign(
    { id: seller.id, uuid: seller.uuid, email: seller.email, pack: seller.pack },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 * 1000 });
  res.json({ success: true, redirect: '/dashboard' });
});

// Deuxième étape : vérification du code reçu par email, pour un compte
// vendeur ou admin (accountType porté par le pendingToken émis à l'étape 1).
router.post('/api/login/verify-2fa', verify2faLimit, express.json(), async (req, res) => {
  const { pendingToken, code } = req.body;
  if (!pendingToken || !code) return res.json({ error: 'Données invalides.' });

  let payload;
  try { payload = jwt.verify(pendingToken, process.env.JWT_SECRET); } catch { return res.json({ error: 'Session expirée — reconnectez-vous.' }); }
  if (!payload.pending2fa) return res.json({ error: 'Session invalide.' });

  const result = verify2FACode(payload.accountType, payload.accountId, String(code).trim());
  if (!result.ok) return res.json({ error: result.error });

  if (payload.accountType === 'seller') {
    const seller = db.prepare('SELECT * FROM sellers WHERE id = ?').get(payload.accountId);
    if (!seller) return res.json({ error: 'Compte introuvable.' });
    db.prepare('UPDATE sellers SET failed_login_attempts = 0 WHERE id=?').run(seller.id);
    const token = jwt.sign(
      { id: seller.id, uuid: seller.uuid, email: seller.email, pack: seller.pack },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 * 1000 });
    return res.json({ success: true, redirect: '/dashboard' });
  }

  if (payload.accountType === 'admin') {
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(payload.accountId);
    if (!admin) return res.json({ error: 'Compte introuvable.' });
    db.prepare('UPDATE admins SET failed_login_attempts = 0 WHERE id=?').run(admin.id);
    const token = jwt.sign({ role: 'admin', email: admin.email, name: admin.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600 * 1000 });
    return res.json({ success: true, redirect: '/admin' });
  }

  res.json({ error: 'Type de compte invalide.' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

router.get('/admin/login', (req, res) => {
  res.sendFile('admin-login.html', { root: './public' });
});

router.post('/admin/login', loginLimit, express.json(), async (req, res) => {
  const { email, password } = req.body;
  if (!process.env.JWT_SECRET) return res.json({ error: 'Configuration serveur incomplète.' });

  try {
    // Vérification dans la table admins
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get((email || '').toLowerCase().trim());
    if (admin) {
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        db.prepare('UPDATE admins SET failed_login_attempts = failed_login_attempts + 1 WHERE id=?').run(admin.id);
        return res.json({ error: 'Accès refusé' });
      }

      if (admin.failed_login_attempts >= FAILED_ATTEMPTS_2FA_THRESHOLD) {
        await issue2FACode('admin', admin.id, admin.email);
        return res.json({
          requires2fa: true,
          pendingToken: issuePendingToken('admin', admin.id),
          maskedEmail: maskEmail(admin.email),
        });
      }

      db.prepare('UPDATE admins SET failed_login_attempts = 0 WHERE id=?').run(admin.id);
      const token = jwt.sign({ role: 'admin', email: admin.email, name: admin.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
      res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600 * 1000 });
      return res.json({ success: true, redirect: '/admin' });
    }
    // Fallback env vars (ancien système, pas de compte en base donc pas de
    // 2FA possible ici — ce chemin ne sert plus depuis que les admins sont
    // en base, laissé pour compatibilité)
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600 * 1000 });
        return res.json({ success: true, redirect: '/admin' });
      }
    }
    return res.json({ error: 'Accès refusé' });
  } catch (e) {
    res.json({ error: 'Erreur serveur.' });
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
  if (await isPasswordPwned(password)) {
    return res.json({ error: 'Ce mot de passe est apparu dans des fuites de données connues. Choisissez-en un autre.' });
  }

  const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token=? AND used_at IS NULL AND expires_at > datetime('now')").get(token);
  if (!row) return res.json({ error: 'Lien expiré ou invalide. Demandez un nouveau lien.' });

  const hashed = await bcrypt.hash(password, 12);
  db.prepare('UPDATE sellers SET password=? WHERE id=?').run(hashed, row.seller_id);
  db.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE id=?").run(row.id);

  res.json({ success: true });
});

module.exports = router;
