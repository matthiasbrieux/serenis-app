const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limit sur les actions publiques (booking + offre) — anti-spam
const publicActionLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }),
});

// ── Proxy document (sert le fichier avec Content-Type: application/pdf) ──
router.get('/api/dossier/acheteur/:token/document/:docId', async (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE acheteur_token = ?').get(req.params.token);
  if (!prop) return res.status(404).json({ error: 'Dossier introuvable' });

  const doc = db.prepare('SELECT * FROM property_documents WHERE id = ? AND property_id = ?').get(req.params.docId, prop.id);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });

  const f = doc.folder || '';
  const allowed =
    (f === 'diagnostics' && prop.diagnostics_in_dossier !== 0) ||
    (f === 'acheteur_serieux' && prop.acheteur_docs_visible === 1) ||
    ((f === '' || f === null) && prop.plan_docs_visible !== 0);
  if (!allowed) return res.status(403).json({ error: 'Document non accessible' });

  try {
    const response = await fetch(doc.url);
    if (!response.ok) return res.status(502).json({ error: 'Impossible de récupérer le document' });

    const ext = (doc.name || '').split('.').pop().toLowerCase();
    const isPdf = ext === 'pdf' || doc.url.includes('/raw/upload/');
    let safeName = (doc.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    if (isPdf && !safeName.toLowerCase().endsWith('.pdf')) safeName += '.pdf';

    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error('Document proxy error:', e.message);
    res.status(502).json({ error: 'Erreur proxy document' });
  }
});

// ── Données dossier acheteur (token public) ───────────────────
router.get('/api/dossier/acheteur/:token', (req, res) => {
  const prop = db.prepare(`
    SELECT p.*, s.first_name, s.last_name, s.phone as seller_phone, s.email as seller_email
    FROM properties p
    JOIN sellers s ON s.id = p.seller_id
    WHERE p.acheteur_token = ?
  `).get(req.params.token);
  if (!prop) return res.status(404).json({ error: 'Dossier introuvable' });

  const allPhotos = db.prepare('SELECT url, thumbnail_url, order_index, category FROM property_photos WHERE property_id = ? ORDER BY order_index').all(prop.id);
  const photos = allPhotos.filter(photo => {
    const flag = (photo.category || 'pro') + '_photos_public';
    return prop[flag] !== 0;
  });

  const allDocs = db.prepare(`
    SELECT id, name, url, doc_type, folder, created_at
    FROM property_documents
    WHERE property_id = ?
    ORDER BY folder, created_at
  `).all(prop.id);

  // Enforce seller permission flags — never expose notaire/entretien folders
  const docs = allDocs.filter(doc => {
    const f = doc.folder || '';
    if (f === 'acheteur_serieux') return prop.acheteur_docs_visible === 1;
    if (f === 'diagnostics') return prop.diagnostics_in_dossier !== 0;
    if (f === '' || f === null) return prop.plan_docs_visible !== 0;
    return false; // notaire, entretien → never shown to acheteur
  });

  // Ne jamais exposer le token notaire ni la session Stripe au dossier public
  const { notaire_token, stripe_session_id, stripe_customer_id, password, ...safeProperty } = prop;
  res.json({ property: safeProperty, photos, documents: docs });
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

  let offers = [];
  try { offers = db.prepare('SELECT amount, buyer_name, buyer_email, status, created_at FROM offers WHERE property_id = ? ORDER BY created_at DESC LIMIT 5').all(prop.id); } catch(e) {}

  const { acheteur_token, notaire_token: _nt, stripe_session_id, stripe_customer_id, password, ...safeNotaireProperty } = prop;
  res.json({ property: safeNotaireProperty, photos, documents: docs, offers });
});

