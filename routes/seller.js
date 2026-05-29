const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const { uploadPhoto, uploadDocument } = require('../services/upload');
const { assignTwilioNumber } = require('../services/twilio');
const { sendSoldCongrats, sendPropertySoldToBuyer } = require('../services/email');

// Pages vendeur (toutes protégées)
router.get('/dashboard', requireAuth, (req, res) => res.sendFile('dashboard.html', { root: './views/seller' }));
router.get('/mon-bien', requireAuth, (req, res) => res.sendFile('property.html', { root: './views/seller' }));
router.get('/ma-formation', requireAuth, (req, res) => res.sendFile('library.html', { root: './views/seller' }));
router.get('/mon-agenda', requireAuth, (req, res) => res.sendFile('agenda.html', { root: './views/seller' }));
router.get('/ma-bibliotheque', requireAuth, (req, res) => res.sendFile('biblio.html', { root: './views/seller' }));
router.get('/onboarding', requireAuth, (req, res) => res.sendFile('onboarding.html', { root: './views/seller' }));

// Contrat — accessible sans vérification contrat (exemption dans requireAuth)
router.get('/contrat', requireAuth, (req, res) => res.sendFile('contrat.html', { root: './views/seller' }));

// Signature électronique du contrat
router.post('/api/contrat/sign', requireAuth, express.json(), (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  db.prepare('UPDATE sellers SET contrat_signe=1, contrat_signe_at=CURRENT_TIMESTAMP, contrat_ip=? WHERE id=?').run(ip, req.seller.id);
  res.json({ success: true });
});

// API — seller data
router.get('/api/me', requireAuth, (req, res) => {
  const seller = db.prepare('SELECT id, uuid, email, first_name, last_name, phone, pack, twilio_number, paid_at, created_at, client_availability, booking_step, photographer_scheduled, photographer_name, photographer_date, photographer_done, photo_report_url FROM sellers WHERE id = ?').get(req.seller.id);
  const property = db.prepare('SELECT * FROM properties WHERE seller_id = ?').get(req.seller.id);
  const contacts = property ? db.prepare('SELECT COUNT(*) as count FROM buyer_contacts WHERE seller_id = ?').get(req.seller.id) : { count: 0 };
  const visits = property ? db.prepare('SELECT COUNT(*) as count FROM visits WHERE seller_id = ?').get(req.seller.id) : { count: 0 };
  const notifications = db.prepare('SELECT * FROM notifications WHERE seller_id = ? ORDER BY created_at DESC LIMIT 25').all(req.seller.id);

  // — Enhanced stats —
  let photo_count = 0;
  let pending_visits = 0;
  let missing_docs = [];
  let completion = { fiche: 0, photos: 0, documents: 0, published: 0 };

  if (property) {
    // Photo count
    const photoRow = db.prepare('SELECT COUNT(*) as count FROM property_photos WHERE property_id = ?').get(property.id);
    photo_count = photoRow ? photoRow.count : 0;

    // Pending visits
    const pendingRow = db.prepare("SELECT COUNT(*) as count FROM visits WHERE property_id = ? AND status = 'pending'").get(property.id);
    pending_visits = pendingRow ? pendingRow.count : 0;

    // Missing docs — check property fields
    if (!property.dpe_class) missing_docs.push('DPE');
    if (!property.taxe_fonciere || property.taxe_fonciere == 0) missing_docs.push('Taxe foncière');
    if (property.certificat_assainissement !== '1' && property.certificat_assainissement !== 1) missing_docs.push('Certificat assainissement');

    // Also check property_documents table for uploaded doc_type entries
    const uploadedDocs = db.prepare('SELECT doc_type FROM property_documents WHERE property_id = ?').all(property.id);
    const uploadedTypes = uploadedDocs.map(d => (d.doc_type || '').toLowerCase());
    const REQUIRED_DOC_TYPES = ['dpe', 'taxe_fonciere', 'certificat_assainissement'];
    REQUIRED_DOC_TYPES.forEach(req_type => {
      if (uploadedTypes.includes(req_type)) {
        const label = req_type === 'dpe' ? 'DPE' : req_type === 'taxe_fonciere' ? 'Taxe foncière' : 'Certificat assainissement';
        const idx = missing_docs.indexOf(label);
        if (idx !== -1) missing_docs.splice(idx, 1);
      }
    });

    // Completion scores
    const ficheFields = ['type', 'address', 'price', 'surface_habitable', 'description', 'dpe_class', 'year_built'];
    const filledFiche = ficheFields.filter(f => property[f] !== null && property[f] !== undefined && property[f] !== '').length;
    const ficheScore = Math.round(filledFiche / ficheFields.length * 100);

    const photosScore = Math.round(Math.min(photo_count / 10, 1) * 100);

    const REQUIRED_DOCS_COUNT = 3; // dpe, taxe_fonciere, certificat_assainissement
    const presentDocs = REQUIRED_DOCS_COUNT - missing_docs.length;
    const documentsScore = Math.round(Math.max(presentDocs, 0) / REQUIRED_DOCS_COUNT * 100);

    const publishedScore = property.published ? 100 : 0;

    completion = { fiche: ficheScore, photos: photosScore, documents: documentsScore, published: publishedScore };
  }

  let views_total = 0, views_today = 0, views_week = 0;
  if (property) {
    views_total = db.prepare('SELECT COUNT(*) as c FROM property_page_views WHERE property_id=?').get(property.id)?.c || 0;
    views_today = db.prepare("SELECT COUNT(*) as c FROM property_page_views WHERE property_id=? AND viewed_at >= date('now')").get(property.id)?.c || 0;
    views_week  = db.prepare("SELECT COUNT(*) as c FROM property_page_views WHERE property_id=? AND viewed_at >= date('now', '-7 days')").get(property.id)?.c || 0;
  }
  res.json({ seller, property, stats: { contacts: contacts.count, visits: visits.count, views_total, views_today, views_week }, notifications, photo_count, pending_visits, missing_docs, completion });
});

