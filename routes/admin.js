const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/email');

router.get('/', requireAdmin, (req, res) => {
  res.sendFile('dashboard.html', { root: './views/admin' });
});

router.get('/numbers', requireAdmin, (req, res) => {
  res.sendFile('numbers.html', { root: './views/admin' });
});

router.get('/crm', requireAdmin, (req, res) => {
  res.sendFile('crm.html', { root: './views/admin' });
});

router.get('/create-seller', async (req, res) => {
  const { email, password } = req.query;
  if (!email || !password) return res.status(400).send('Paramètres manquants');
  const hashed = await bcrypt.hash(password, 12);
  const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    db.prepare('UPDATE sellers SET password=? WHERE email=?').run(hashed, email.toLowerCase());
    return res.send(`✓ Mot de passe mis à jour pour ${email}`);
  }
  const uuid = uuidv4();
  db.prepare('INSERT INTO sellers (uuid, email, password, pack, paid_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)')
    .run(uuid, email.toLowerCase(), hashed, 'serenite');
  res.send(`✓ Compte créé — email: ${email}`);
});

// ── Stats dashboard ─────────────────────────────────────────
router.get('/api/stats', requireAdmin, (req, res) => {
  const sellers = db.prepare('SELECT COUNT(*) as count FROM sellers').get();
  const revenue_autonome = db.prepare("SELECT COUNT(*) as count FROM sellers WHERE pack='autonome' AND paid_at IS NOT NULL").get();
  const revenue_serenite = db.prepare("SELECT COUNT(*) as count FROM sellers WHERE pack='serenite' AND paid_at IS NOT NULL").get();
  const properties_active = db.prepare('SELECT COUNT(*) as count FROM properties WHERE published=1').get();
  const contacts = db.prepare('SELECT COUNT(*) as count FROM buyer_contacts').get();
  const visits = db.prepare('SELECT COUNT(*) as count FROM visits').get();

  let numbersStats = { total: 0, available: 0, assigned: 0, inactive: 0 };
  try {
    numbersStats = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status='assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) as inactive
      FROM phone_numbers
    `).get();
  } catch(e) {}

  res.json({
    sellers: sellers.count,
    revenue: {
      total: revenue_autonome.count * 99 + revenue_serenite.count * 999,
      autonome: { count: revenue_autonome.count, amount: revenue_autonome.count * 99 },
      serenite: { count: revenue_serenite.count, amount: revenue_serenite.count * 999 }
    },
    properties_active: properties_active.count,
    contacts: contacts.count,
    visits: visits.count,
    numbers: numbersStats,
  });
});

// ── Clients ────────────────────────────────────────────────
router.get('/api/clients', requireAdmin, (req, res) => {
  const clients = db.prepare(`
    SELECT s.id, s.uuid, s.email, s.first_name, s.last_name, s.phone, s.pack,
           s.paid_at, s.created_at, s.twilio_number,
           p.slug, p.status, p.published, p.city, p.price
    FROM sellers s
    LEFT JOIN properties p ON p.seller_id = s.id
    ORDER BY s.created_at DESC
  `).all();
  res.json({ clients });
});

router.post('/api/clients', requireAdmin, express.json(), async (req, res) => {
  const { email, pack, first_name, last_name, phone } = req.body;
  if (!email || !pack) return res.json({ error: 'Email et pack requis' });
  const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.json({ error: 'Email déjà utilisé' });
  const tempPassword = Math.random().toString(36).slice(2, 10);
  const hashed = await bcrypt.hash(tempPassword, 12);
  const uuid = uuidv4();
  db.prepare('INSERT INTO sellers (uuid, email, password, pack, first_name, last_name, phone, paid_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)')
    .run(uuid, email.toLowerCase(), hashed, pack, first_name || '', last_name || '', phone || '');
  try { await sendWelcomeEmail(email, tempPassword, pack); } catch(e) {}
  res.json({ success: true, temp_password: tempPassword });
});

router.post('/api/clients/:id/reset-password', requireAdmin, express.json(), async (req, res) => {
  const newPassword = Math.random().toString(36).slice(2, 10);
  const hashed = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE sellers SET password=? WHERE id=?').run(hashed, req.params.id);
  res.json({ success: true, new_password: newPassword });
});

router.delete('/api/clients/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM sellers WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

router.get('/api/contacts', requireAdmin, (req, res) => {
  const contacts = db.prepare(`
    SELECT c.*, p.city, p.slug, s.email as seller_email
    FROM contact_requests c
    ORDER BY c.created_at DESC LIMIT 100
  `).all();
  res.json({ contacts });
});

// ── GESTION DES NUMÉROS IA ────────────────────────────────
router.get('/api/numbers', requireAdmin, (req, res) => {
  const numbers = db.prepare(`
    SELECT n.*,
           s.first_name, s.last_name, s.email as seller_email, s.pack
    FROM phone_numbers n
    LEFT JOIN sellers s ON s.id = n.seller_id
    ORDER BY n.added_at DESC
  `).all();
  res.json({ numbers });
});

router.post('/api/numbers', requireAdmin, express.json(), (req, res) => {
  const { number, provider, notes } = req.body;
  if (!number) return res.json({ error: 'Numéro requis' });
  const clean = number.trim();
  const existing = db.prepare('SELECT id FROM phone_numbers WHERE number=?').get(clean);
  if (existing) return res.json({ error: 'Numéro déjà dans le pool' });
  db.prepare('INSERT INTO phone_numbers (number, provider, notes) VALUES (?,?,?)')
    .run(clean, provider || 'Twilio', notes || '');
  res.json({ success: true });
});

// Import en masse (liste séparée par retours à la ligne ou virgules)
router.post('/api/numbers/import', requireAdmin, express.json(), (req, res) => {
  const { numbers_raw, provider } = req.body;
  if (!numbers_raw) return res.json({ error: 'Aucun numéro fourni' });
  const list = numbers_raw.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean);
  let added = 0, skipped = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO phone_numbers (number, provider) VALUES (?,?)');
  for (const num of list) {
    const result = stmt.run(num, provider || 'Twilio');
    if (result.changes > 0) added++; else skipped++;
  }
  res.json({ success: true, added, skipped });
});

// Modifier statut (available / inactive)
router.put('/api/numbers/:id/status', requireAdmin, express.json(), (req, res) => {
  const { status } = req.body;
  if (!['available', 'inactive'].includes(status)) return res.json({ error: 'Statut invalide' });
  db.prepare('UPDATE phone_numbers SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

// Réattribuer un numéro à un autre vendeur
router.put('/api/numbers/:id/assign', requireAdmin, express.json(), (req, res) => {
  const { seller_id } = req.body;
  const num = db.prepare('SELECT * FROM phone_numbers WHERE id=?').get(req.params.id);
  if (!num) return res.json({ error: 'Numéro introuvable' });

  // Libère l'ancien vendeur si besoin
  if (num.seller_id) {
    db.prepare("UPDATE sellers SET twilio_number=NULL WHERE id=? AND twilio_number=?")
      .run(num.seller_id, num.number);
  }

  if (!seller_id) {
    // Libère le numéro (retour au pool)
    db.prepare("UPDATE phone_numbers SET status='available', seller_id=NULL, assigned_at=NULL WHERE id=?")
      .run(req.params.id);
    return res.json({ success: true, action: 'released' });
  }

  const seller = db.prepare('SELECT id FROM sellers WHERE id=?').get(seller_id);
  if (!seller) return res.json({ error: 'Vendeur introuvable' });

  db.prepare("UPDATE phone_numbers SET status='assigned', seller_id=?, assigned_at=datetime('now') WHERE id=?")
    .run(seller_id, req.params.id);
  db.prepare('UPDATE sellers SET twilio_number=? WHERE id=?').run(num.number, seller_id);
  res.json({ success: true, action: 'assigned' });
});

router.delete('/api/numbers/:id', requireAdmin, (req, res) => {
  const num = db.prepare('SELECT * FROM phone_numbers WHERE id=?').get(req.params.id);
  if (!num) return res.json({ error: 'Introuvable' });
  if (num.status === 'assigned') return res.json({ error: 'Impossible de supprimer un numéro attribué' });
  db.prepare('DELETE FROM phone_numbers WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── CRM VENDEURS ──────────────────────────────────────────
router.put('/api/crm/:id/flags', requireAdmin, express.json(), (req, res) => {
  const allowed = [
    'contrat_signe', 'rdv_photographe', 'admin_notes',
    'photographer_scheduled', 'photographer_name', 'photographer_date',
    'photographer_done', 'photo_report_url', 'virtual_tour_done',
  ];
  const updates = [], params = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key}=?`);
      params.push(typeof req.body[key] === 'boolean' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (!updates.length) return res.json({ error: 'Rien à modifier' });
  params.push(req.params.id);
  db.prepare(`UPDATE sellers SET ${updates.join(',')} WHERE id=?`).run(...params);
  res.json({ success: true });
});

router.get('/api/crm', requireAdmin, (req, res) => {
  const crm = db.prepare(`
    SELECT
      s.id, s.first_name, s.last_name, s.email, s.phone, s.pack,
      s.twilio_number, s.created_at, s.paid_at,
      s.contrat_signe, s.rdv_photographe, s.admin_notes,
      s.photographer_scheduled, s.photographer_name, s.photographer_date,
      s.photographer_done, s.photo_report_url, s.virtual_tour_done,
      p.status as property_status, p.published, p.published_at, p.price, p.city,
      p.description, p.surface_habitable,
      COALESCE(photos.cnt, 0)    as photos_count,
      COALESCE(docs.cnt, 0)      as docs_count,
      COALESCE(contacts.cnt, 0)  as buyer_contacts_count,
      COALESCE(visits.cnt, 0)    as visits_count,
      COALESCE(visits_done.cnt,0) as visits_done_count,
      perf.total_views,
      perf.last_updated as last_activity
    FROM sellers s
    LEFT JOIN properties p ON p.seller_id = s.id
    LEFT JOIN (SELECT property_id, COUNT(*) as cnt FROM property_photos GROUP BY property_id) photos
      ON photos.property_id = p.id
    LEFT JOIN (SELECT property_id, COUNT(*) as cnt FROM property_documents GROUP BY property_id) docs
      ON docs.property_id = p.id
    LEFT JOIN (SELECT seller_id, COUNT(*) as cnt FROM buyer_contacts GROUP BY seller_id) contacts
      ON contacts.seller_id = s.id
    LEFT JOIN (SELECT seller_id, COUNT(*) as cnt FROM visits GROUP BY seller_id) visits
      ON visits.seller_id = s.id
    LEFT JOIN (SELECT seller_id, COUNT(*) as cnt FROM visits WHERE status='done' GROUP BY seller_id) visits_done
      ON visits_done.seller_id = s.id
    LEFT JOIN (
      SELECT seller_id, SUM(views) as total_views, MAX(updated_at) as last_updated
      FROM property_performances GROUP BY seller_id
    ) perf ON perf.seller_id = s.id
    ORDER BY s.created_at DESC
  `).all();
  res.json({ crm });
});

module.exports = router;
