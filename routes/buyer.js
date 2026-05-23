const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendDossierEmail } = require('../services/email');
const { sendSmsNotification } = require('../services/twilio');

// Public property page
router.get('/bien/:slug', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.status(404).sendFile('404.html', { root: './public' });
  res.sendFile('property-public.html', { root: './views/property' });
});

router.get('/api/bien/:slug', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.status(404).json({ error: 'Bien non trouvé' });
  const photos = db.prepare('SELECT url, thumbnail_url, order_index FROM property_photos WHERE property_id = ? ORDER BY order_index').all(property.id);
  const documents = db.prepare('SELECT name, url, doc_type FROM property_documents WHERE property_id = ?').all(property.id);
  const seller = db.prepare('SELECT twilio_number FROM sellers WHERE id = ?').get(property.seller_id);
  res.json({ property: { ...property, photos, documents }, contact_number: seller?.twilio_number || null });
});

// Book a visit
router.post('/api/bien/:slug/reserver', express.json(), async (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.json({ error: 'Bien non trouvé' });

  const { buyer_name, buyer_email, buyer_phone, visit_date, visit_time } = req.body;
  if (!buyer_name || !buyer_email || !visit_date || !visit_time) {
    return res.json({ error: 'Informations manquantes' });
  }

  const conflict = db.prepare('SELECT id FROM visits WHERE property_id=? AND visit_date=? AND visit_time=? AND status != ?')
    .get(property.id, visit_date, visit_time, 'cancelled');
  if (conflict) return res.json({ error: 'Ce créneau est déjà pris' });

  db.prepare('INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time) VALUES (?,?,?,?,?,?,?)')
    .run(property.id, property.seller_id, buyer_name, buyer_email, buyer_phone || '', visit_date, visit_time);

  const seller = db.prepare('SELECT email, phone, first_name FROM sellers WHERE id = ?').get(property.seller_id);

  try {
    const { sendVisitConfirmation } = require('../services/email');
    await sendVisitConfirmation(buyer_email, buyer_name, property, visit_date, visit_time);
    await sendVisitConfirmation(seller.email, seller.first_name || 'Vendeur', property, visit_date, visit_time, true);
    if (seller.phone) {
      await sendSmsNotification(seller.phone, `Nouvelle visite réservée pour votre bien.\nDate : ${visit_date} à ${visit_time}\nAcquéreur : ${buyer_name} — ${buyer_email}`);
    }
  } catch (e) {
    console.error('Visit confirmation email error:', e);
  }

  res.json({ success: true });
});

// Available slots for booking
router.get('/api/bien/:slug/creneaux', (req, res) => {
  const property = db.prepare('SELECT seller_id FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.json({ slots: [] });

  const slots = db.prepare('SELECT * FROM agenda_slots WHERE seller_id = ? AND active = 1').all(property.seller_id);
  const bookedVisits = db.prepare('SELECT visit_date, visit_time FROM visits WHERE property_id = (SELECT id FROM properties WHERE slug = ?) AND status != ?')
    .all(req.params.slug, 'cancelled');

  res.json({ slots, booked: bookedVisits });
});

// SMS webhook — Twilio inbound SMS with buyer email
router.post('/webhook/sms', express.urlencoded({ extended: false }), async (req, res) => {
  const { From, To, Body } = req.body;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = Body?.match(emailRegex);

  if (!emailMatch) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Bonjour ! Pour recevoir le dossier complet de ce bien, envoyez votre adresse email par SMS à ce numéro.</Message></Response>`;
    return res.type('text/xml').send(twiml);
  }

  const buyerEmail = emailMatch[0].toLowerCase();
  const seller = db.prepare('SELECT s.*, p.id as property_id, p.slug FROM sellers s JOIN properties p ON p.seller_id = s.id WHERE s.twilio_number = ? AND p.published = 1').get(To);

  if (!seller) {
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Numéro non reconnu.</Message></Response>`);
    return;
  }

  db.prepare('INSERT INTO buyer_contacts (property_id, seller_id, buyer_phone, buyer_email, dossier_sent, dossier_sent_at, source) VALUES (?,?,?,?,1,CURRENT_TIMESTAMP,?)')
    .run(seller.property_id, seller.id, From, buyerEmail, 'sms');

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(seller.property_id);
  const photos = db.prepare('SELECT url FROM property_photos WHERE property_id = ? ORDER BY order_index LIMIT 5').all(seller.property_id);

  try {
    await sendDossierEmail(buyerEmail, property, photos);
    if (seller.phone) {
      await sendSmsNotification(seller.phone, `Nouveau contact sur votre bien.\nDossier envoyé automatiquement à ${buyerEmail}.`);
    }
  } catch (e) {
    console.error('Dossier send error:', e);
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Parfait ! Le dossier complet de ce bien vient de vous être envoyé à ${buyerEmail}. Bonne visite !</Message></Response>`;
  res.type('text/xml').send(twiml);
});

// Voice webhook — Twilio inbound call
router.post('/webhook/voice', express.urlencoded({ extended: false }), (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="Polly.Celine">
    Bonjour. Pour recevoir gratuitement le dossier complet
    de ce bien — photos, caractéristiques et visite virtuelle —
    envoyez votre adresse email par S.M.S à ce numéro.
    Je répète : envoyez votre adresse email par S.M.S à ce numéro.
    Merci et bonne journée.
  </Say>
</Response>`;
  res.type('text/xml').send(twiml);
});

module.exports = router;