// Profile setup
router.post('/api/profile', requireAuth, express.json(), async (req, res) => {
  const { first_name, last_name, phone, password } = req.body;
  const updates = { first_name, last_name, phone };

  if (password && password.length >= 8) {
    updates.password = await bcrypt.hash(password, 12);
  }

  const fields = Object.keys(updates).filter(k => updates[k] !== undefined);
  const sql = `UPDATE sellers SET ${fields.map(f => f + '=?').join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...fields.map(f => updates[f]), req.seller.id);
  res.json({ success: true });
});

// Property CRUD
router.get('/api/property', requireAuth, (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ property: null });
  const photos = db.prepare('SELECT * FROM property_photos WHERE property_id = ? ORDER BY order_index').all(property.id);
  const documents = db.prepare('SELECT * FROM property_documents WHERE property_id = ?').all(property.id);
  res.json({ property, photos, documents });
});

router.post('/api/property', requireAuth, express.json(), (req, res) => {
  const existing = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  const slug = uuidv4().split('-')[0] + '-' + (req.body.city || 'bien').toLowerCase().replace(/\s+/g, '-');
  const fields = [
    'type','address','city','postal_code','surface_habitable','surface_terrain',
    'rooms','bedrooms','year_built','heating_type','heating_details','heating_mechanism','heating_year',
    'hauteur_plafond','dpe_class','taxe_fonciere','exposition','garden','terrace',
    'assainissement_type','certificat_assainissement','toiture_couverture',
    'fenetres_type','volets_type','sols_dalle','stationnement_type','garage_motorise','garage_sol','garage_surface',
    'terrace_revetement','terrace_surface','mitoyennete',
    'cheminee_type','eau_chaude_type','wc_count','cuisine_type','grenier','grenier_present',
    'dpe_conso_energie','dpe_ges','dpe_cout_min','dpe_cout_max',
    'facture_eau','facture_electricite','facture_gaz',
    'commerces','school_maternelle','school_primaire','school_college','school_lycee',
    'highway','train_station','equipment','sale_reason','price','description','rooms_detail',
    'virtual_tour_url'
  ];
  const data = {};
  fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

  if (existing) {
    // Track price change
    if (data.price) {
      const prev = db.prepare('SELECT price FROM properties WHERE id=?').get(existing.id);
      if (prev && prev.price !== Number(data.price)) {
        try { db.prepare('INSERT INTO property_price_history (property_id, price) VALUES (?,?)').run(existing.id, Number(data.price)); } catch(e) {}
      }
    }
    const setClauses = Object.keys(data).map(f => `${f}=?`).join(', ');
    db.prepare(`UPDATE properties SET ${setClauses}, updated_at=CURRENT_TIMESTAMP WHERE seller_id=?`)
      .run(...Object.values(data), req.seller.id);
    res.json({ success: true, id: existing.id });
  } else {
    const uuid = uuidv4();
    const cols = ['uuid', 'seller_id', 'slug', 'acheteur_token', 'notaire_token', ...Object.keys(data)];
    const vals = [uuid, req.seller.id, slug, uuidv4(), uuidv4(), ...Object.values(data)];
    const result = db.prepare(`INSERT INTO properties (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .run(...vals);
    res.json({ success: true, id: result.lastInsertRowid });
  }
});

// Photo upload
const MAX_PHOTOS_PER_PROPERTY = 100;

router.post('/api/property/photos', requireAuth, uploadPhoto.array('photos', 50), async (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Créez d\'abord la fiche du bien' });

  const existing = db.prepare('SELECT COUNT(*) as count FROM property_photos WHERE property_id = ?').get(property.id);
  if (existing.count + req.files.length > MAX_PHOTOS_PER_PROPERTY) return res.json({ error: `Maximum ${MAX_PHOTOS_PER_PROPERTY} photos au total` });

  const category = req.body.category || 'pro';
  const room = req.body.room || null;
  const angle_label = req.body.angle_label || null;
  const isLocal = !process.env.CLOUDINARY_URL;
  const inserted = [];
  req.files.forEach((file, i) => {
    const url = isLocal ? '/uploads/photos/' + file.filename : file.path;
    const thumb = isLocal ? url : file.path.replace('/upload/', '/upload/c_thumb,w_400/');
    const cid = file.filename;
    db.prepare('INSERT INTO property_photos (property_id, cloudinary_id, url, thumbnail_url, order_index, category, room, angle_label) VALUES (?,?,?,?,?,?,?,?)')
      .run(property.id, cid, url, thumb, existing.count + i, category, room, angle_label);
    inserted.push({ url, cloudinary_id: cid, category, room, angle_label });
  });

  // Auto-CRM hook: ≥5 photos → photographer_done = 1
  const totalPhotos = db.prepare('SELECT COUNT(*) as count FROM property_photos WHERE property_id=?').get(property.id);
  if (totalPhotos.count >= 5) {
    db.prepare('UPDATE sellers SET photographer_done=1 WHERE id=? AND photographer_done=0').run(req.seller.id);
  }

  res.json({ success: true, photos: inserted, total: totalPhotos.count });
});

router.delete('/api/property/photos/:cloudinary_id', requireAuth, async (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Non autorisé' });
  db.prepare('DELETE FROM property_photos WHERE property_id = ? AND cloudinary_id = ?').run(property.id, req.params.cloudinary_id);
  const cloudinary = require('../services/upload').cloudinary;
  await cloudinary.uploader.destroy(req.params.cloudinary_id).catch(() => {});
  res.json({ success: true });
});

// Document upload
router.post('/api/property/documents', requireAuth, (req, res, next) => {
  uploadDocument.single('document')(req, res, (err) => {
    if (err) return res.json({ error: err.message || 'Erreur lors de l\'upload du fichier' });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.json({ error: 'Aucun fichier reçu' });
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Sauvegardez d\'abord votre fiche dans l\'onglet Informations' });
  const { name, doc_type, folder } = req.body;
  const validFolders = ['diagnostics', 'acheteur_serieux', 'notaire'];
  const safeFolder = validFolders.includes(folder) ? folder : 'diagnostics';
  const isLocal = !process.env.CLOUDINARY_URL;
  const url = isLocal ? '/uploads/documents/' + req.file.filename : req.file.path;
  const cid = isLocal ? req.file.filename : (req.file.public_id || req.file.filename);
  const result = db.prepare('INSERT INTO property_documents (property_id, name, cloudinary_id, url, doc_type, folder) VALUES (?,?,?,?,?,?)')
    .run(property.id, name || req.file.originalname, cid, url, doc_type || 'autre', safeFolder);
  res.json({ success: true, id: result.lastInsertRowid, url, name: name || req.file.originalname, doc_type: doc_type || 'autre', folder: safeFolder });
});

// Document delete
router.delete('/api/property/documents/:id', requireAuth, async (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Non autorisé' });
  const doc = db.prepare('SELECT * FROM property_documents WHERE id = ? AND property_id = ?').get(req.params.id, property.id);
  if (!doc) return res.json({ error: 'Document introuvable' });
  db.prepare('DELETE FROM property_documents WHERE id = ?').run(doc.id);
  if (process.env.CLOUDINARY_URL && doc.cloudinary_id) {
    const { cloudinary } = require('../services/upload');
    await cloudinary.uploader.destroy(doc.cloudinary_id).catch(() => {});
  }
  res.json({ success: true });
});