// ── Créneaux disponibles (par token acheteur) ────────────────
router.get('/api/dossier/acheteur/:token/creneaux', (req, res) => {
  const prop = db.prepare('SELECT id, seller_id FROM properties WHERE acheteur_token = ?').get(req.params.token);
  if (!prop) return res.status(404).json({ error: 'Dossier introuvable' });

  const slots = db.prepare('SELECT * FROM agenda_slots WHERE seller_id = ? AND active = 1').all(prop.seller_id);
  const booked = db.prepare("SELECT visit_date, visit_time FROM visits WHERE property_id = ? AND status != 'cancelled'").all(prop.id);

  res.json({ slots, booked });
});

// ── Réservation visite (par token acheteur) ───────────────────
router.post('/api/dossier/acheteur/:token/reserver', publicActionLimit, async (req, res) => {
  try {
    const prop = db.prepare(`
      SELECT p.*, s.email as seller_email, s.first_name as seller_first_name, s.phone as seller_phone
      FROM properties p JOIN sellers s ON s.id = p.seller_id
      WHERE p.acheteur_token = ?
    `).get(req.params.token);
    if (!prop) return res.status(404).json({ error: 'Dossier introuvable' });

    const { buyer_name, buyer_email, buyer_phone, visit_date, visit_time, buyer_budget, buyer_financing, buyer_timeline } = req.body;
    if (!buyer_name || !buyer_email || !visit_date || !visit_time) {
      return res.status(400).json({ error: 'Informations manquantes' });
    }
    if (!buyer_budget || !buyer_financing || !buyer_timeline) {
      return res.status(400).json({ error: 'Merci de renseigner votre budget, financement et délai d\'achat.' });
    }

    // Transaction atomique pour éviter le double booking (P2-1)
    const bookVisit = db.transaction(() => {
      const conflict = db.prepare("SELECT id FROM visits WHERE property_id=? AND visit_date=? AND visit_time=? AND status != 'cancelled'").get(prop.id, visit_date, visit_time);
      if (conflict) return { error: 'Ce créneau est déjà pris. Choisissez un autre horaire.', status: 409 };
      const emailConflict = db.prepare("SELECT id FROM visits WHERE property_id=? AND buyer_email=? AND status != 'cancelled'").get(prop.id, buyer_email.trim().toLowerCase());
      if (emailConflict) return { error: 'Une visite est déjà enregistrée pour cette adresse email.', status: 409 };
      db.prepare("INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time, status, buyer_budget, buyer_financing, buyer_timeline) VALUES (?,?,?,?,?,?,?,'confirmed',?,?,?)")
        .run(prop.id, prop.seller_id, buyer_name, buyer_email.trim().toLowerCase(), buyer_phone || '', visit_date, visit_time, buyer_budget || null, buyer_financing || null, buyer_timeline || null);
      db.prepare("INSERT INTO notifications (seller_id, type, title, body) VALUES (?,?,?,?)")
        .run(prop.seller_id, 'visit_confirmed', 'Nouvelle visite confirmée', `${buyer_name} (${buyer_phone || buyer_email}) — ${visit_date} à ${visit_time}`);
      return { success: true };
    });
    const bookResult = bookVisit();
    if (bookResult.error) return res.status(bookResult.status).json({ error: bookResult.error });

    try {
      const { sendVisitConfirmation, sendNewVisitRequest } = require('../services/email');
      await sendVisitConfirmation(buyer_email, buyer_name, prop, visit_date, visit_time, false);
      await sendNewVisitRequest({ sellerEmail: prop.seller_email, buyerName: buyer_name, visitDate: `${visit_date} à ${visit_time}`, notes: buyer_phone ? `📞 ${buyer_phone}` : buyer_email });
      if (prop.seller_phone) {
        const { sendSmsNotification } = require('../services/twilio');
        await sendSmsNotification(prop.seller_phone,
          `📅 Visite confirmée !\n${visit_date} à ${visit_time}\nAcquéreur : ${buyer_name}\n📞 ${buyer_phone || 'non renseigné'}\n✉️ ${buyer_email}`
        ).catch(() => {});
      }
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

    const base = process.env.BASE_URL || 'https://venduparmoi.fr';
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

// ── Soumettre une offre d'achat (public, via lien vendeur) ────
router.get('/soumettre-offre/:token', (req, res) => {
  res.sendFile('soumettre-offre.html', { root: './views/public' });
});

// Info minimale du bien (pour pré-remplir la page offre)
router.get('/api/soumettre-offre/:token/info', (req, res) => {
  const prop = db.prepare(`
    SELECT p.id, p.address, p.city, p.postal_code, p.price, p.type, p.surface_habitable
    FROM properties p
    WHERE p.acheteur_token = ?
  `).get(req.params.token);
  if (!prop) return res.status(404).json({ error: 'Bien introuvable' });
  res.json({ property: prop });
});

// Soumission de l'offre par l'acheteur (sans authentification)
router.post('/api/soumettre-offre/:token', publicActionLimit, express.json(), async (req, res) => {
  try {
    const prop = db.prepare(`
      SELECT p.id, p.seller_id, p.address, p.city, p.price, s.phone as seller_phone, s.email as seller_email, s.first_name as seller_first_name
      FROM properties p
      JOIN sellers s ON s.id = p.seller_id
      WHERE p.acheteur_token = ?
    `).get(req.params.token);
    if (!prop) return res.status(404).json({ error: 'Bien introuvable' });

    const { firstName, lastName, email, phone, amount, validity_days, conditions, message } = req.body;
    if (!firstName || !lastName || !email || !amount) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    const amountInt = parseInt(amount, 10);
    if (!amountInt || amountInt < 1) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const buyer_name = `${firstName.trim()} ${lastName.trim()}`;
    const fullNote = [
      conditions ? `Conditions : ${conditions}` : '',
      message ? `Message : ${message}` : ''
    ].filter(Boolean).join('\n');

    const result = db.prepare(`
      INSERT INTO offers (uuid, property_id, seller_id, buyer_name, buyer_email, buyer_phone, amount, conditions, validity_days, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(uuidv4(), prop.id, prop.seller_id, buyer_name, email.trim(), phone?.trim() || null,
           amountInt, fullNote || null, validity_days || 10);

    // Notification interne au vendeur
    try {
      db.prepare(`
        INSERT INTO notifications (seller_id, type, title, body)
        VALUES (?, 'offer', ?, ?)
      `).run(prop.seller_id,
             `Nouvelle offre de ${buyer_name}`,
             `${Number(amountInt).toLocaleString('fr-FR')} € pour ${prop.city || prop.address || 'votre bien'}`);
    } catch(e) {}

    // SMS au vendeur
    if (prop.seller_phone) {
      try {
        const { sendSmsNotification } = require('../services/twilio');
        await sendSmsNotification(prop.seller_phone,
          `💰 Nouvelle offre reçue !\n${buyer_name} propose ${Number(amountInt).toLocaleString('fr-FR')} €\n✉️ ${email.trim()}\n👉 Voir dans votre espace : /mes-offres`
        ).catch(() => {});
      } catch(e) {}
    }

    // Email au vendeur
    if (prop.seller_email) {
      try {
        const { sendNewOfferEmail } = require('../services/email');
        await sendNewOfferEmail({
          sellerEmail: prop.seller_email,
          sellerFirstName: prop.seller_first_name,
          buyerName: buyer_name,
          amount: amountInt,
          city: prop.city || prop.address,
          offersUrl: `${process.env.BASE_URL || ''}/mes-offres`
        }).catch(() => {});
      } catch(e) {}
    }

    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) {
    console.error('Offre soumission error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Lien de soumission d'offre pour le vendeur (retourne l'URL avec acheteur_token)
router.get('/api/offre-link', requireAuth, (req, res) => {
  const prop = db.prepare('SELECT acheteur_token, city, address FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!prop || !prop.acheteur_token) return res.json({ url: null });
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${base}/soumettre-offre/${prop.acheteur_token}` });
});

module.exports = router;
