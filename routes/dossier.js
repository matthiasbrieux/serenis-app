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

  const photos = db.prepare('SELECT url, thumbnail_url, order_index, category FROM property_photos WHERE property_id = ? ORDER BY order_index').all(prop.id);
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

// ── Créneaux disponibles (par token acheteur) ────────────────
router.get('/api/dossier/acheteur/:token/creneaux', (req, res) => {
  const prop = db.prepare('SELECT id, seller_id FROM properties WHERE acheteur_token = ? AND published = 1').get(req.params.token);
  if (!prop) return res.status(404).json({ error: 'Dossier introuvable' });

  const slots = db.prepare('SELECT * FROM agenda_slots WHERE seller_id = ? AND active = 1').all(prop.seller_id);
  const booked = db.prepare("SELECT visit_date, visit_time FROM visits WHERE property_id = ? AND status != 'cancelled'").all(prop.id);

  res.json({ slots, booked });
});

// ── Réservation visite (par token acheteur) ───────────────────
router.post('/api/dossier/acheteur/:token/reserver', async (req, res) => {
  try {
    const prop = db.prepare(`
      SELECT p.*, s.email as seller_email, s.first_name as seller_first_name, s.phone as seller_phone
      FROM properties p JOIN sellers s ON s.id = p.seller_id
      WHERE p.acheteur_token = ? AND p.published = 1
    `).get(req.params.token);
    if (!prop) return res.status(404).json({ error: 'Dossier introuvable' });

    const { buyer_name, buyer_email, buyer_phone, visit_date, visit_time } = req.body;
    if (!buyer_name || !buyer_email || !visit_date || !visit_time) {
      return res.status(400).json({ error: 'Informations manquantes' });
    }

    const conflict = db.prepare("SELECT id FROM visits WHERE property_id=? AND visit_date=? AND visit_time=? AND status != 'cancelled'").get(prop.id, visit_date, visit_time);
    if (conflict) return res.status(409).json({ error: 'Ce créneau est déjà pris. Choisissez un autre horaire.' });

    db.prepare('INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time) VALUES (?,?,?,?,?,?,?)')
      .run(prop.id, prop.seller_id, buyer_name, buyer_email, buyer_phone || '', visit_date, visit_time);

    db.prepare("INSERT INTO notifications (seller_id, type, title, body) VALUES (?,?,?,?)")
      .run(prop.seller_id, 'visit_request', 'Nouvelle demande de visite', `${buyer_name} souhaite visiter le ${visit_date} à ${visit_time}`);

    try {
      const { sendVisitConfirmation } = require('../services/email');
      await sendVisitConfirmation(buyer_email, buyer_name, prop, visit_date, visit_time, false);
      await sendVisitConfirmation(prop.seller_email, prop.seller_first_name || 'Vendeur', prop, visit_date, visit_time, true);
    } catch (e) {
      console.error('Visit email error:', e.message);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Booking error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
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

// ── Envoi du dossier notaire par email ───────────────────────
router.post('/api/dossier/notaire/send-email', requireAuth, async (req, res) => {
  try {
    const { notaire_email, notaire_name } = req.body;
    if (!notaire_email) return res.status(400).json({ error: 'Email du notaire requis' });

    const prop = db.prepare(`
      SELECT p.*, s.first_name, s.last_name
      FROM properties p JOIN sellers s ON s.id = p.seller_id
      WHERE p.seller_id = ?
    `).get(req.seller.id);
    if (!prop || !prop.notaire_token) return res.status(404).json({ error: 'Bien ou token introuvable' });

    const base = process.env.BASE_URL || 'https://venduparmo.fr';
    const dossierUrl = `${base}/dossier/notaire/${prop.notaire_token}`;
    const sellerName = [prop.first_name, prop.last_name].filter(Boolean).join(' ') || 'Votre client';

    const { sendDossierToNotaire } = require('../services/email');
    await sendDossierToNotaire({ notaireEmail: notaire_email, notaireName: notaire_name || '', sellerName, property: prop, dossierUrl });

    res.json({ success: true, url: dossierUrl });
  } catch(e) {
    console.error('Send notaire email error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Pages HTML publiques ──────────────────────────────────────
router.get('/dossier/acheteur/:token', (req, res) => {
  res.sendFile('dossier-acheteur.html', { root: './views/public' });
});

router.get('/dossier/notaire/:token', (req, res) => {
  res.sendFile('dossier-notaire.html', { root: './views/public' });
});

module.exports = router;