// Publish property
router.post('/api/property/publish', requireAuth, async (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Fiche bien introuvable' });
  if (!property.type || !property.address || !property.price) {
    return res.json({ error: 'Complétez la fiche avant de publier' });
  }

  db.prepare('UPDATE properties SET published=1, published_at=CURRENT_TIMESTAMP, status=? WHERE seller_id=?')
    .run('en-ligne', req.seller.id);

  // Email confirmation to seller on publish
  try {
    const { sendPublishedConfirmation } = require('../services/email');
    const seller = db.prepare('SELECT email FROM sellers WHERE id=?').get(req.seller.id);
    if (seller) {
      await sendPublishedConfirmation({ email: seller.email, propertySlug: property.slug });
    }
  } catch (e) {
    console.error('[EMAIL] sendPublishedConfirmation error:', e.message);
  }

  // Assign Twilio number for Sérénité pack
  if (req.seller.pack === 'serenite') {
    const seller = db.prepare('SELECT twilio_number FROM sellers WHERE id=?').get(req.seller.id);
    if (!seller.twilio_number) {
      try {
        const num = await assignTwilioNumber(req.seller.id);
        res.json({ success: true, twilio_number: num, slug: property.slug });
        return;
      } catch (e) {
        console.error('Twilio assign error:', e);
      }
    }
  }
  res.json({ success: true, slug: property.slug });
});

// Agenda
router.get('/api/agenda', requireAuth, (req, res) => {
  const slots = db.prepare('SELECT * FROM agenda_slots WHERE seller_id = ? AND active = 1').all(req.seller.id);
  res.json({ slots });
});

router.post('/api/agenda', requireAuth, express.json(), (req, res) => {
  const { slots } = req.body;
  db.prepare('UPDATE agenda_slots SET active=0 WHERE seller_id=?').run(req.seller.id);
  // Support both specific-date slots ({ date, start, end }) and day-of-week slots ({ day, start, end })
  const insert = db.prepare('INSERT INTO agenda_slots (seller_id, day_of_week, specific_date, start_time, end_time, is_recurring) VALUES (?,?,?,?,?,?)');
  (slots || []).forEach(s => {
    if (s.date) {
      // Specific date slot
      const d = new Date(s.date + 'T00:00:00');
      insert.run(req.seller.id, d.getDay(), s.date, s.start, s.end, 0);
    } else {
      // Recurring day-of-week slot
      insert.run(req.seller.id, s.day, null, s.start, s.end, 1);
    }
  });
  res.json({ success: true });
});

// Visits
router.get('/api/visits', requireAuth, (req, res) => {
  const visits = db.prepare('SELECT * FROM visits WHERE seller_id = ? ORDER BY visit_date, visit_time').all(req.seller.id);
  res.json({ visits });
});

// Checklist
router.post('/api/checklist', requireAuth, express.json(), (req, res) => {
  const { checklist_type, item_index, checked } = req.body;
  db.prepare(`INSERT OR REPLACE INTO checklist_progress (seller_id, checklist_type, item_index, checked, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .run(req.seller.id, checklist_type, item_index, checked ? 1 : 0);
  res.json({ success: true });
});

router.get('/api/checklist/:type', requireAuth, (req, res) => {
  const items = db.prepare('SELECT item_index, checked FROM checklist_progress WHERE seller_id=? AND checklist_type=?')
    .all(req.seller.id, req.params.type);
  res.json({ items });
});

// Status update
router.post('/api/property/status', requireAuth, express.json(), async (req, res) => {
  const { status } = req.body;
  const valid = ['preparation','en-ligne','visites','offre','compromis','vendu'];
  if (!valid.includes(status)) return res.json({ error: 'Statut invalide' });
  const prev = db.prepare('SELECT status FROM properties WHERE seller_id=?').get(req.seller.id);
  db.prepare('UPDATE properties SET status=? WHERE seller_id=?').run(status, req.seller.id);

  if (status === 'vendu' && prev?.status !== 'vendu') {
    const property = db.prepare('SELECT * FROM properties WHERE seller_id=?').get(req.seller.id);
    const seller = db.prepare('SELECT email, first_name FROM sellers WHERE id=?').get(req.seller.id);
    sendSoldCongrats({ email: seller.email, firstName: seller.first_name, address: property?.address, price: property?.price }).catch(() => {});
    if (property) {
      const visitors = db.prepare("SELECT DISTINCT buyer_email, buyer_name FROM visits WHERE property_id=? AND buyer_email IS NOT NULL AND buyer_email != '' AND status != 'cancelled'").all(property.id);
      for (const v of visitors) {
        sendPropertySoldToBuyer({ buyerEmail: v.buyer_email, buyerName: v.buyer_name, propertyType: property.type, propertyCity: property.city }).catch(() => {});
      }
    }
  }
  res.json({ success: true });
});

// ── Agent IA — génération de texte d'annonce ─────────────────────
router.post('/api/property/generate-description', requireAuth, express.json(), async (req, res) => {
  const { property } = req.body;
  if (!property) return res.json({ error: 'Données manquantes' });
  if (!process.env.ANTHROPIC_API_KEY) return res.json({ error: 'Service IA non configuré — ajoutez ANTHROPIC_API_KEY dans les variables d\'environnement.' });

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const details = [
    property.type && `Type : ${property.type}`,
    property.city && `Ville : ${property.city} (${property.postal_code || ''})`,
    property.surface_habitable && `Surface habitable : ${property.surface_habitable} m²`,
    property.surface_terrain && `Surface terrain : ${property.surface_terrain} m²`,
    (property.rooms || property.bedrooms) && `${property.rooms || '?'} pièces dont ${property.bedrooms || '?'} chambres`,
    property.year_built && `Construit en ${property.year_built}`,
    property.heating_type && `Chauffage : ${property.heating_type}${property.heating_year ? ' (chaudière ' + property.heating_year + ')' : ''}`,
    property.dpe_class && `Classe DPE : ${property.dpe_class}`,
    property.exposition && `Exposition : ${property.exposition}`,
    property.garden == 1 && 'Jardin',
    property.terrace == 1 && 'Terrasse',
    property.commerces && `Commerces à proximité : ${property.commerces}`,
    property.train_station && `Transport : ${property.train_station}`,
    property.equipment && `Équipements inclus : ${property.equipment}`,
    property.taxe_fonciere && `Taxe foncière : ${property.taxe_fonciere} €/an`,
  ].filter(Boolean).join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: `Tu es un expert en rédaction d'annonces immobilières premium pour particuliers en France.\nTu dois rédiger une annonce accrocheuse, authentique et complète en 3-4 paragraphes (300-400 mots).\nStructure : 1) Phrase d'accroche émotionnelle 2) Description des espaces de vie 3) Atouts du bien et environnement 4) Appel à l'action.\nTon : chaleureux, précis, sans superlatifs creux. Évite "magnifique", "coup de cœur", "exceptionnel".\nInclus les chiffres clés naturellement dans le texte.\nCommence immédiatement par le texte de l'annonce, sans préambule.`,
      messages: [{
        role: 'user',
        content: `Rédige une annonce immobilière pour ce bien. Respecte la structure en 4 parties et vise 300-400 mots. Sois précis, honnête, et mets en valeur les vrais atouts du bien.\n\nCaractéristiques :\n${details}`
      }]
    });
    res.json({ description: response.content[0].text });
  } catch (err) {
    console.error('generate-description error:', err.message);
    res.json({ error: 'Génération indisponible, réessayez.' });
  }
});

// ── Coach IA formation ─────────────��──────────────────────────
router.post('/api/formation/chat', requireAuth, express.json(), async (req, res) => {
  const { message, module: moduleName, history = [] } = req.body;
  if (!message) return res.json({ error: 'Message manquant' });

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Tu es Alex, le coach IA personnel de Vendu Par Moi. Tu accompagnes ${req.seller?.first_name || 'ce vendeur'} dans sa vente immobilière.

Module actuel : ${moduleName || 'Formation générale'}

Ton rôle :
- Répondre aux questions sur la vente immobilière en France
- Donner des conseils personnalisés et pratiques
- Encourager et rassurer sans minimiser les défis
- Utiliser des exemples concrets, des chiffres, des étapes claires
- Si la question sort du cadre de la vente immo, recentre poliment

Style : direct, chaleureux, expert. Pas de jargon inutile. Réponses courtes (3-5 phrases max sauf si explication nécessaire). Tu peux utiliser des listes à puces si pertinent.`;

  const messages = [
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });
    res.json({ reply: response.content[0].text });
  } catch (err) {
    res.json({ error: 'Coach indisponible, réessayez.' });
  }
});

