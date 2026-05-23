const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendDossierEmail, sendVisitConfirmation } = require('../services/email');
const { sendSmsNotification } = require('../services/twilio');

// ── Page publique bien ──
router.get('/bien/:slug', (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.status(404).sendFile('404.html', { root: './public' });
  res.sendFile('property-public.html', { root: './views/property' });
});

// ── API bien public ──
router.get('/api/bien/:slug', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.status(404).json({ error: 'Bien non trouvé' });
  const photos = db.prepare('SELECT url, thumbnail_url, order_index FROM property_photos WHERE property_id = ? ORDER BY order_index').all(property.id);
  const documents = db.prepare('SELECT name, url, doc_type FROM property_documents WHERE property_id = ?').all(property.id);
  const seller = db.prepare('SELECT twilio_number FROM sellers WHERE id = ?').get(property.seller_id);
  res.json({ property: { ...property, photos, documents }, contact_number: seller?.twilio_number || null });
});

// ── Réservation visite ──
router.post('/api/bien/:slug/reserver', async (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.json({ error: 'Bien non trouvé' });

  const { buyer_name, buyer_email, buyer_phone, visit_date, visit_time } = req.body;
  if (!buyer_name || !buyer_email || !visit_date || !visit_time) {
    return res.json({ error: 'Informations manquantes' });
  }

  const conflict = db.prepare(`
    SELECT id FROM visits WHERE property_id=? AND visit_date=? AND visit_time=? AND status != 'cancelled'
  `).get(property.id, visit_date, visit_time);
  if (conflict) return res.json({ error: 'Ce créneau est déjà pris. Choisissez un autre horaire.' });

  db.prepare(`
    INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time)
    VALUES (?,?,?,?,?,?,?)
  `).run(property.id, property.seller_id, buyer_name, buyer_email, buyer_phone || '', visit_date, visit_time);

  const seller = db.prepare('SELECT email, phone, first_name FROM sellers WHERE id = ?').get(property.seller_id);

  try {
    await sendVisitConfirmation(buyer_email, buyer_name, property, visit_date, visit_time, false);
    await sendVisitConfirmation(seller.email, seller.first_name || 'Vendeur', property, visit_date, visit_time, true);
    if (seller.phone) {
      await sendSmsNotification(seller.phone,
        `Nouvelle visite sur votre bien.\nDate : ${visit_date} à ${visit_time}\nAcquéreur : ${buyer_name} — ${buyer_email}`
      );
    }
  } catch (e) {
    console.error('Visit confirmation error:', e.message);
  }

  res.json({ success: true });
});

// ── Créneaux disponibles ──
router.get('/api/bien/:slug/creneaux', (req, res) => {
  const property = db.prepare('SELECT id, seller_id FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.json({ slots: [], booked: [] });

  const slots = db.prepare('SELECT * FROM agenda_slots WHERE seller_id = ? AND active = 1').all(property.seller_id);
  const booked = db.prepare(`
    SELECT visit_date, visit_time FROM visits WHERE property_id = ? AND status != 'cancelled'
  `).all(property.id);

  res.json({ slots, booked });
});

// ── Webhook SMS Twilio (exporté séparément pour urlencoded brut) ──
async function smsWebhook(req, res) {
  const { From, To, Body } = req.body;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = Body?.match(emailRegex);

  if (!emailMatch) {
    return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Bonjour ! Pour recevoir le dossier complet de ce bien, envoyez votre adresse email par SMS à ce numéro.</Message></Response>`);
  }

  const buyerEmail = emailMatch[0].toLowerCase();
  const seller = db.prepare(`
    SELECT s.*, p.id as property_id, p.slug
    FROM sellers s
    JOIN properties p ON p.seller_id = s.id
    WHERE s.twilio_number = ? AND p.published = 1
  `).get(To);

  if (!seller) {
    return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }

  db.prepare(`
    INSERT INTO buyer_contacts (property_id, seller_id, buyer_phone, buyer_email, dossier_sent, dossier_sent_at, source)
    VALUES (?,?,?,?,1,CURRENT_TIMESTAMP,'sms')
  `).run(seller.property_id, seller.id, From, buyerEmail);

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(seller.property_id);
  const photos = db.prepare('SELECT url FROM property_photos WHERE property_id = ? ORDER BY order_index LIMIT 5').all(seller.property_id);

  try {
    await sendDossierEmail(buyerEmail, property, photos);
    if (seller.phone) {
      await sendSmsNotification(seller.phone,
        `Nouveau contact sur votre bien.\nDossier envoyé automatiquement à ${buyerEmail}.`
      );
    }
  } catch (e) {
    console.error('Dossier send error:', e.message);
  }

  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Parfait ! Le dossier complet vient de vous être envoyé à ${buyerEmail}. Bonne visite !</Message></Response>`);
}

// ── Webhook Voice Twilio ──
function voiceWebhook(req, res) {
  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="Polly.Celine">
    Bonjour. Pour recevoir gratuitement le dossier complet
    de ce bien, photos, caractéristiques et visite virtuelle,
    envoyez votre adresse email par S.M.S à ce numéro.
    Je répète : envoyez votre adresse email par S.M.S à ce numéro.
    Merci et bonne journée.
  </Say>
</Response>`);
}

module.exports = { router, smsWebhook, voiceWebhook };
