const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');

// ── Données dossier acheteur (token public) ───────────────────
router.get('/api/dossier/acheteur/:token', (req, res) => {
  const prop = db.prepare(`
    SELECT p.*, s.first_name, s.last_name, s.phone as seller_phone, s.email as seller_email
    FROM properties p
    JOIN sellers s ON s.id = p.seller_id
    WHERE p.acheteur_token = ? AND p.published = 1
  `).get(req.params.token);
  if (!prop) return res.status(404).json({ error: 'Dossier introuvable ou annonce non publiée' });

  const photos = db.prepare('SELECT url, thumbnail_url, order_index FROM property_photos WHERE property_id = ? ORDER BY order_index').all(prop.id);
  const docs = db.prepare(`
    SELECT id, name, url, doc_type, folder, created_at
    FROM property_documents
    WHERE property_id = ? AND (folder = 'diagnostics' OR folder = 'acheteur_serieux' OR folder IS NULL)
    ORDER BY folder, created_at
  `).all(prop.id);

  res.json({ property: prop, photos, documents: docs });
});

// ── Données dossier notaire (token privé) ─────────────────────
router.get('/api/dossier/notaire/:token', (req, res) => {
  const prop = db.prepare(`
    SELECT p.*, s.first_name, s.last_name, s.phone as seller_phone, s.email as seller_email
    FROM properties p
    JOIN sellers s ON s.id = p.seller_id
    WHERE p.notaire_token = ?
  `).get(req.params.token);
  if (!prop) return res.status(404).json({ error: 'Dossier introuvable' });

  const photos = db.prepare('SELECT url, thumbnail_url, order_index FROM property_photos WHERE property_id = ? ORDER BY order_index LIMIT 10').all(prop.id);
  const docs = db.prepare(`
    SELECT id, name, url, doc_type, folder, created_at
    FROM property_documents
    WHERE property_id = ?
    ORDER BY folder, created_at
  `).all(prop.id);

  const offers = db.prepare(`
    SELECT amount, buyer_name, buyer_email, status, created_at
    FROM offers WHERE property_id = ? ORDER BY created_at DESC LIMIT 5
  `).all(prop.id).catch?.() || db.prepare(`SELECT amount, buyer_name, buyer_email, status, created_at FROM offers WHERE property_id = ? ORDER BY created_at DESC LIMIT 5`).all(prop.id);

  res.json({ property: prop, photos, documents: docs, offers });
});

// ── Régénérer les tokens (vendeur authentifié) ────────────────
router.post('/api/property/regenerate-tokens', requireAuth, (req, res) => {
  const { type } = req.body; // 'acheteur' | 'notaire' | 'both'
  const prop = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!prop) return res.status(404).json({ error: 'Bien introuvable' });

  const newToken = uuidv4();
  if (type === 'acheteur' || type === 'both') {
    db.prepare('UPDATE properties SET acheteur_token = ? WHERE id = ?').run(uuidv4(), prop.id);
  }
  if (type === 'notaire' || type === 'both') {
    db.prepare('UPDATE properties SET notaire_token = ? WHERE id = ?').run(uuidv4(), prop.id);
  }

  const updated = db.prepare('SELECT acheteur_token, notaire_token FROM properties WHERE id = ?').get(prop.id);
  res.json({ success: true, acheteur_token: updated.acheteur_token, notaire_token: updated.notaire_token });
});

// ── Pages HTML publiques ──────────────────────────────────────
router.get('/dossier/acheteur/:token', (req, res) => {
  res.sendFile('dossier-acheteur.html', { root: './views/public' });
});

router.get('/dossier/notaire/:token', (req, res) => {
  res.sendFile('dossier-notaire.html', { root: './views/public' });
});

module.exports = router;