// ── Export dossier PDF ────────────────────────────────────────────
router.post('/api/property/export-pdf', requireAuth, express.json({ limit: '2mb' }), async (req, res) => {
  const { html, title } = req.body;
  if (!html) return res.status(400).json({ error: 'Contenu manquant' });

  const htmlPdf = require('html-pdf-node');
  const fullHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #fff; font-size: 13px; }
    img { max-width: 100%; display: block; }
    .fd-label { font-size: 11px; color: #888; padding: 4px 10px 4px 0; vertical-align: top; width: 42%; }
    .fd-value { font-size: 11px; color: #222; padding: 4px 0; font-weight: 600; vertical-align: top; }
  </style>
  </head><body>${html}</body></html>`;

  const options = { format: 'A4', margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } };
  try {
    const file = { content: fullHtml };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Dossier_Envoi_Client.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err.message);
    res.status(500).json({ error: 'Génération PDF indisponible' });
  }
});

router.get('/mes-publications', requireAuth, (req, res) => res.sendFile('publications.html', { root: './views/seller' }));
router.get('/mes-performances', requireAuth, (req, res) => res.sendFile('performances.html', { root: './views/seller' }));

router.get('/api/publications', requireAuth, (req, res) => {
  const pubs = db.prepare('SELECT * FROM property_publications WHERE seller_id = ? ORDER BY created_at DESC').all(req.seller.id);
  res.json({ publications: pubs });
});

router.post('/api/publications', requireAuth, express.json(), (req, res) => {
  const { platform, url, active, published_at } = req.body;
  if (!platform) return res.json({ error: 'Plateforme requise' });
  const existing = db.prepare('SELECT id FROM property_publications WHERE seller_id = ? AND platform = ?').get(req.seller.id, platform);
  if (existing) {
    db.prepare('UPDATE property_publications SET url=?, active=?, published_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(url || null, active ? 1 : 0, published_at || null, existing.id);
    res.json({ success: true, id: existing.id });
  } else {
    const result = db.prepare('INSERT INTO property_publications (seller_id, platform, url, active, published_at) VALUES (?,?,?,?,?)')
      .run(req.seller.id, platform, url || null, active ? 1 : 0, published_at || null);
    res.json({ success: true, id: result.lastInsertRowid });
  }
});

router.delete('/api/publications/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM property_publications WHERE id = ? AND seller_id = ?').run(req.params.id, req.seller.id);
  res.json({ success: true });
});

router.get('/api/performances', requireAuth, (req, res) => {
  const perfs = db.prepare('SELECT * FROM property_performances WHERE seller_id = ? ORDER BY views DESC').all(req.seller.id);
  res.json({ performances: perfs });
});

router.post('/api/performances', requireAuth, express.json(), (req, res) => {
  const { platform, views, favorites, messages, visits_done, offers } = req.body;
  if (!platform) return res.json({ error: 'Plateforme requise' });
  db.prepare(`INSERT INTO property_performances (seller_id, platform, views, favorites, messages, visits_done, offers, updated_at)
    VALUES (?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
    ON CONFLICT(seller_id, platform) DO UPDATE SET
      views=excluded.views, favorites=excluded.favorites, messages=excluded.messages,
      visits_done=excluded.visits_done, offers=excluded.offers, updated_at=CURRENT_TIMESTAMP`)
    .run(req.seller.id, platform, views||0, favorites||0, messages||0, visits_done||0, offers||0);
  res.json({ success: true });
});

router.get('/api/score', requireAuth, (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE seller_id = ?').get(req.seller.id);
  const seller = db.prepare('SELECT first_name, last_name, phone FROM sellers WHERE id = ?').get(req.seller.id);
  const photos = property ? db.prepare('SELECT COUNT(*) as count FROM property_photos WHERE property_id = ?').get(property.id) : { count: 0 };
  const documents = property ? db.prepare('SELECT COUNT(*) as count FROM property_documents WHERE property_id = ?').get(property.id) : { count: 0 };
  const publications = db.prepare('SELECT COUNT(*) as count FROM property_publications WHERE seller_id = ? AND active = 1').get(req.seller.id);
  const perfs = db.prepare('SELECT * FROM property_performances WHERE seller_id = ?').all(req.seller.id);

  const totalViews = perfs.reduce((s, p) => s + (p.views || 0), 0);
  const totalMessages = perfs.reduce((s, p) => s + (p.messages || 0), 0);
  const totalVisitsDone = perfs.reduce((s, p) => s + (p.visits_done || 0), 0);
  const totalOffers = perfs.reduce((s, p) => s + (p.offers || 0), 0);

  const breakdown = {
    photos: photos.count >= 10 ? 20 : photos.count >= 5 ? 15 : photos.count >= 1 ? 8 : 0,
    description: (property?.description?.length || 0) >= 150 ? 20 : (property?.description?.length || 0) >= 50 ? 10 : 0,
    prix: property?.price ? 15 : 0,
    documents: documents.count >= 3 ? 15 : documents.count >= 2 ? 10 : documents.count >= 1 ? 5 : 0,
    publication: (property?.published || publications.count > 0) ? 10 : 0,
    profil: (seller?.first_name && seller?.last_name && seller?.phone) ? 10 : (seller?.first_name && seller?.last_name) ? 6 : 0,
    performances: totalViews > 0 ? 10 : 0,
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const recommendations = [];
  if (breakdown.photos < 15) recommendations.push({ icon: '📸', text: 'Ajoutez plus de photos (minimum 10 recommandées)', link: '/mon-bien', priority: 'high' });
  if (breakdown.description < 20) recommendations.push({ icon: '✍️', text: 'Complétez votre description (150 mots minimum)', link: '/mon-bien', priority: 'high' });
  if (breakdown.prix === 0) recommendations.push({ icon: '💶', text: 'Définissez votre prix de vente', link: '/mon-bien', priority: 'high' });
  if (breakdown.documents < 10) recommendations.push({ icon: '📋', text: 'Ajoutez vos diagnostics immobiliers', link: '/mon-bien', priority: 'medium' });
  if (breakdown.publication === 0) recommendations.push({ icon: '🌐', text: 'Publiez votre annonce sur LeBonCoin ou PAP', link: '/mes-publications', priority: 'medium' });
  if (breakdown.performances === 0) recommendations.push({ icon: '📊', text: 'Renseignez vos statistiques de publication', link: '/mes-performances', priority: 'low' });

  res.json({ score, breakdown, recommendations, stats: { totalViews, totalMessages, totalVisitsDone, totalOffers } });
});

router.post('/api/performances/analyze', requireAuth, express.json(), async (req, res) => {
  const { performances } = req.body;
  if (!performances?.length) return res.json({ analysis: 'Renseignez vos statistiques pour obtenir une analyse.' });

  const totalViews = performances.reduce((s, p) => s + (p.views || 0), 0);
  const totalMessages = performances.reduce((s, p) => s + (p.messages || 0), 0);
  const totalVisitsDone = performances.reduce((s, p) => s + (p.visits_done || 0), 0);
  const totalOffers = performances.reduce((s, p) => s + (p.offers || 0), 0);

  const tauxContactSurVue = totalViews > 0 ? ((totalMessages / totalViews) * 100).toFixed(1) : 0;
  const tauxVisiteSurContact = totalMessages > 0 ? ((totalVisitsDone / totalMessages) * 100).toFixed(1) : 0;
  const tauxOffreSurVisite = totalVisitsDone > 0 ? ((totalOffers / totalVisitsDone) * 100).toFixed(1) : 0;

  const statsText = `Vues totales: ${totalViews}, Messages/contacts: ${totalMessages}, Visites réalisées: ${totalVisitsDone}, Offres reçues: ${totalOffers}. Taux vue→contact: ${tauxContactSurVue}%, contact→visite: ${tauxVisiteSurContact}%, visite→offre: ${tauxOffreSurVisite}%`;

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Tu es un expert en vente immobilière entre particuliers en France. Analyse les statistiques d'annonce et donne 2-3 conseils très concrets et actionnables. Sois direct, chaleureux, professionnel. Maximum 120 mots. Pas de bullet points, du texte naturel.`,
      messages: [{ role: 'user', content: `Analyse ces performances d'annonce immobilière et donne des conseils personnalisés : ${statsText}` }]
    });
    res.json({ analysis: response.content[0].text });
  } catch (err) {
    res.json({ analysis: 'Analyse indisponible pour le moment. Renseignez vos statistiques pour les suivre.' });
  }
});

