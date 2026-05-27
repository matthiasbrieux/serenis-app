const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'serenis-partner-secret';
const COOKIE = 'partner_token';

// ── Auth middleware ──────────────────────────────────────────────
function requirePartner(req, res, next) {
  const token = req.cookies[COOKIE];
  if (!token) return res.redirect('/partner/login');
  try {
    req.partner = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie(COOKIE);
    res.redirect('/partner/login');
  }
}

// ── Landing partenaire ───────────────────────────────────────────
router.get('/partner', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/landing.html'));
});

// ── Register ─────────────────────────────────────────────────────
router.get('/partner/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/register.html'));
});

router.post('/partner/register', async (req, res) => {
  const { email, password, first_name, last_name, phone, base_city, base_postal_code, intervention_radius } = req.body;
  if (!email || !password || !first_name || !last_name) return res.json({ error: 'Champs requis manquants' });
  const existing = db.prepare('SELECT id FROM photographers WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.json({ error: 'Email déjà utilisé' });
  const hashed = await bcrypt.hash(password, 12);
  const uuid = uuidv4();
  db.prepare(`
    INSERT INTO photographers (uuid, email, password, first_name, last_name, phone, base_city, base_postal_code, intervention_radius)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuid, email.toLowerCase(), hashed, first_name, last_name, phone || '', base_city || '', base_postal_code || '', parseInt(intervention_radius) || 50);
  res.json({ success: true });
});

// ── Login ─────────────────────────────────────────────────────────
router.get('/partner/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/login.html'));
});

router.post('/partner/login', async (req, res) => {
  const { email, password } = req.body;
  const p = db.prepare('SELECT * FROM photographers WHERE email = ?').get((email || '').toLowerCase());
  if (!p || !(await bcrypt.compare(password, p.password))) return res.json({ error: 'Identifiants incorrects' });
  const token = jwt.sign({ id: p.id, uuid: p.uuid, email: p.email, name: p.first_name }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000, sameSite: 'lax' });
  res.json({ success: true });
});

router.post('/partner/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.redirect('/partner/login');
});

// ── Dashboard ──────────────────────────────────────────────────────
router.get('/partner/dashboard', requirePartner, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/dashboard.html'));
});

// ── API: données du dashboard ─────────────────────────────────────
router.get('/api/partner/me', requirePartner, (req, res) => {
  const p = db.prepare('SELECT id,uuid,email,first_name,last_name,phone,bio,base_city,base_postal_code,intervention_radius,missions_done,rating,active,verified,created_at FROM photographers WHERE id=?').get(req.partner.id);
  const missions = db.prepare(`SELECT * FROM missions WHERE photographer_id=? ORDER BY scheduled_date DESC, scheduled_time DESC LIMIT 20`).all(req.partner.id);
  const stats = {
    total: db.prepare('SELECT COUNT(*) as c FROM missions WHERE photographer_id=?').get(req.partner.id).c,
    pending: db.prepare("SELECT COUNT(*) as c FROM missions WHERE photographer_id=? AND status='assigned'").get(req.partner.id).c,
    confirmed: db.prepare("SELECT COUNT(*) as c FROM missions WHERE photographer_id=? AND status='confirmed'").get(req.partner.id).c,
    done: db.prepare("SELECT COUNT(*) as c FROM missions WHERE photographer_id=? AND status='completed'").get(req.partner.id).c,
  };
  res.json({ photographer: p, missions, stats });
});

// ── Disponibilités ─────────────────────────────────────────────────
router.get('/partner/availability', requirePartner, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/availability.html'));
});

router.get('/api/partner/availability', requirePartner, (req, res) => {
  const { month } = req.query; // YYYY-MM
  let slots;
  if (month) {
    slots = db.prepare("SELECT * FROM photographer_availability WHERE photographer_id=? AND date LIKE ? ORDER BY date, start_time").all(req.partner.id, `${month}%`);
  } else {
    slots = db.prepare("SELECT * FROM photographer_availability WHERE photographer_id=? AND date >= date('now') ORDER BY date, start_time LIMIT 200").all(req.partner.id);
  }
  res.json({ slots });
});

router.post('/api/partner/availability', requirePartner, (req, res) => {
  const { date, start_time, end_time, is_blocked } = req.body;
  if (!date || !start_time || !end_time) return res.json({ error: 'Champs requis manquants' });
  try {
    db.prepare(`
      INSERT INTO photographer_availability (photographer_id, date, start_time, end_time, is_blocked)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(photographer_id, date, start_time) DO UPDATE SET end_time=excluded.end_time, is_blocked=excluded.is_blocked
    `).run(req.partner.id, date, start_time, end_time, is_blocked ? 1 : 0);
    res.json({ success: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

router.delete('/api/partner/availability/:id', requirePartner, (req, res) => {
  db.prepare('DELETE FROM photographer_availability WHERE id=? AND photographer_id=?').run(req.params.id, req.partner.id);
  res.json({ success: true });
});

// Ajout en masse (ex: copier une semaine)
router.post('/api/partner/availability/bulk', requirePartner, (req, res) => {
  const { slots } = req.body; // [{date, start_time, end_time}]
  if (!Array.isArray(slots)) return res.json({ error: 'Format invalide' });
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO photographer_availability (photographer_id, date, start_time, end_time, is_blocked)
    VALUES (?, ?, ?, ?, 0)
  `);
  const insert = db.transaction((rows) => { rows.forEach(s => stmt.run(req.partner.id, s.date, s.start_time, s.end_time)); });
  insert(slots.filter(s => s.date && s.start_time && s.end_time));
  res.json({ success: true, count: slots.length });
});

// ── Missions ────────────────────────────────────────────────────────
router.get('/partner/missions', requirePartner, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/missions.html'));
});

