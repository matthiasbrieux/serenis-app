const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const db = require('../database');

const publicFormLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }) });
const { sendDossierEmail, sendVisitConfirmation, sendVisitRequestReceived, sendNewVisitRequest } = require('../services/email');
const { v4: uuidv4 } = require('uuid');
const { sendSmsNotification } = require('../services/twilio');

// ── Page publique bien ──
router.get('/bien/:slug', (req, res) => {
  const property = db.prepare('SELECT id, type, city, price, surface_habitable, rooms, description FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.status(404).sendFile('404.html', { root: './public' });
  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const ipHash = require('crypto').createHash('sha256').update(ip).digest('hex').slice(0, 16);
    db.prepare('INSERT INTO property_page_views (property_id, ip_hash) VALUES (?,?)').run(property.id, ipHash);
  } catch(e) {}

  // Injection SSR des meta OG pour Google/réseaux sociaux
  try {
    const typeLabel = property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : 'Bien';
    const priceStr = property.price ? Number(property.price).toLocaleString('fr-FR') + ' €' : '';
    const surfaceStr = property.surface_habitable ? `${property.surface_habitable} m²` : '';
    const title = [typeLabel, property.city, priceStr].filter(Boolean).join(' — ');
    const desc = property.description
      ? property.description.slice(0, 160)
      : `${typeLabel}${surfaceStr ? ' de ' + surfaceStr : ''}${property.city ? ' à ' + property.city : ''} — Dossier complet sur Serenis`;
    const firstPhoto = db.prepare('SELECT url FROM property_photos WHERE property_id = ? ORDER BY order_index LIMIT 1').get(property.id);

    let html = fs.readFileSync(path.join(__dirname, '../views/property/property-public.html'), 'utf8');
    html = html
      .replace('content="Bien à vendre — Serenis"', `content="${title.replace(/"/g, '&quot;')}"`)
      .replace('content="Voir le dossier complet de ce bien"', `content="${desc.replace(/"/g, '&quot;')}"`)
      .replace('content="Dossier complet disponible — Serenis"', `content="${desc.replace(/"/g, '&quot;')}"`)
      .replace('content="OG_IMAGE_PLACEHOLDER"', `content="${firstPhoto?.url || ''}"`);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch(e) {
    res.sendFile('property-public.html', { root: './views/property' });
  }
});

// ── Export PDF dossier ──
router.get('/api/bien/:slug/pdf', async (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.status(404).end();
  const photos = db.prepare('SELECT url FROM property_photos WHERE property_id = ? ORDER BY order_index LIMIT 4').all(property.id);
  const seller = db.prepare('SELECT twilio_number FROM sellers WHERE id = ?').get(property.seller_id);
  const price = property.price ? Number(property.price).toLocaleString('fr-FR') + ' €' : 'Prix sur demande';
  const chips = [
    property.surface_habitable ? `📐 ${property.surface_habitable} m²` : null,
    property.rooms ? `🚪 ${property.rooms} pièces` : null,
    property.bedrooms ? `🛏 ${property.bedrooms} chambres` : null,
    property.year_built ? `📅 ${property.year_built}` : null,
    property.dpe_class ? `⚡ DPE ${property.dpe_class}` : null,
    property.surface_terrain ? `🌿 ${property.surface_terrain} m² terrain` : null,
    property.garden ? `🌻 Jardin` : null,
    property.terrace ? `☀️ Terrasse` : null,
  ].filter(Boolean).map(c => `<span class="chip">${c}</span>`).join('');
  const photoHtml = photos.map(ph => `<img src="${ph.url}" style="width:48%;height:150px;object-fit:cover;border-radius:6px;display:inline-block;margin:2px 1%;">`).join('');
  const rows = [
    property.address ? ['Adresse', `${property.address}, ${property.city} ${property.postal_code}`] : null,
    property.taxe_fonciere ? ['Taxe foncière', Number(property.taxe_fonciere).toLocaleString('fr-FR') + ' €/an'] : null,
    property.heating_type ? ['Chauffage', property.heating_type + (property.heating_mechanism ? ' — ' + property.heating_mechanism : '')] : null,
    property.dpe_class ? ['DPE', `Classe ${property.dpe_class}` + (property.dpe_conso_energie ? ` — ${property.dpe_conso_energie} kWh/m²/an` : '')] : null,
    property.fenetres_type ? ['Fenêtres', property.fenetres_type] : null,
    property.sols_dalle ? ['Sols', property.sols_dalle] : null,
    property.exposition ? ['Exposition', property.exposition] : null,
    property.assainissement_type ? ['Assainissement', property.assainissement_type] : null,
  ].filter(Boolean).map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1C1C1A}
    .hd{background:#1C1C1A;padding:20px 28px}.hd h1{font-family:Georgia,serif;font-size:20px;color:#C4603A}.hd p{font-size:11px;color:#9a9a8e;margin-top:3px}
    .pb{background:#C4603A;color:#fff;padding:14px 28px;font-size:24px;font-weight:bold}.pb small{display:block;font-size:12px;opacity:.85;margin-top:2px}
    .body{padding:20px 28px}.chips{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
    .chip{background:#f5f0e8;padding:5px 12px;border-radius:16px;font-size:12px}
    .sec{font-family:Georgia,serif;font-size:15px;color:#3D5A47;margin:16px 0 8px;border-bottom:1px solid #e8e0d6;padding-bottom:4px}
    .desc{font-size:13px;color:#444;line-height:1.7}
    table{width:100%;border-collapse:collapse;font-size:13px}tr{border-bottom:1px solid #f5f0e8}td{padding:6px 6px}td:first-child{color:#888;width:40%}
    .contact{background:#D4E4D8;padding:14px;border-radius:8px;text-align:center;margin:16px 0}
    .ft{background:#1C1C1A;color:#666;font-size:10px;padding:14px 28px;line-height:1.6;margin-top:24px}
  </style></head><body>
  <div class="hd"><h1>Serenis</h1><p>Dossier généré le ${new Date().toLocaleDateString('fr-FR')}</p></div>
  <div class="pb">${price}<small>${property.type || ''} — ${property.city || ''} (${property.postal_code || ''})</small></div>
  <div class="body">
    <div class="chips">${chips}</div>
    ${property.description ? `<div class="sec">Description</div><div class="desc">${(property.description || '').replace(/\n/g, '<br>')}</div>` : ''}
    ${photoHtml ? `<div class="sec">Photos</div><div style="margin:8px 0">${photoHtml}</div>` : ''}
    ${rows ? `<div class="sec">Caractéristiques</div><table>${rows}</table>` : ''}
    ${seller?.twilio_number ? `<div class="contact"><p style="font-weight:bold;color:#2a4030;margin-bottom:4px;">📞 Recevoir ce dossier par email</p><p style="font-size:17px;font-weight:bold;color:#2a4030;">${seller.twilio_number}</p><p style="font-size:11px;color:#555;">Envoyez votre adresse email par SMS — réponse automatique</p></div>` : ''}
  </div>
  <div class="ft">Annonce publiée par un particulier. Serenis fournit des outils numériques. Le vendeur reste seul responsable de sa vente.<br>Serenis · Matthias Brieux · 06 95 44 36 54 · contact@serenis.fr · Douai (59)</div>
  </body></html>`;

  try {
    const HtmlPdf = require('html-pdf-node');
    const buffer = await HtmlPdf.generatePdf({ content: html }, { format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dossier-${property.slug}.pdf"`);
    res.send(buffer);
  } catch(e) {
    console.error('PDF generation error:', e.message);
    res.status(500).json({ error: 'Erreur génération PDF' });
  }
});

// ── API bien public ──
router.get('/api/bien/:slug', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!property) return res.status(404).json({ error: 'Bien non trouvé' });
  const photos = db.prepare('SELECT url, thumbnail_url, order_index FROM property_photos WHERE property_id = ? ORDER BY order_index').all(property.id);
  const documents = db.prepare("SELECT name, url, doc_type FROM property_documents WHERE property_id = ? AND (folder='diagnostics' OR folder IS NULL OR folder='')").all(property.id);
  const seller = db.prepare('SELECT twilio_number FROM sellers WHERE id = ?').get(property.seller_id);
  res.json({ property: { ...property, photos, documents }, contact_number: seller?.twilio_number || null });
});

// ── Réservation visite ──
router.post('/api/bien/:slug/reserver', publicFormLimit, async (req, res) => {
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
    INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time, status)
    VALUES (?,?,?,?,?,?,?,'pending')
  `).run(property.id, property.seller_id, buyer_name, buyer_email, buyer_phone || '', visit_date, visit_time);

  const seller = db.prepare('SELECT email, phone, first_name FROM sellers WHERE id = ?').get(property.seller_id);

  db.prepare("INSERT INTO notifications (seller_id, type, title, body) VALUES (?,'visit_request',?,?)")
    .run(property.seller_id, 'Nouvelle demande de visite', `${buyer_name} — ${visit_date} à ${visit_time}`);

  try {
    await sendVisitRequestReceived(buyer_email, buyer_name, property, visit_date, visit_time);
    if (seller.email) await sendNewVisitRequest({ sellerEmail: seller.email, buyerName: buyer_name, visitDate: `${visit_date} à ${visit_time}`, notes: '' });
    if (seller.phone) {
      await sendSmsNotification(seller.phone,
        `Nouvelle demande de visite sur votre bien.\nDate : ${visit_date} à ${visit_time}\nAcquéreur : ${buyer_name} — ${buyer_email}\nConnectez-vous pour confirmer.`
      );
    }
  } catch (e) {
    console.error('Visit request email error:', e.message);
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

  const seller = db.prepare(`
    SELECT s.*, p.id as property_id, p.slug, p.acheteur_token, p.address, p.city
    FROM sellers s
    JOIN properties p ON p.seller_id = s.id
    WHERE s.twilio_number = ? AND p.published = 1
  `).get(To);

  if (!seller) {
    return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }

  const base = process.env.BASE_URL || 'https://venduparmo.fr';
  const dossierUrl = `${base}/dossier/acheteur/${seller.acheteur_token}`;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = Body?.match(emailRegex);

  if (emailMatch) {
    // L'acheteur a répondu avec son email → on sauvegarde et on envoie le dossier par mail
    const buyerEmail = emailMatch[0].toLowerCase();
    const existing = db.prepare('SELECT id FROM buyer_contacts WHERE property_id=? AND buyer_phone=?').get(seller.property_id, From);
    if (existing) {
      db.prepare('UPDATE buyer_contacts SET buyer_email=?, dossier_sent=1, dossier_sent_at=CURRENT_TIMESTAMP WHERE id=?').run(buyerEmail, existing.id);
    } else {
      db.prepare(`INSERT INTO buyer_contacts (property_id, seller_id, buyer_phone, buyer_email, dossier_sent, dossier_sent_at, source) VALUES (?,?,?,?,1,CURRENT_TIMESTAMP,'sms')`).run(seller.property_id, seller.id, From, buyerEmail);
    }
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(seller.property_id);
    const photos = db.prepare('SELECT url FROM property_photos WHERE property_id = ? ORDER BY order_index LIMIT 5').all(seller.property_id);
    try {
      await sendDossierEmail(buyerEmail, property, photos);
      if (seller.phone) await sendSmsNotification(seller.phone, `Nouveau contact sur votre bien.\nDossier envoyé à ${buyerEmail} (${From}).`);
    } catch (e) { console.error('Dossier email error:', e.message); }

    return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Parfait ! Le dossier complet vient de vous être envoyé à ${buyerEmail}. Vous pouvez aussi y accéder directement ici : ${dossierUrl}</Message></Response>`);
  }

  // Premier contact → on enregistre le numéro et on envoie le lien directement
  const existing = db.prepare('SELECT id FROM buyer_contacts WHERE property_id=? AND buyer_phone=?').get(seller.property_id, From);
  if (!existing) {
    db.prepare(`INSERT INTO buyer_contacts (property_id, seller_id, buyer_phone, source) VALUES (?,?,?,'sms')`).run(seller.property_id, seller.id, From);
    if (seller.phone) {
      await sendSmsNotification(seller.phone, `Nouveau contact SMS sur votre bien.\nTéléphone : ${From}`).catch(() => {});
    }
  }

  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Bonjour ! Voici le dossier complet du bien (photos, caractéristiques, diagnostics) : ${dossierUrl}

Pour recevoir ce dossier par email et être tenu(e) informé(e), répondez avec votre adresse email.</Message></Response>`);
}

// ── Webhook Voice Twilio ──
function voiceWebhook(req, res) {
  const { From, To } = req.body;
  if (From && To) {
    try {
      const seller = db.prepare(`SELECT s.*, p.id as property_id FROM sellers s JOIN properties p ON p.seller_id = s.id WHERE s.twilio_number = ? AND p.published = 1`).get(To);
      if (seller) {
        const existing = db.prepare('SELECT id FROM buyer_contacts WHERE property_id=? AND buyer_phone=?').get(seller.property_id, From);
        if (!existing) {
          db.prepare("INSERT INTO buyer_contacts (property_id, seller_id, buyer_phone, source) VALUES (?,?,?,'voice')").run(seller.property_id, seller.id, From);
        }
        if (seller.phone) sendSmsNotification(seller.phone, `📞 Appel reçu sur votre bien de la part du ${From}.`).catch(() => {});
      }
    } catch (e) { console.error('voiceWebhook DB error:', e.message); }
  }
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