// ═══════════════════════════════════════════════════════
// SERENIS CONNECT — Communication Hub
// ═══════════════════════════════════════════════════════

router.get('/serenis-connect', requireAuth, (req, res) => res.sendFile('communication.html', { root: './views/seller' }));

router.get('/api/connect/overview', requireAuth, (req, res) => {
  const seller = db.prepare('SELECT id, uuid, email, first_name, last_name, phone, pack, twilio_number FROM sellers WHERE id = ?').get(req.seller.id);
  const property = db.prepare('SELECT id, type, city, postal_code, price, rooms, bedrooms, surface_habitable FROM properties WHERE seller_id = ?').get(req.seller.id);
  const visits = property
    ? db.prepare('SELECT * FROM visits WHERE seller_id = ? ORDER BY visit_date ASC, visit_time ASC').all(req.seller.id)
    : [];
  const contacts = property
    ? db.prepare('SELECT * FROM buyer_contacts WHERE seller_id = ? ORDER BY created_at DESC').all(req.seller.id)
    : [];
  const notifications = db.prepare('SELECT * FROM notifications WHERE seller_id = ? ORDER BY created_at DESC LIMIT 25').all(req.seller.id);
  const stats = {
    contacts: contacts.length,
    visits_total: visits.length,
    visits_pending: visits.filter(v => v.status === 'pending').length,
    visits_confirmed: visits.filter(v => v.status === 'confirmed').length,
    visits_done: visits.filter(v => v.status === 'done').length,
    unread: notifications.filter(n => !n.read_at).length,
  };
  res.json({ seller, property, visits, contacts, notifications, stats });
});

router.post('/api/visits', requireAuth, express.json(), async (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.status(400).json({ error: 'Créez d\'abord votre bien' });
  const { buyer_name, buyer_phone, buyer_email, visit_date, visit_time, notes } = req.body;
  if (!visit_date || !visit_time) return res.status(400).json({ error: 'Date et heure requises' });
  const result = db.prepare(
    'INSERT INTO visits (property_id, seller_id, buyer_name, buyer_phone, buyer_email, visit_date, visit_time, status, notes) VALUES (?,?,?,?,?,?,?,\'pending\',?)'
  ).run(property.id, req.seller.id, buyer_name || 'Acquéreur', buyer_phone || '', buyer_email || '', visit_date, visit_time, notes || '');
  db.prepare('INSERT INTO notifications (seller_id, type, title, body) VALUES (?,\'visit_request\',?,?)')
    .run(req.seller.id, 'Nouvelle visite programmée', `${buyer_name || 'Acquéreur'} — ${visit_date} à ${visit_time}`);

  // Email notification to seller on new visit request
  try {
    const { sendNewVisitRequest } = require('../services/email');
    const seller = db.prepare('SELECT email FROM sellers WHERE id=?').get(req.seller.id);
    if (seller) {
      await sendNewVisitRequest({
        sellerEmail: seller.email,
        buyerName: buyer_name || 'Acquéreur',
        visitDate: `${visit_date} à ${visit_time}`,
        notes: notes || '',
      });
    }
  } catch (e) {
    console.error('[EMAIL] sendNewVisitRequest error:', e.message);
  }

  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/api/visits/:id/status', requireAuth, express.json(), (req, res) => {
  const { status } = req.body;
  if (!['pending','confirmed','cancelled','done'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  db.prepare('UPDATE visits SET status=? WHERE id=? AND seller_id=?').run(status, req.params.id, req.seller.id);
  const visit = db.prepare('SELECT * FROM visits WHERE id=?').get(req.params.id);
  if (visit && status === 'confirmed') {
    db.prepare('INSERT INTO notifications (seller_id, type, title, body) VALUES (?,\'visit_confirmed\',?,?)')
      .run(req.seller.id, 'Visite confirmée', `${visit.buyer_name} — ${visit.visit_date} à ${visit.visit_time}`);
  }
  res.json({ success: true });
});

router.delete('/api/visits/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM visits WHERE id=? AND seller_id=?').run(req.params.id, req.seller.id);
  res.json({ success: true });
});

router.put('/api/visits/:id/notes', requireAuth, express.json(), (req, res) => {
  const { notes } = req.body;
  db.prepare('UPDATE visits SET notes=? WHERE id=? AND seller_id=?').run(notes || '', req.params.id, req.seller.id);
  res.json({ success: true });
});