router.get('/api/partner/missions', requirePartner, (req, res) => {
  const missions = db.prepare(`SELECT * FROM missions WHERE photographer_id=? ORDER BY scheduled_date ASC, scheduled_time ASC`).all(req.partner.id);
  res.json({ missions });
});

router.get('/partner/mission/:uuid', requirePartner, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/mission-detail.html'));
});

router.get('/api/partner/mission/:uuid', requirePartner, (req, res) => {
  const m = db.prepare('SELECT * FROM missions WHERE uuid=? AND photographer_id=?').get(req.params.uuid, req.partner.id);
  if (!m) return res.status(404).json({ error: 'Mission introuvable' });
  res.json({ mission: m });
});

// Accepter / Refuser une mission
router.post('/api/partner/mission/:uuid/accept', requirePartner, (req, res) => {
  const m = db.prepare("SELECT * FROM missions WHERE uuid=? AND photographer_id=? AND status='assigned'").get(req.params.uuid, req.partner.id);
  if (!m) return res.json({ error: 'Mission introuvable ou déjà traitée' });
  db.prepare("UPDATE missions SET status='confirmed', photographer_accepted_at=CURRENT_TIMESTAMP, confirmed_at=CURRENT_TIMESTAMP WHERE id=?").run(m.id);
  // Verrouille le créneau dans le calendrier
  db.prepare("UPDATE photographer_availability SET is_blocked=1 WHERE photographer_id=? AND date=? AND start_time=?").run(req.partner.id, m.scheduled_date, m.scheduled_time);
  // TODO: email de confirmation client
  res.json({ success: true });
});

router.post('/api/partner/mission/:uuid/refuse', requirePartner, (req, res) => {
  const { reason } = req.body;
  const m = db.prepare("SELECT * FROM missions WHERE uuid=? AND photographer_id=? AND status='assigned'").get(req.params.uuid, req.partner.id);
  if (!m) return res.json({ error: 'Mission introuvable ou déjà traitée' });
  db.prepare("UPDATE missions SET status='pending', photographer_id=NULL, photographer_refused_at=CURRENT_TIMESTAMP, refuse_reason=? WHERE id=?").run(reason || '', m.id);
  res.json({ success: true });
});

