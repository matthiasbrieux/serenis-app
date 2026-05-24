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

// Route de création rapide de compte vendeur (premier compte uniquement)
router.get('/create-seller', async (req, res) => {
  const { email, password } = req.query;
  if (!email || !password) {
    return res.status(400).send('Paramètres manquants : ?email=...&password=...');
  }
  const count = db.prepare('SELECT COUNT(*) as n FROM sellers').get();
  if (count.n > 0) return res.status(403).send('Des comptes existent déjà. Utilisez le panel admin.');
  const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.send(`Compte déjà existant pour ${email}`);
  const hashed = await bcrypt.hash(password, 12);
  const uuid = uuidv4();
  db.prepare('INSERT INTO sellers (uuid, email, password, pack, paid_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)')
    .run(uuid, email.toLowerCase(), hashed, 'serenite');
  res.send(`✓ Compte créé — email: ${email} — connectez-vous sur /login`);
});

router.get('/api/stats', requireAdmin, (req, res) => {
  const sellers = db.prepare('SELECT COUNT(*) as count FROM sellers').get();
  const revenue_autonome = db.prepare("SELECT COUNT(*) as count FROM sellers WHERE pack='autonome' AND paid_at IS NOT NULL").get();
  const revenue_serenite = db.prepare("SELECT COUNT(*) as count FROM sellers WHERE pack='serenite' AND paid_at IS NOT NULL").get();
  const properties_active = db.prepare('SELECT COUNT(*) as count FROM properties WHERE published=1').get();
  const contacts = db.prepare('SELECT COUNT(*) as count FROM buyer_contacts').get();
  const visits = db.prepare('SELECT COUNT(*) as count FROM visits').get();

  res.json({
    sellers: sellers.count,
    revenue: {
      total: revenue_autonome.count * 99 + revenue_serenite.count * 999,
      autonome: { count: revenue_autonome.count, amount: revenue_autonome.count * 99 },
      serenite: { count: revenue_serenite.count, amount: revenue_serenite.count * 999 }
    },
    properties_active: properties_active.count,
    contacts: contacts.count,
    visits: visits.count
  });
});

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

  try {
    await sendWelcomeEmail(email, tempPassword, pack);
  } catch (e) {
    console.error('Welcome email error:', e);
  }

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

module.exports = router;