router.post('/api/connect/contacts', requireAuth, express.json(), (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.status(400).json({ error: 'Créez d\'abord votre bien' });
  const { buyer_name, buyer_phone, buyer_email, notes, buyer_budget } = req.body;
  const result = db.prepare(
    'INSERT INTO buyer_contacts (property_id, seller_id, buyer_name, buyer_phone, buyer_email, notes, buyer_budget, source, status) VALUES (?,?,?,?,?,?,?,\'manuel\',\'new\')'
  ).run(property.id, req.seller.id, buyer_name || '', buyer_phone || '', buyer_email || '', notes || '', buyer_budget || null);
  db.prepare('INSERT INTO notifications (seller_id, type, title, body) VALUES (?,\'new_contact\',?,?)')
    .run(req.seller.id, 'Nouvel acquéreur ajouté', buyer_name || buyer_phone || 'Acquéreur');
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/api/connect/contacts/:id/status', requireAuth, express.json(), (req, res) => {
  const { status } = req.body;
  if (!['new','qualified','visit_planned','not_retained'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  db.prepare('UPDATE buyer_contacts SET status=? WHERE id=? AND seller_id=?').run(status, req.params.id, req.seller.id);
  res.json({ success: true });
});

router.put('/api/connect/contacts/:id/notes', requireAuth, express.json(), (req, res) => {
  const { notes } = req.body;
  db.prepare('UPDATE buyer_contacts SET notes=? WHERE id=? AND seller_id=?').run(notes || null, req.params.id, req.seller.id);
  res.json({ success: true });
});

router.delete('/api/connect/contacts/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM buyer_contacts WHERE id=? AND seller_id=?').run(req.params.id, req.seller.id);
  res.json({ success: true });
});

router.post('/api/connect/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE seller_id=? AND read_at IS NULL').run(req.seller.id);
  res.json({ success: true });
});

router.post('/api/connect/ai-insight', requireAuth, async (req, res) => {
  const visits = db.prepare('SELECT * FROM visits WHERE seller_id=?').all(req.seller.id);
  const contacts = db.prepare('SELECT * FROM buyer_contacts WHERE seller_id=?').all(req.seller.id);
  if (visits.length === 0 && contacts.length === 0) {
    return res.json({ insight: 'Publiez votre numéro Serenis dans vos annonces pour commencer à recevoir des contacts acquéreurs. Chaque demande sera automatiquement enregistrée ici.' });
  }
  const summary = `${contacts.length} acquéreur(s) au total dont ${contacts.filter(c=>c.status==='qualified').length} qualifiés. ${visits.filter(v=>v.status==='confirmed').length} visite(s) confirmée(s), ${visits.filter(v=>v.status==='pending').length} en attente, ${visits.filter(v=>v.status==='done').length} réalisée(s).`;
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 180,
      system: 'Tu es un assistant immobilier pour vendeur particulier. Analyse le pipeline acquéreurs et donne 1-2 conseils courts et actionnables. Ton rassurant, professionnel. Max 70 mots.',
      messages: [{ role: 'user', content: `Pipeline actuel : ${summary}` }]
    });
    res.json({ insight: response.content[0].text });
  } catch(err) {
    res.json({ insight: 'Continuez à suivre vos acquéreurs avec régularité. Une communication rapide et professionnelle augmente significativement vos chances de conclure.' });
  }
});

// ── Page & API réservation séance photo ──────────────────────────────────────
router.get('/booking', requireAuth, (req, res) => res.sendFile('booking.html', { root: './views/seller' }));

router.post('/api/booking', requireAuth, (req, res) => {
  const { property_type, address, city, postal_code, surface, rooms, floor, furnished, access_notes, availability_slots, availability_note } = req.body;
  if (!address || !city || !postal_code) return res.json({ error: 'Adresse incomplète' });
  if (!availability_slots || !availability_slots.length) return res.json({ error: 'Créneaux requis' });

  // Upsert property
  let property = db.prepare('SELECT * FROM properties WHERE seller_id=?').get(req.seller.id);
  if (property) {
    db.prepare(`UPDATE properties SET type=COALESCE(?,type), address=?, city=?, postal_code=?,
      surface_habitable=COALESCE(?,surface_habitable), rooms=COALESCE(?,rooms),
      floor=COALESCE(?,floor), furnished=?, updated_at=CURRENT_TIMESTAMP WHERE seller_id=?`
    ).run(property_type || null, address, city, postal_code,
      surface ? parseFloat(surface) : null, rooms ? parseInt(rooms) : null,
      floor !== null && floor !== '' ? parseInt(floor) : null,
      furnished ? 1 : 0, req.seller.id);
  } else {
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`INSERT INTO properties (uuid, seller_id, type, address, city, postal_code, surface_habitable, rooms, floor, furnished)
      VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(uuidv4(), req.seller.id, property_type || null, address, city, postal_code,
      surface ? parseFloat(surface) : null, rooms ? parseInt(rooms) : null,
      floor !== null && floor !== '' ? parseInt(floor) : null, furnished ? 1 : 0);
  }

  // Save availability + notes
  const clientAvailability = JSON.stringify({ slots: availability_slots, note: availability_note || '' });
  db.prepare(`UPDATE sellers SET client_availability=?, booking_step=1 WHERE id=?`).run(clientAvailability, req.seller.id);

  res.json({ success: true });
});

// ── Mise en relation photographe ─────────────────────────────────────────────

// Statut de la mission photo du vendeur
router.get('/api/seller/my-mission', requireAuth, (req, res) => {
  const mission = db.prepare(`
    SELECT m.*, p.first_name as photographer_first_name, p.last_name as photographer_last_name, p.phone as photographer_phone
    FROM missions m
    LEFT JOIN photographers p ON p.id = m.photographer_id
    WHERE m.seller_id = ?
    ORDER BY m.created_at DESC LIMIT 1
  `).get(req.seller.id);
  res.json({ mission: mission || null });
});

// Récupérer les créneaux disponibles pour une zone
router.get('/api/seller/available-slots', requireAuth, (req, res) => {
  const { postal_code, date_from, date_to } = req.query;
  if (!postal_code) return res.json({ error: 'Code postal requis' });
  const prefix = postal_code.slice(0, 2);
  const from = date_from || new Date().toISOString().split('T')[0];
  const to = date_to || (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().split('T')[0]; })();
  const slots = db.prepare(`
    SELECT pa.id, pa.date, pa.start_time, pa.end_time, p.first_name, p.last_name, p.rating, p.id as photographer_id
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
  res.json({ slots });
});

// Créer la mission et assigner un photographe
router.post('/api/seller/book-photography', requireAuth, async (req, res) => {
  const { slot_id, access_notes, rooms_detail } = req.body;
  if (!slot_id) return res.json({ error: 'Créneau requis' });

  // Vérifier qu'il n'y a pas déjà une mission active
  const existing = db.prepare(`SELECT id FROM missions WHERE seller_id=? AND status IN ('pending','assigned','confirmed')`).get(req.seller.id);
  if (existing) return res.json({ error: 'Vous avez déjà une mission en cours' });

  // Récupérer le créneau
  const slot = db.prepare(`
    SELECT pa.*, p.id as photographer_id
    FROM photographer_availability pa
    JOIN photographers p ON p.id = pa.photographer_id
    WHERE pa.id=? AND pa.is_blocked=0 AND p.active=1 AND p.verified=1
    AND NOT EXISTS (
      SELECT 1 FROM missions m WHERE m.photographer_id=pa.photographer_id
      AND m.scheduled_date=pa.date AND m.scheduled_time=pa.start_time
      AND m.status IN ('assigned','confirmed')
    )
  `).get(slot_id);
  if (!slot) return res.json({ error: 'Créneau indisponible ou déjà pris' });

  // Récupérer les infos du vendeur + bien
  const seller = db.prepare('SELECT * FROM sellers WHERE id=?').get(req.seller.id);
  const property = db.prepare('SELECT * FROM properties WHERE seller_id=?').get(req.seller.id);
  if (!property) return res.json({ error: 'Renseignez d\'abord votre fiche bien' });
  if (!property.postal_code) return res.json({ error: 'Code postal du bien manquant dans la fiche' });

  const uuid = require('uuid').v4();
  db.prepare(`
    INSERT INTO missions (uuid, seller_id, client_name, client_email, client_phone,
      address, city, postal_code, property_type, surface, rooms,
      photographer_id, scheduled_date, scheduled_time, status, access_notes, price)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'assigned',?,999)
  `).run(
    uuid,
    seller.id,
    (seller.first_name || '') + ' ' + (seller.last_name || ''),
    seller.email,
    seller.phone || '',
    property.address || '',
    property.city || '',
    property.postal_code,
    property.type || 'maison',
    property.surface_habitable || null,
    property.rooms || null,
    slot.photographer_id,
    slot.date,
    slot.start_time,
    access_notes || ''
  );

  // Email notification au photographe
  try {
    const photographer = db.prepare('SELECT * FROM photographers WHERE id=?').get(slot.photographer_id);
    const mission = db.prepare('SELECT * FROM missions WHERE uuid=?').get(uuid);
    await require('../services/email').sendMissionAssigned(photographer, mission);
  } catch(e) { console.error('Email mission assigned error:', e.message); }

  res.json({ success: true, uuid });
});

// ── Reorder photos ────────────────────────────────────────────
router.put('/api/property/photos/reorder', requireAuth, express.json(), (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order) || !order.length) return res.json({ error: 'order requis' });
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(req.seller.id);
  if (!property) return res.status(403).json({ error: 'Bien non trouvé' });
  const stmt = db.prepare('UPDATE property_photos SET order_index=? WHERE cloudinary_id=? AND property_id=?');
  const update = db.transaction(items => items.forEach(({ cid, idx }) => stmt.run(idx, cid, property.id)));
  update(order.map((cid, idx) => ({ cid, idx })));
  res.json({ success: true });
});