// Marquer comme réalisée + uploader lien photos
router.post('/api/partner/mission/:uuid/complete', requirePartner, (req, res) => {
  const { photos_url, virtual_tour_url, notes } = req.body;
  const m = db.prepare("SELECT * FROM missions WHERE uuid=? AND photographer_id=?").get(req.params.uuid, req.partner.id);
  if (!m) return res.json({ error: 'Mission introuvable' });
  db.prepare("UPDATE missions SET status='completed', photos_url=?, virtual_tour_url=?, notes=?, completed_at=CURRENT_TIMESTAMP WHERE id=?").run(photos_url || '', virtual_tour_url || '', notes || '', m.id);
  db.prepare("UPDATE photographers SET missions_done = missions_done + 1 WHERE id=?").run(req.partner.id);
  res.json({ success: true });
});

// ── Profil photographe ─────────────────────────────────────────────
router.get('/partner/profile', requirePartner, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/partner/profile.html'));
});

router.post('/api/partner/profile', requirePartner, async (req, res) => {
  const { first_name, last_name, phone, bio, base_city, base_postal_code, intervention_radius, iban } = req.body;
  db.prepare(`
    UPDATE photographers SET first_name=?, last_name=?, phone=?, bio=?, base_city=?, base_postal_code=?, intervention_radius=?, iban=? WHERE id=?
  `).run(first_name, last_name, phone || '', bio || '', base_city || '', base_postal_code || '', parseInt(intervention_radius) || 50, iban || '', req.partner.id);
  res.json({ success: true });
});

router.post('/api/partner/change-password', requirePartner, async (req, res) => {
  const { current_password, new_password } = req.body;
  const p = db.prepare('SELECT * FROM photographers WHERE id=?').get(req.partner.id);
  if (!await bcrypt.compare(current_password, p.password)) return res.json({ error: 'Mot de passe actuel incorrect' });
  const hashed = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE photographers SET password=? WHERE id=?').run(hashed, req.partner.id);
  res.json({ success: true });
});

// ── API admin: photographes (pour le dashboard admin) ───────────────
router.get('/api/admin/photographers', (req, res) => {
  // Vérifie token admin
  const token = req.cookies['admin_token'] || req.cookies['token'];
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  try { jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Non autorisé' }); }
  const photographers = db.prepare('SELECT id,uuid,email,first_name,last_name,phone,base_city,base_postal_code,intervention_radius,missions_done,rating,active,verified,created_at FROM photographers ORDER BY created_at DESC').all();
  res.json({ photographers });
});

// API: trouver les créneaux disponibles pour une mission (postal_code + date_range)
router.get('/api/slots/available', (req, res) => {
  const { postal_code, date_from, date_to } = req.query;
  if (!postal_code) return res.json({ error: 'Code postal requis' });

  const prefix = postal_code.slice(0, 2); // département
  const from = date_from || new Date().toISOString().split('T')[0];
  const to = date_to || (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })();

  // Photographes actifs dans la zone (base_postal_code département correspondant)
  const photographers = db.prepare(`
    SELECT p.* FROM photographers p
    WHERE p.active=1 AND p.verified=1
    AND (SUBSTR(p.base_postal_code,1,2) = ? OR CAST(p.intervention_radius AS INTEGER) >= 50)
  `).all(prefix);

  // Créneaux disponibles non bloqués et non réservés
  const slots = db.prepare(`
    SELECT pa.*, p.first_name, p.last_name, p.rating
    FROM photographer_availability pa
    JOIN photographers p ON p.id = pa.photographer_id
    WHERE p.active=1 AND p.verified=1
    AND pa.is_blocked=0
    AND pa.date >= ? AND pa.date <= ?
    AND (SUBSTR(p.base_postal_code,1,2) = ? OR CAST(p.intervention_radius AS INTEGER) >= 50)
    AND NOT EXISTS (
      SELECT 1 FROM missions m
      WHERE m.photographer_id = pa.photographer_id
      AND m.scheduled_date = pa.date
      AND m.scheduled_time = pa.start_time
      AND m.status IN ('assigned','confirmed')
    )
    ORDER BY pa.date, pa.start_time
  `).all(from, to, prefix);

  res.json({ slots, photographers_count: photographers.length });
});

module.exports = router;
