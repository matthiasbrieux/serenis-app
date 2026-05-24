const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const { uploadPhoto, uploadDocument } = require('../services/upload');
const { assignTwilioNumber } = require('../services/twilio');

// Pages vendeur (toutes protégées)
router.get('/dashboard', requireAuth, (req, res) => res.sendFile('dashboard.html', { root: './views/seller' }));
router.get('/mon-bien', requireAuth, (req, res) => res.sendFile('property.html', { root: './views/seller' }));
router.get('/ma-formation', requireAuth, (req, res) => res.sendFile('library.html', { root: './views/seller' }));
router.get('/mon-agenda', requireAuth, (req, res) => res.sendFile('agenda.html', { root: './views/seller' }));
router.get('/onboarding', requireAuth, (req, res) => res.sendFile('onboarding.html', { root: './views/seller' }));

// API — seller data
router.get('/api/me', requireAuth, (req, res) => {
  const seller = db.prepare('SELECT id, uuid, email, first_name, last_name, phone, pack, twilio_number, paid_at, created_at FROM sellers WHERE id = ?').get(req.seller.id);
  const property = db.prepare('SELECT * FROM properties WHERE seller_id = ?').get(req.seller.id);
  const contacts = property ? db.prepare('SELECT COUNT(*) as count FROM buyer_contacts WHERE seller_id = ?').get(req.seller.id) : { count: 0 };
  const visits = property ? db.prepare('SELECT COUNT(*) as count FROM visits WHERE seller_id = ?').get(req.seller.id) : { count: 0 };
  res.json({ seller, property, stats: { contacts: contacts.count, visits: visits.count } });
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
    'highway','train_station','equipment','sale_reason','price','description'
  ];
  const data = {};
  fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

  if (existing) {
    const setClauses = Object.keys(data).map(f => `${f}=?`).join(', ');
    db.prepare(`UPDATE properties SET ${setClauses}, updated_at=CURRENT_TIMESTAMP WHERE seller_id=?`)
      .run(...Object.values(data), req.seller.id);
    res.json({ success: true, id: existing.id });
  } else {
    const uuid = uuidv4();
    const cols = ['uuid', 'seller_id', 'slug', ...Object.keys(data)];
    const vals = [uuid, req.seller.id, slug, ...Object.values(data)];
    const result = db.prepare(`INSERT INTO properties (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .run(...vals);
    res.json({ success: true, id: result.lastInsertRowid });
  }
});

// Photo upload
router.post('/api/property/photos', requireAuth, uploadPhoto.array('photos', 20), async (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Créez d\'abord la fiche du bien' });

  const existing = db.prepare('SELECT COUNT(*) as count FROM property_photos WHERE property_id = ?').get(property.id);
  if (existing.count + req.files.length > 20) return res.json({ error: 'Maximum 20 photos' });

  const inserted = [];
  req.files.forEach((file, i) => {
    db.prepare('INSERT INTO property_photos (property_id, cloudinary_id, url, thumbnail_url, order_index) VALUES (?,?,?,?,?)')
      .run(property.id, file.filename, file.path, file.path.replace('/upload/', '/upload/c_thumb,w_400/'), existing.count + i);
    inserted.push({ url: file.path, cloudinary_id: file.filename });
  });
  res.json({ success: true, photos: inserted });
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
router.post('/api/property/documents', requireAuth, uploadDocument.single('document'), (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id = ?').get(req.seller.id);
  if (!property) return res.json({ error: 'Créez d\'abord la fiche du bien' });
  const { name, doc_type } = req.body;
  db.prepare('INSERT INTO property_documents (property_id, name, cloudinary_id, url, doc_type) VALUES (?,?,?,?,?)')
    .run(property.id, name || req.file.originalname, req.file.filename, req.file.path, doc_type || 'autre');
  res.json({ success: true, url: req.file.path });
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
  const insert = db.prepare('INSERT INTO agenda_slots (seller_id, day_of_week, start_time, end_time, is_recurring) VALUES (?,?,?,?,1)');
  slots.forEach(s => insert.run(req.seller.id, s.day, s.start, s.end));
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
router.post('/api/property/status', requireAuth, express.json(), (req, res) => {
  const { status } = req.body;
  const valid = ['preparation','en-ligne','visites','offre','compromis','vendu'];
  if (!valid.includes(status)) return res.json({ error: 'Statut invalide' });
  db.prepare('UPDATE properties SET status=? WHERE seller_id=?').run(status, req.seller.id);
  res.json({ success: true });
});

// ── Agent IA — génération de texte d'annonce ─────────────────────
router.post('/api/property/generate-description', requireAuth, express.json(), async (req, res) => {
  const { property } = req.body;
  if (!property) return res.json({ error: 'Données manquantes' });

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
      max_tokens: 500,
      system: `Tu es un expert en rédaction d'annonces immobilières pour le marché français. Tu rédiges des descriptions percutantes, honnêtes et attractives pour des vendeurs particuliers sur LeBonCoin, PAP ou SeLoger. Style : direct, chaleureux, sans superlatifs vides. Commence immédiatement par le texte de l'annonce, sans préambule.`,
      messages: [{
        role: 'user',
        content: `Rédige une description d'annonce immobilière (150–220 mots) pour ce bien. Mets en avant les atouts principaux, sois précis et honnête. Termine par une phrase d'appel à action pour les visites.\n\nCaractéristiques :\n${details}`
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

module.exports = router;