// ── Compteurs notifications ───────────────────────────────────
router.get('/api/notifications/counts', requireAuth, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(req.seller.id);
  let pendingOffers = 0, upcomingVisits = 0;
  if (property) {
    try { pendingOffers = db.prepare("SELECT COUNT(*) as n FROM offers WHERE property_id=? AND status='pending'").get(property.id)?.n || 0; } catch(e) {}
    try { upcomingVisits = db.prepare("SELECT COUNT(*) as n FROM visits WHERE property_id=? AND status='confirmed' AND visit_date >= date('now') AND visit_date <= date('now','+7 days')").get(property.id)?.n || 0; } catch(e) {}
  }
  const unreadNotifs = db.prepare("SELECT COUNT(*) as n FROM notifications WHERE seller_id=? AND read_at IS NULL").get(req.seller.id)?.n || 0;
  res.json({ pendingOffers, upcomingVisits, unreadNotifs });
});

// ── Centre de notifications ───────────────────────────────────
router.get('/mes-notifications', requireAuth, (req, res) => res.sendFile('notifications.html', { root: './views/seller' }));

router.get('/api/notifications/all', requireAuth, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(req.seller.id);
  const notifications = db.prepare('SELECT * FROM notifications WHERE seller_id=? ORDER BY created_at DESC LIMIT 100').all(req.seller.id);
  let visits = [], offers = [], contacts = [];
  if (property) {
    visits = db.prepare('SELECT *, "visit" as source_type FROM visits WHERE seller_id=? ORDER BY created_at DESC LIMIT 30').all(req.seller.id);
    offers = db.prepare('SELECT *, "offer" as source_type FROM offers WHERE seller_id=? ORDER BY created_at DESC LIMIT 30').all(req.seller.id);
    contacts = db.prepare('SELECT *, "contact" as source_type FROM buyer_contacts WHERE seller_id=? ORDER BY created_at DESC LIMIT 30').all(req.seller.id);
  }
  res.json({ notifications, visits, offers, contacts });
});

router.post('/api/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE seller_id=? AND read_at IS NULL').run(req.seller.id);
  res.json({ success: true });
});

// ── Coach IA immobilier ───────────────────────────────────────
router.get('/coach-ia', requireAuth, (req, res) => res.sendFile('coach.html', { root: './views/seller' }));

router.post('/api/coach-ia', requireAuth, express.json(), async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Messages requis' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Coach IA non configuré — ajoutez ANTHROPIC_API_KEY dans les variables d\'environnement.' });

  const seller = db.prepare('SELECT first_name, pack FROM sellers WHERE id=?').get(req.seller.id);
  const property = db.prepare('SELECT type, city, price, surface_habitable, rooms, dpe_class, description FROM properties WHERE seller_id=?').get(req.seller.id);

  const systemPrompt = `Tu es le Coach Immobilier Serenis, un expert en vente immobilière entre particuliers en France. Tu aides ${seller?.first_name || 'ce vendeur'} à vendre son bien de façon optimale.

${property ? `Contexte du bien :
- Type : ${property.type || 'non renseigné'}
- Ville : ${property.city || 'non renseignée'}
- Prix : ${property.price ? Number(property.price).toLocaleString('fr-FR') + ' €' : 'non renseigné'}
- Surface : ${property.surface_habitable ? property.surface_habitable + ' m²' : 'non renseignée'}
- Pièces : ${property.rooms || 'non renseigné'}
- DPE : ${property.dpe_class || 'non renseigné'}` : 'Le vendeur n\'a pas encore renseigné son bien.'}

Tes domaines d'expertise :
- Estimation et stratégie de prix (méthode comparative, prix au m², tendances marché)
- Rédaction et optimisation d'annonce (titre, description, points forts à mettre en avant)
- Préparation aux visites (home staging, ordre de visite, questions fréquentes acheteurs)
- Négociation (contre-offres, tactiques, évaluation des offres)
- Aspects juridiques (diagnostics obligatoires, compromis, délais SRU, conditions suspensives)
- Dossier acheteur (comment qualifier un acheteur sérieux)

Réponds de façon concise, pratique et directe. Utilise des listes quand c'est utile. Pose des questions si tu manques d'infos cruciales. Tu es bienveillant mais direct — pas de fioriture.`;

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch(e) {
    console.error('Coach IA error:', e.message);
    res.write(`data: ${JSON.stringify({ error: 'Erreur IA. Réessayez.' })}\n\n`);
    res.end();
  }
});

// ── Offres d'achat (vue vendeur) ──────────────────────────────
router.get('/mes-offres', requireAuth, (req, res) => res.sendFile('offers.html', { root: './views/seller' }));

router.get('/api/mes-offres', requireAuth, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ offers: [] });
  const offers = db.prepare(`
    SELECT * FROM offers WHERE property_id = ? ORDER BY created_at DESC
  `).all(property.id);
  res.json({ offers });
});

router.put('/api/offres/:id/repondre', requireAuth, express.json(), (req, res) => {
  const { status, seller_response } = req.body;
  if (!['accepted', 'refused', 'counter'].includes(status)) return res.json({ error: 'Statut invalide' });
  const offer = db.prepare(`
    SELECT o.* FROM offers o JOIN properties p ON p.id = o.property_id WHERE o.id = ? AND p.seller_id = ?
  `).get(req.params.id, req.seller.id);
  if (!offer) return res.status(403).json({ error: 'Offre introuvable' });
  db.prepare('UPDATE offers SET status=?, seller_response=?, responded_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(status, seller_response || null, offer.id);
  res.json({ success: true });
});

// ── Guide photos immersives ───────────────────────────────────
router.get('/mon-guide-photos', requireAuth, (req, res) => res.sendFile('guide-photos.html', { root: './views/seller' }));

router.get('/api/guide-photos', requireAuth, (req, res) => {
  const property = db.prepare('SELECT id, type, rooms_count FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ photos: [], property: null });
  const photos = db.prepare(
    "SELECT cloudinary_id, url, thumbnail_url, room, angle_label FROM property_photos WHERE property_id = ? AND category = 'decouverte' ORDER BY order_index"
  ).all(property.id);
  res.json({ photos, property });
});

router.delete('/api/guide-photos/:cloudinary_id', requireAuth, async (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Non autorisé' });
  db.prepare("DELETE FROM property_photos WHERE property_id = ? AND cloudinary_id = ? AND category = 'decouverte'").run(property.id, req.params.cloudinary_id);
  if (process.env.CLOUDINARY_URL) {
    const { cloudinary } = require('../services/upload');
    await cloudinary.uploader.destroy(req.params.cloudinary_id).catch(() => {});
  }
  res.json({ success: true });
});

// ── Export CSV contacts acheteurs ────────────────────────────
router.get('/api/connect/contacts/export.csv', requireAuth, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(req.seller.id);
  if (!property) return res.status(404).end();
  const contacts = db.prepare('SELECT buyer_name, buyer_phone, buyer_email, source, status, notes, created_at FROM buyer_contacts WHERE seller_id=? ORDER BY created_at DESC').all(req.seller.id);
  const visits = db.prepare("SELECT buyer_name, buyer_email, visit_date, visit_time, status FROM visits WHERE seller_id=? AND status != 'cancelled' ORDER BY visit_date").all(req.seller.id);
  const visitMap = {};
  for (const v of visits) {
    const key = v.buyer_email || v.buyer_name;
    if (!visitMap[key]) visitMap[key] = [];
    visitMap[key].push(`${v.visit_date} ${v.visit_time}`);
  }
  const header = 'Nom,Téléphone,Email,Source,Statut,Visites,Notes,Date contact';
  const rows = contacts.map(c => {
    const key = c.buyer_email || c.buyer_name;
    const vDates = (visitMap[key] || []).join(' | ');
    const esc = s => `"${(s||'').replace(/"/g, '""')}"`;
    return [esc(c.buyer_name), esc(c.buyer_phone), esc(c.buyer_email), esc(c.source), esc(c.status), esc(vDates), esc(c.notes), esc((c.created_at||'').slice(0,10))].join(',');
  });
  const csv = '﻿' + [header, ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contacts-acheteurs-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ── RGPD ─────────────────────────────────────────────────────
router.get('/api/seller/rgpd/export', requireAuth, (req, res) => {
  const seller = db.prepare('SELECT id, uuid, email, first_name, last_name, phone, pack, paid_at, created_at FROM sellers WHERE id=?').get(req.seller.id);
  const property = db.prepare('SELECT * FROM properties WHERE seller_id=?').get(req.seller.id);
  const photos = property ? db.prepare('SELECT url, category, room, angle_label, created_at FROM property_photos WHERE property_id=?').all(property.id) : [];
  const documents = property ? db.prepare('SELECT name, doc_type, url, created_at FROM property_documents WHERE property_id=?').all(property.id) : [];
  const visits = db.prepare('SELECT buyer_name, buyer_email, buyer_phone, visit_date, visit_time, status, created_at FROM visits WHERE seller_id=?').all(req.seller.id);
  const contacts = db.prepare('SELECT buyer_name, buyer_phone, buyer_email, source, status, notes, created_at FROM buyer_contacts WHERE seller_id=?').all(req.seller.id);
  const slots = db.prepare('SELECT day_of_week, specific_date, start_time, end_time, is_recurring FROM agenda_slots WHERE seller_id=?').all(req.seller.id);
  const export_data = { exported_at: new Date().toISOString(), seller, property, photos, documents, visits, contacts, agenda_slots: slots };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="serenis-mes-donnees-${new Date().toISOString().slice(0,10)}.json"`);
  res.send(JSON.stringify(export_data, null, 2));
});

router.delete('/api/seller/rgpd/account', requireAuth, async (req, res) => {
  const sid = req.seller.id;
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(sid);
  if (property) {
    const photos = db.prepare('SELECT cloudinary_id FROM property_photos WHERE property_id=?').all(property.id);
    const docs = db.prepare('SELECT cloudinary_id FROM property_documents WHERE property_id=? AND cloudinary_id IS NOT NULL').all(property.id);
    if (process.env.CLOUDINARY_URL) {
      const { cloudinary } = require('../services/upload');
      for (const ph of photos) await cloudinary.uploader.destroy(ph.cloudinary_id).catch(() => {});
      for (const d of docs) await cloudinary.uploader.destroy(d.cloudinary_id).catch(() => {});
    }
    db.prepare('DELETE FROM property_photos WHERE property_id=?').run(property.id);
    db.prepare('DELETE FROM property_documents WHERE property_id=?').run(property.id);
    db.prepare('DELETE FROM buyer_contacts WHERE property_id=?').run(property.id);
    db.prepare('DELETE FROM visits WHERE property_id=?').run(property.id);
    db.prepare('DELETE FROM properties WHERE id=?').run(property.id);
  }
  db.prepare('DELETE FROM agenda_slots WHERE seller_id=?').run(sid);
  db.prepare('DELETE FROM notifications WHERE seller_id=?').run(sid);
  db.prepare('DELETE FROM sellers WHERE id=?').run(sid);
  res.clearCookie('token');
  res.json({ success: true });
});

module.exports = router;
