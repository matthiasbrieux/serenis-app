const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail, sendPhotographerAvailabilityRequest, sendPostFirstVisitFeedbackSeller, sendCheckInNoOffer, sendNoPhotosNudge, sendMissingDocNudge, sendNotPublishedNudge, sendProspectNudge, sendContractRenewal, sendReviewRequest, sendAdminDirectEmail } = require('../services/email');

router.get('/', requireAdmin, (req, res) => {
  res.sendFile('dashboard.html', { root: './views/admin' });
});

router.get('/numbers', requireAdmin, (req, res) => {
  res.sendFile('numbers.html', { root: './views/admin' });
});

router.get('/crm', requireAdmin, (req, res) => {
  res.sendFile('crm.html', { root: './views/admin' });
});

router.get('/marketing', requireAdmin, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile('marketing.html', { root: './views/admin' });
});

router.get('/documents', requireAdmin, (req, res) => {
  res.sendFile('documents.html', { root: './views/admin' });
});

router.get('/finance', requireAdmin, (req, res) => {
  res.sendFile('finance.html', { root: './views/admin' });
});

// ── API Documents légaux ──────────────────────────────────────
router.get('/api/contrats', requireAdmin, (req, res) => {
  const contrats = db.prepare(`
    SELECT
      s.id, s.first_name, s.last_name, s.email, s.phone,
      s.pack, s.paid_at, s.created_at,
      s.contrat_signe, s.contrat_signe_at, s.contrat_ip,
      s.vente_realisee, s.vente_date, s.avis_demande_at, s.avis_recu,
      s.relance_extension_at,
      -- Calcul date d'échéance
      date(s.contrat_signe_at, '+12 months') as contrat_echeance,
      -- Jours restants avant échéance
      CAST((julianday(date(s.contrat_signe_at, '+12 months')) - julianday('now')) AS INTEGER) as jours_restants,
      -- Jours pour vendre (de paid_at à vente_date)
      CASE WHEN s.vente_realisee=1 AND s.vente_date IS NOT NULL AND s.paid_at IS NOT NULL
           THEN CAST((julianday(s.vente_date) - julianday(s.paid_at)) AS INTEGER)
           ELSE NULL END as jours_pour_vendre,
      -- Infos bien
      p.city, p.price, p.type as property_type, p.published,
      COALESCE(photos.cnt, 0) as photo_count
    FROM sellers s
    LEFT JOIN properties p ON p.seller_id = s.id
    LEFT JOIN (SELECT property_id, COUNT(*) as cnt FROM property_photos GROUP BY property_id) photos ON photos.property_id = p.id
    WHERE s.contrat_signe = 1 OR s.paid_at IS NOT NULL
    ORDER BY s.contrat_signe_at DESC NULLS LAST, s.created_at DESC
  `).all();
  res.json({ contrats });
});

// Marquer vente réalisée
router.put('/api/contrats/:id/vente', requireAdmin, express.json(), (req, res) => {
  const { vente_realisee, vente_date } = req.body;
  db.prepare('UPDATE sellers SET vente_realisee=?, vente_date=? WHERE id=?')
    .run(vente_realisee ? 1 : 0, vente_date || null, req.params.id);
  res.json({ success: true });
});

// Relance extension manuelle (envoie l'email + log)
router.post('/api/contrats/:id/relance-extension', requireAdmin, async (req, res) => {
  const { sendContractRenewal } = require('../services/email');
  const seller = db.prepare('SELECT * FROM sellers WHERE id=?').get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
  const expiryDate = seller.contrat_signe_at
    ? new Date(new Date(seller.contrat_signe_at).setFullYear(new Date(seller.contrat_signe_at).getFullYear() + 1))
    : new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const daysLeft = Math.max(1, Math.round((expiryDate - new Date()) / (1000 * 3600 * 24)));
  const ok = await sendContractRenewal({ email: seller.email, firstName: seller.first_name, expiryDate: expiryDate.toISOString(), daysLeft });
  if (ok) {
    db.prepare('UPDATE sellers SET relance_extension_at=CURRENT_TIMESTAMP WHERE id=?').run(seller.id);
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Erreur envoi email' });
  }
});

// Demande d'avis (envoie l'email + log)
router.post('/api/contrats/:id/demande-avis', requireAdmin, async (req, res) => {
  const { sendReviewRequest } = require('../services/email');
  const seller = db.prepare(`
    SELECT s.*, p.city as property_city,
      CASE WHEN s.vente_realisee=1 AND s.vente_date IS NOT NULL AND s.paid_at IS NOT NULL
           THEN CAST((julianday(s.vente_date) - julianday(s.paid_at)) AS INTEGER)
           ELSE NULL END as jours_pour_vendre
    FROM sellers s LEFT JOIN properties p ON p.seller_id=s.id WHERE s.id=?
  `).get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
  const ok = await sendReviewRequest({ email: seller.email, firstName: seller.first_name, daysToSell: seller.jours_pour_vendre, propertyCity: seller.property_city });
  if (ok) {
    db.prepare('UPDATE sellers SET avis_demande_at=CURRENT_TIMESTAMP WHERE id=?').run(seller.id);
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Erreur envoi email' });
  }
});

// ── Documents IA (fichiers .md générés) ──────────────────────
router.get('/api/docs', requireAdmin, (req, res) => {
  const docsDir = path.join(__dirname, '..');
  const files = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const stat = fs.statSync(path.join(docsDir, f));
      return { name: f, size: stat.size, modified: stat.mtime };
    })
    .sort((a, b) => b.modified - a.modified);
  res.json(files);
});

router.get('/api/docs/:filename', requireAdmin, (req, res) => {
  const filename = req.params.filename;
  if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ name: filename, content });
});

// ── Seed de démonstration ─────────────────────────────────
router.post('/api/seed-demo', requireAdmin, (req, res) => {
  function ago(days) {
    const d = new Date(); d.setDate(d.getDate() - days);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }
  function fromNow(days) {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  const demoHash = bcrypt.hashSync('demo1234', 10);

  // Supprime les démos existantes
  const existing = db.prepare("SELECT id FROM sellers WHERE email LIKE '%@demo.serenis'").all();
  existing.forEach(s => {
    const props = db.prepare('SELECT id FROM properties WHERE seller_id=?').all(s.id);
    props.forEach(p => {
      db.prepare('DELETE FROM property_photos WHERE property_id=?').run(p.id);
      db.prepare('DELETE FROM property_documents WHERE property_id=?').run(p.id);
    });
    db.prepare('DELETE FROM buyer_contacts WHERE seller_id=?').run(s.id);
    db.prepare('DELETE FROM visits WHERE seller_id=?').run(s.id);
    db.prepare('DELETE FROM properties WHERE seller_id=?').run(s.id);
    db.prepare('DELETE FROM sellers WHERE id=?').run(s.id);
  });

  const PHOTOS = [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80',
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  ];

  const demos = [
    {
      first_name: 'Jean', last_name: 'Dupont', phone: '06 12 34 56 78',
      email: 'jean.dupont@demo.serenis', pack: 'serenite', paid_at: ago(8),
      twilio_number: null, contrat_signe: 0, rdv_photographe: 0,
      photographer_scheduled: 0, photographer_name: null, photographer_date: null,
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: 'Nouveau client — relance à faire',
      property: { city: 'Lyon', price: 385000, surface: 112, rooms: 5, address: '14 rue des Lilas', postal: '69003', type: 'maison', description: '', published: 0, status: 'preparation', photosCount: 0, docsCount: 0 },
    },
    {
      first_name: 'Marie', last_name: 'Martin', phone: '06 98 76 54 32',
      email: 'marie.martin@demo.serenis', pack: 'serenite', paid_at: ago(15),
      twilio_number: '+33 9 87 65 43 21', contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 0, photographer_name: null, photographer_date: null,
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: null,
      property: { city: 'Bordeaux', price: 290000, surface: 78, rooms: 3, address: '5 allée des Pins', postal: '33000', type: 'appartement', description: 'Bel appartement lumineux', published: 0, status: 'preparation', photosCount: 0, docsCount: 1 },
    },
    {
      first_name: 'Pierre', last_name: 'Lefebvre', phone: '07 11 22 33 44',
      email: 'pierre.lefebvre@demo.serenis', pack: 'serenite', paid_at: ago(22),
      twilio_number: '+33 9 12 34 56 78', contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 1, photographer_name: 'Studio Lumière - Julien', photographer_date: fromNow(3),
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: 'RDV confirmé par le photographe',
      property: { city: 'Nantes', price: 445000, surface: 140, rooms: 6, address: '8 rue du Château', postal: '44000', type: 'maison', description: '', published: 0, status: 'preparation', photosCount: 0, docsCount: 2 },
    },
    {
      first_name: 'Sophie', last_name: 'Bernard', phone: '06 55 44 33 22',
      email: 'sophie.bernard@demo.serenis', pack: 'serenite', paid_at: ago(34),
      twilio_number: '+33 9 22 11 33 44', contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 1, photographer_name: 'Photographe Pro - Clara', photographer_date: ago(10).slice(0,10),
      photographer_done: 1, photo_report_url: 'https://drive.google.com/drive/folders/demo-sophie',
      virtual_tour_done: 1, admin_notes: null,
      property: { city: 'Toulouse', price: 320000, surface: 95, rooms: 4, address: '22 boulevard Victor Hugo', postal: '31000', type: 'appartement', description: 'Magnifique appartement T4 entièrement rénové au cœur de Toulouse. Parquet en chêne massif, cuisine équipée haut de gamme, double exposition sud-ouest.', published: 0, status: 'preparation', photosCount: 15, docsCount: 3 },
    },
    {
      first_name: 'Thomas', last_name: 'Moreau', phone: '06 77 88 99 00',
      email: 'thomas.moreau@demo.serenis', pack: 'serenite', paid_at: ago(48),
      twilio_number: '+33 9 44 55 66 77', contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 1, photographer_name: 'Agence Pixel - Marc', photographer_date: ago(30).slice(0,10),
      photographer_done: 1, photo_report_url: 'https://drive.google.com/drive/folders/demo-thomas',
      virtual_tour_done: 1, admin_notes: '3 offres reçues — compromis en cours',
      property: { city: 'Paris 15e', price: 680000, surface: 88, rooms: 4, address: '3 rue de la Fédération', postal: '75015', type: 'appartement', description: 'Superbe appartement Haussmannien en plein cœur de Paris. Hauts plafonds, moulures d\'époque, parquet point de Hongrie. Vue dégagée sur cour intérieure arborée. Idéal pour investisseur ou résidence principale.', published: 1, published_at: ago(28), status: 'offre', photosCount: 22, docsCount: 5, contactsCount: 8, visitsCount: 5, visitsDone: 3 },
    },
    {
      first_name: 'Emma', last_name: 'Petit', phone: '07 33 22 11 00',
      email: 'emma.petit@demo.serenis', pack: 'autonome', paid_at: ago(11),
      twilio_number: null, contrat_signe: 0, rdv_photographe: 0,
      photographer_scheduled: 0, photographer_name: null, photographer_date: null,
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: null,
      property: { city: 'Montpellier', price: 198000, surface: 58, rooms: 2, address: '7 place de la Comédie', postal: '34000', type: 'appartement', description: 'Studio entièrement rénové', published: 0, status: 'preparation', photosCount: 4, docsCount: 0 },
    },
  ];

  const insertSeller = db.prepare(`
    INSERT INTO sellers (uuid, email, password, pack, first_name, last_name, phone, paid_at, created_at,
      twilio_number, contrat_signe, rdv_photographe, admin_notes,
      photographer_scheduled, photographer_name, photographer_date,
      photographer_done, photo_report_url, virtual_tour_done)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insertProp = db.prepare(`
    INSERT INTO properties (uuid, seller_id, slug, type, address, city, postal_code,
      surface_habitable, rooms, price, description, status, published, published_at, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insertPhoto = db.prepare('INSERT INTO property_photos (property_id, cloudinary_id, url, order_index) VALUES (?,?,?,?)');
  const insertDoc   = db.prepare("INSERT INTO property_documents (property_id, name, url, doc_type) VALUES (?,?,?,?)");
  const insertContact = db.prepare("INSERT INTO buyer_contacts (property_id, seller_id, buyer_phone, buyer_email, source) VALUES (?,?,?,?,'demo')");
  const insertVisit   = db.prepare("INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time, status) VALUES (?,?,?,?,?,?,?,'confirmed')");

  const DOC_TYPES = ["Titre de propriété", "Diagnostics DPE", "Plan cadastral", "Taxe foncière", "Règlement copropriété"];

  demos.forEach((d, idx) => {
    const uuid = uuidv4();
    const r = insertSeller.run(
      uuid, d.email, demoHash, d.pack, d.first_name, d.last_name, d.phone,
      d.paid_at, d.paid_at,
      d.twilio_number, d.contrat_signe, d.rdv_photographe, d.admin_notes,
      d.photographer_scheduled, d.photographer_name, d.photographer_date,
      d.photographer_done, d.photo_report_url, d.virtual_tour_done
    );
    const sellerId = r.lastInsertRowid;
    const p = d.property;
    const propUuid = uuidv4();
    const slug = `demo-${p.city.toLowerCase().replace(/\s/g,'-')}-${sellerId}`;
    const pr = insertProp.run(propUuid, sellerId, slug, p.type, p.address, p.city, p.postal,
      p.surface, p.rooms, p.price, p.description, p.status, p.published ? 1 : 0, p.published_at || null, d.paid_at);
    const propertyId = pr.lastInsertRowid;
    for (let i = 0; i < (p.photosCount||0); i++) {
      insertPhoto.run(propertyId, `demo_cld_${sellerId}_${i}`, PHOTOS[i % PHOTOS.length], i);
    }
    for (let i = 0; i < (p.docsCount||0); i++) {
      insertDoc.run(propertyId, DOC_TYPES[i] || `Document ${i+1}`, `https://demo.serenis/doc/${sellerId}/${i}`, 'document');
    }
    for (let i = 0; i < (p.contactsCount||0); i++) {
      insertContact.run(propertyId, sellerId, `+336${String(i).padStart(8,'0')}`, `acheteur${i+1}@demo.fr`);
    }
    const visitDates = [ago(20).slice(0,10), ago(14).slice(0,10), ago(7).slice(0,10), ago(3).slice(0,10), fromNow(5)];
    for (let i = 0; i < (p.visitsCount||0); i++) {
      const status = i < (p.visitsDone||0) ? 'done' : 'confirmed';
      const stmt = db.prepare(`INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time, status) VALUES (?,?,?,?,?,?,?,?)`);
      stmt.run(propertyId, sellerId, `Acheteur ${i+1}`, `acheteur${i+1}@demo.fr`, `+336${String(i).padStart(8,'0')}`, visitDates[i]||fromNow(i), '10:00', status);
    }
  });

  res.json({ success: true, count: demos.length });
});

router.delete('/api/seed-demo', requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT id FROM sellers WHERE email LIKE '%@demo.serenis'").all();
  existing.forEach(s => {
    const props = db.prepare('SELECT id FROM properties WHERE seller_id=?').all(s.id);
    props.forEach(p => {
      db.prepare('DELETE FROM property_photos WHERE property_id=?').run(p.id);
      db.prepare('DELETE FROM property_documents WHERE property_id=?').run(p.id);
    });
    db.prepare('DELETE FROM buyer_contacts WHERE seller_id=?').run(s.id);
    db.prepare('DELETE FROM visits WHERE seller_id=?').run(s.id);
    db.prepare('DELETE FROM properties WHERE seller_id=?').run(s.id);
    db.prepare('DELETE FROM sellers WHERE id=?').run(s.id);
  });
  res.json({ success: true, deleted: existing.length });
});

router.get('/create-seller', requireAdmin, async (req, res) => {
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

// ── Attribuer un numéro depuis le panneau CRM ────────────
router.post('/api/crm/:id/assign-number', requireAdmin, async (req, res) => {
  const { assignPhoneNumber } = require('./payment');
  const seller = db.prepare('SELECT * FROM sellers WHERE id=?').get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
  if (seller.twilio_number) return res.json({ success: true, number: seller.twilio_number, already: true });
  try {
    const num = await assignPhoneNumber(seller);
    if (num) {
      logActivity(+req.params.id, 'number', `📱 Numéro attribué : ${num}`);
      res.json({ success: true, number: num });
    } else {
      res.json({ success: false, error: 'Aucun numéro disponible dans la réserve ni via Twilio' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ALERTS ENDPOINT ──────────────────────────────────────
router.get('/api/alerts', requireAdmin, (req, res) => {
  // Paid but no property > 24h
  const paidNoProperty = db.prepare(`
    SELECT COUNT(*) as c FROM sellers s
    WHERE s.paid_at IS NOT NULL
    AND s.paid_at < datetime('now', '-24 hours')
    AND NOT EXISTS (SELECT 1 FROM properties p WHERE p.seller_id = s.id)
  `).get().c;

  // Has property, 0 photos > 48h
  const noPhotos = db.prepare(`
    SELECT COUNT(*) as c FROM sellers s
    JOIN properties p ON p.seller_id = s.id
    WHERE s.paid_at IS NOT NULL
    AND p.updated_at < datetime('now', '-48 hours')
    AND (SELECT COUNT(*) FROM property_photos ph WHERE ph.property_id = p.id) = 0
  `).get().c;

  // Score ready (has price+description+dpe), not published > 72h
  const readyNotPublished = db.prepare(`
    SELECT COUNT(*) as c FROM properties p
    WHERE p.published = 0
    AND p.price > 0
    AND p.description IS NOT NULL AND p.description != ''
    AND p.dpe_class IS NOT NULL AND p.dpe_class != ''
    AND p.updated_at < datetime('now', '-72 hours')
  `).get().c;

  // Pending visits > 12h (check visits table exists first)
  let pendingVisits = 0;
  try {
    pendingVisits = db.prepare(`
      SELECT COUNT(*) as c FROM visits
      WHERE status = 'pending'
      AND created_at < datetime('now', '-12 hours')
    `).get().c;
  } catch(e) {}

  // Paid but contract not signed
  const contractNotSigned = db.prepare(`
    SELECT COUNT(*) as c FROM sellers
    WHERE paid_at IS NOT NULL AND (contrat_signe IS NULL OR contrat_signe = 0)
  `).get().c;

  res.json({ paidNoProperty, noPhotos, readyNotPublished, pendingVisits, contractNotSigned });
});

// ── CRM VENDEURS ──────────────────────────────────────────
function logActivity(seller_id, type, description) {
  try { db.prepare('INSERT INTO admin_activity_log (seller_id, type, description) VALUES (?,?,?)').run(seller_id, type, description); } catch(e) {}
}

router.put('/api/crm/:id/flags', requireAdmin, express.json(), (req, res) => {
  const allowed = [
    'contrat_signe', 'rdv_photographe', 'admin_notes',
    'photographer_scheduled', 'photographer_name', 'photographer_date',
    'photographer_done', 'photo_report_url', 'virtual_tour_done',
  ];
  const updates = [], params = [];
  const logParts = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key}=?`);
      const val = typeof req.body[key] === 'boolean' ? (req.body[key] ? 1 : 0) : req.body[key];
      params.push(val);
      if (key === 'admin_notes') logParts.push(`Note mise à jour`);
      else if (key === 'contrat_signe') logParts.push(`Contrat ${val ? 'signé ✓' : 'désigné ✗'}`);
      else if (key === 'photographer_done') logParts.push(`Photos ${val ? 'marquées effectuées ✓' : 'réinitialisées'}`);
      else if (key === 'photographer_date') logParts.push(`Date photo fixée au ${val||'—'}`);
      else if (key === 'photographer_name') logParts.push(`Photographe : ${val||'—'}`);
      else if (key === 'photo_report_url') logParts.push(`Rapport photos ${val ? 'ajouté' : 'retiré'}`);
      else if (key === 'virtual_tour_done') logParts.push(`Visite 360° ${val ? 'validée ✓' : 'réinitialisée'}`);
    }
  }
  if (!updates.length) return res.json({ error: 'Rien à modifier' });
  params.push(req.params.id);
  db.prepare(`UPDATE sellers SET ${updates.join(',')} WHERE id=?`).run(...params);
  if (logParts.length) logActivity(+req.params.id, 'flag', logParts.join(' · '));
  res.json({ success: true });
});

// ── Email direct depuis le CRM ────────────────────────────────
router.post('/api/crm/:id/email', requireAdmin, express.json(), async (req, res) => {
  const { subject, body } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'Sujet et corps requis' });
  const seller = db.prepare('SELECT * FROM sellers WHERE id=?').get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
  const { sendAdminDirectEmail } = require('../services/email');
  const ok = await sendAdminDirectEmail({ to: seller.email, subject, body, firstName: seller.first_name });
  if (ok) {
    logActivity(seller.id, 'email', `📧 Email envoyé — "${subject}"`);
    try { db.prepare('INSERT INTO email_log (recipient_email, trigger_type) VALUES (?,?)').run(seller.email, 'admin_direct'); } catch(e) {}
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Erreur envoi email (vérifier SendGrid)' });
  }
});

// ── Historique activité vendeur ───────────────────────────────
router.get('/api/crm/:id/activity', requireAdmin, (req, res) => {
  let activity = [];
  try {
    activity = db.prepare('SELECT * FROM admin_activity_log WHERE seller_id=? ORDER BY created_at DESC LIMIT 50').all(+req.params.id);
  } catch(e) {}
  // Aussi récupérer emails automatiques envoyés
  let autoEmails = [];
  try {
    const seller = db.prepare('SELECT email FROM sellers WHERE id=?').get(+req.params.id);
    if (seller) {
      autoEmails = db.prepare("SELECT trigger_type as type, sent_at as created_at FROM email_log WHERE recipient_email=? ORDER BY sent_at DESC LIMIT 20").all(seller.email);
    }
  } catch(e) {}
  res.json({ activity, autoEmails });
});

// ── Performance annonce vendeur ───────────────────────────────
router.get('/api/crm/:id/performance', requireAdmin, (req, res) => {
  const property = db.prepare('SELECT id, slug, price, city, type, published, published_at, surface_habitable, rooms FROM properties WHERE seller_id=?').get(+req.params.id);
  let perf = [], visits = [], photos = [];
  if (property) {
    try { perf = db.prepare('SELECT * FROM property_performances WHERE seller_id=? ORDER BY views DESC').all(+req.params.id); } catch(e) {}
    try { visits = db.prepare("SELECT * FROM visits WHERE property_id=? ORDER BY visit_date DESC LIMIT 10").all(property.id); } catch(e) {}
    try { photos = db.prepare('SELECT COUNT(*) as cnt FROM property_photos WHERE property_id=?').get(property.id); } catch(e) {}
  }
  const totalViews = perf.reduce((s, p) => s + (p.views||0), 0);
  const totalFavs  = perf.reduce((s, p) => s + (p.favorites||0), 0);
  const totalMsgs  = perf.reduce((s, p) => s + (p.messages||0), 0);
  res.json({ property, perf, visits, photos: photos?.cnt||0, totalViews, totalFavs, totalMsgs });
});

router.get('/api/crm/:id/offres', requireAdmin, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(+req.params.id);
  if (!property) return res.json({ offers: [] });
  try {
    const offers = db.prepare('SELECT * FROM offers WHERE property_id=? ORDER BY created_at DESC').all(property.id);
    res.json({ offers });
  } catch(e) { res.json({ offers: [] }); }
});

router.get('/api/crm', requireAdmin, (req, res) => {
  const crm = db.prepare(`
    SELECT
      s.id, s.first_name, s.last_name, s.email, s.phone, s.pack,
      s.twilio_number, s.created_at, s.paid_at,
      s.contrat_signe, s.contrat_signe_at, s.rdv_photographe, s.admin_notes,
      s.photographer_name, s.photographer_date,
      s.photo_report_url, s.virtual_tour_done,
      s.client_availability, s.booking_step, s.booking_confirmed_at,
      s.vente_realisee, s.vente_date,
      -- photographer_done: auto si ≥5 photos, sinon flag manuel
      CASE WHEN COALESCE(photos.cnt, 0) >= 5 THEN 1 ELSE s.photographer_done END as photographer_done,
      -- photographer_scheduled: auto si date saisie, sinon flag manuel
      CASE WHEN s.photographer_date IS NOT NULL AND s.photographer_date != '' THEN 1 ELSE s.photographer_scheduled END as photographer_scheduled,
      -- was it auto-detected (for badge display)
      CASE WHEN COALESCE(photos.cnt, 0) >= 5 AND s.photographer_done = 0 THEN 1 ELSE 0 END as photographer_done_auto,
      -- property completion % (10 critical fields × 10%)
      COALESCE((
        CASE WHEN p.type IS NOT NULL AND p.type != '' THEN 10 ELSE 0 END +
        CASE WHEN p.address IS NOT NULL AND p.address != '' THEN 10 ELSE 0 END +
        CASE WHEN p.city IS NOT NULL AND p.city != '' THEN 10 ELSE 0 END +
        CASE WHEN p.price IS NOT NULL AND p.price > 0 THEN 10 ELSE 0 END +
        CASE WHEN p.surface_habitable IS NOT NULL THEN 10 ELSE 0 END +
        CASE WHEN p.rooms IS NOT NULL THEN 10 ELSE 0 END +
        CASE WHEN p.dpe_class IS NOT NULL AND p.dpe_class != '' THEN 10 ELSE 0 END +
        CASE WHEN p.description IS NOT NULL AND LENGTH(p.description) > 30 THEN 10 ELSE 0 END +
        CASE WHEN p.year_built IS NOT NULL THEN 10 ELSE 0 END +
        CASE WHEN p.bedrooms IS NOT NULL THEN 10 ELSE 0 END
      ), 0) as prop_completion_pct,
      -- next upcoming visit
      (SELECT visit_date FROM visits WHERE seller_id = s.id AND status != 'cancelled' AND visit_date >= date('now') ORDER BY visit_date ASC, visit_time ASC LIMIT 1) as next_visit_date,
      (SELECT visit_time FROM visits WHERE seller_id = s.id AND status != 'cancelled' AND visit_date >= date('now') ORDER BY visit_date ASC, visit_time ASC LIMIT 1) as next_visit_time,
      (SELECT buyer_name FROM visits WHERE seller_id = s.id AND status != 'cancelled' AND visit_date >= date('now') ORDER BY visit_date ASC, visit_time ASC LIMIT 1) as next_visit_buyer,
      -- days since subscription
      CAST((julianday('now') - julianday(COALESCE(s.paid_at, s.created_at))) AS INTEGER) as days_since_signup,
      p.status as property_status, p.published, p.published_at, p.price, p.city,
      p.description, p.surface_habitable, p.type as property_type, p.rooms, p.updated_at as last_prop_update,
      COALESCE(photos.cnt, 0)    as photos_count,
      COALESCE(docs.cnt, 0)      as docs_count,
      COALESCE(contacts.cnt, 0)  as buyer_contacts_count,
      COALESCE(visits.cnt, 0)    as visits_count,
      COALESCE(visits_done.cnt,0) as visits_done_count,
      perf.total_views,
      perf.last_updated as last_activity,
      -- Additional CRM columns
      COALESCE(photos.cnt, 0) as photo_count,
      COALESCE(docs.cnt, 0) as doc_count,
      COALESCE(pending_v.cnt, 0) as pending_visits,
      CAST((julianday('now') - julianday(s.paid_at)) AS INTEGER) as days_since_paid,
      CASE WHEN p.price > 0 THEN 1 ELSE 0 END as has_price,
      CASE WHEN p.dpe_class IS NOT NULL AND p.dpe_class != '' THEN 1 ELSE 0 END as has_dpe,
      CASE WHEN p.taxe_fonciere IS NOT NULL AND p.taxe_fonciere > 0 THEN 1 ELSE 0 END as has_taxe
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
    LEFT JOIN (SELECT seller_id, COUNT(*) as cnt FROM visits WHERE status='pending' GROUP BY seller_id) pending_v
      ON pending_v.seller_id = s.id
    LEFT JOIN (
      SELECT seller_id, SUM(views) as total_views, MAX(updated_at) as last_updated
      FROM property_performances GROUP BY seller_id
    ) perf ON perf.seller_id = s.id
    WHERE (s.archived IS NULL OR s.archived = 0)
    ORDER BY s.created_at DESC
  `).all();
  res.json({ crm });
});

// ── Archivage vendeur ─────────────────────────────────────────
router.put('/api/crm/:id/archive', requireAdmin, express.json(), (req, res) => {
  const { archived } = req.body;
  db.prepare('UPDATE sellers SET archived=?, archived_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?')
    .run(archived ? 1 : 0, archived ? 1 : 0, +req.params.id);
  if (archived) {
    try {
      const s = db.prepare('SELECT id FROM sellers WHERE id=?').get(+req.params.id);
      if (s) db.prepare("INSERT INTO admin_activity_log (seller_id, type, description) VALUES (?,?,?)").run(s.id, 'flag', 'Compte archivé par admin');
    } catch(e) {}
  }
  res.json({ success: true });
});

// ── Pages marketing print (full screen) ──────────────────────────────────────
router.get('/marketing/flyer', requireAdmin, (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}body{background:#0E0E0D;display:flex;justify-content:center;padding:40px;font-family:'DM Sans',sans-serif}
      .flyer{background:#0E0E0D;color:#F5F0E8;padding:48px 40px;font-family:'DM Sans',sans-serif;max-width:600px;width:100%}
      .flyer-logo{font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:#F5F0E8;margin-bottom:32px}
      .flyer-logo em{color:#C4603A;font-style:italic}
      h1{font-family:'Cormorant Garamond',serif;font-size:2.4rem;font-weight:600;line-height:1.2;margin-bottom:12px}
      h1 em{color:#C4603A;font-style:italic;font-weight:400}
      .sub{font-size:1rem;color:rgba(245,240,232,0.6);margin-bottom:32px;line-height:1.6}
      .items{display:flex;flex-direction:column;gap:12px;margin-bottom:32px}
      .item{display:flex;gap:12px;align-items:flex-start}
      .item-icon{color:#C4603A;font-size:0.9rem;margin-top:2px;flex-shrink:0}
      .item-text{font-size:0.9rem;color:rgba(245,240,232,0.8);line-height:1.4}
      .item-text strong{color:#F5F0E8}
      .price-block{background:rgba(196,96,58,0.12);border:1px solid rgba(196,96,58,0.3);border-radius:10px;padding:20px 24px;margin-bottom:28px}
      .price{font-family:'Cormorant Garamond',serif;font-size:2.8rem;color:#F5F0E8;font-weight:700}
      .price-sub{font-size:0.8rem;color:rgba(245,240,232,0.5);margin-top:4px}
      .cta{background:#C4603A;color:#F5F0E8;padding:14px 28px;border-radius:8px;font-weight:600;font-size:0.95rem;display:inline-block;text-decoration:none}
      .footer{margin-top:32px;padding-top:20px;border-top:1px solid rgba(245,240,232,0.1);display:flex;justify-content:space-between;align-items:center}
      .footer-text{font-size:0.75rem;color:rgba(245,240,232,0.3)}
      @media print{@page{size:A5;margin:0}body{padding:0}button{display:none}}
    </style></head><body>
    <div class="flyer">
      <div class="flyer-logo">Sere<em>nis</em></div>
      <div style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:rgba(196,96,58,0.8);margin-bottom:12px;">Vendez votre bien</div>
      <h1>Vendez comme<br>un pro.<br><em>Sans commission.</em></h1>
      <p class="sub">Photographe professionnel, visite virtuelle 360°, numéro intelligent, formation complète. Tout ce qu'une agence ferait — sans payer 10 000 à 20 000€ de commission.</p>
      <div class="items">
        <div class="item"><span class="item-icon">✔</span><div class="item-text"><strong>Séance photo professionnelle</strong> à domicile — livrée en 48h</div></div>
        <div class="item"><span class="item-icon">✔</span><div class="item-text"><strong>Visite virtuelle 360°</strong> pour attirer les acheteurs à distance</div></div>
        <div class="item"><span class="item-icon">✔</span><div class="item-text"><strong>Numéro Serenis intelligent</strong> — filtre les appels, qualifie les acheteurs</div></div>
        <div class="item"><span class="item-icon">✔</span><div class="item-text"><strong>Dossiers acheteurs automatisés</strong> — envoyés à chaque contact sérieux</div></div>
        <div class="item"><span class="item-icon">✔</span><div class="item-text"><strong>Formation complète + coaching</strong> jusqu'à la vente</div></div>
      </div>
      <div class="price-block">
        <div style="font-size:0.65rem;letter-spacing:0.25em;text-transform:uppercase;color:rgba(196,96,58,0.6);margin-bottom:8px;">Forfait tout compris</div>
        <div class="price">999 €</div>
        <div class="price-sub">ou 249€ × 4 sans frais · paiement unique · pas d'abonnement</div>
      </div>
      <a class="cta">serenis-app.onrender.com</a>
      <div class="footer">
        <div class="footer-text">Serenis — Vente immobilière entre particuliers</div>
        <div class="footer-text">📞 06 95 44 36 54 · Matthias répond en direct</div>
      </div>
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`);
});

router.get('/marketing/parrainage', requireAdmin, (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}body{background:#f5f0e8;display:flex;justify-content:center;padding:40px;font-family:'DM Sans',sans-serif}
      .cheque{background:#F5F0E8;border-radius:8px;padding:32px 40px;font-family:'DM Sans',sans-serif;max-width:680px;width:100%;border:2px solid #C4603A;position:relative;overflow:hidden}
      .cheque::before{content:'';position:absolute;top:0;left:0;right:0;height:8px;background:#C4603A}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
      .logo{font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:#1A1A16}
      .logo em{color:#C4603A;font-style:italic}
      .badge{background:#C4603A;color:#fff;padding:6px 16px;border-radius:20px;font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase}
      .amount{font-family:'Cormorant Garamond',serif;font-size:4rem;color:#C4603A;font-weight:700;text-align:center;margin:20px 0 8px}
      .title{text-align:center;font-size:1.1rem;font-weight:600;color:#1A1A16;margin-bottom:4px}
      .desc{text-align:center;font-size:0.82rem;color:#666;margin-bottom:28px}
      .conditions{background:rgba(196,96,58,0.06);border-radius:8px;padding:16px 20px;font-size:0.76rem;color:#666;line-height:1.6}
      .conditions strong{color:#1A1A16}
      .footer{display:flex;justify-content:space-between;margin-top:24px;align-items:flex-end}
      .code{font-family:monospace;font-size:1.1rem;font-weight:700;color:#C4603A;letter-spacing:0.15em;background:rgba(196,96,58,0.08);padding:8px 16px;border-radius:6px;border:1px dashed #C4603A}
      .validity{font-size:0.72rem;color:#aaa;text-align:right}
      @media print{@page{size:A5 landscape;margin:20mm}button{display:none}}
    </style></head><body>
    <div class="cheque">
      <div class="header"><div class="logo">Sere<em>nis</em></div><div class="badge">🎁 Chèque Parrainage</div></div>
      <div class="amount">100 €</div>
      <div class="title">Offerts pour chaque ami qui vend avec Serenis</div>
      <div class="desc">Vous avez vendu votre bien avec Serenis. Merci de nous faire confiance.<br>En signe de gratitude, voici votre chèque parrainage.</div>
      <div class="conditions"><strong>Comment ça marche :</strong><br>1. Partagez votre code personnel à un proche qui souhaite vendre son bien<br>2. Il s'inscrit sur serenis-app.onrender.com et utilise votre code<br>3. Dès son paiement confirmé, vous recevez 100€ par virement sur votre compte<br><br><strong>Conditions :</strong> valable 12 mois · 1 parrainage = 1 virement · cumulable sans limite · votre filleul bénéficie de 50€ de réduction</div>
      <div class="footer"><div><div style="font-size:0.72rem;color:#aaa;margin-bottom:6px;">Votre code personnel</div><div class="code">SERENIS-XXXX</div></div><div class="validity">Valable jusqu'au [DATE + 12 mois]<br>Matthias Brieux — 06 95 44 36 54</div></div>
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`);
});

router.get('/marketing/partenaire', requireAdmin, (req, res) => {
  res.redirect('/admin/marketing');
});

router.get('/marketing/presentation', requireAdmin, (req, res) => {
  res.redirect('/admin/marketing');
});

// ── Pages photographes & missions ────────────────────────────────────────────
router.get('/photographers', requireAdmin, (req, res) => {
  res.sendFile('photographers.html', { root: './views/admin' });
});

router.get('/missions', requireAdmin, (req, res) => {
  res.sendFile('missions.html', { root: './views/admin' });
});

// ── API photographes (admin) ──────────────────────────────────────────────────
router.get('/api/photographers', requireAdmin, (req, res) => {
  const photographers = db.prepare(`
    SELECT * FROM photographers ORDER BY created_at DESC
  `).all();
  res.json({ photographers });
});

router.get('/api/photographers/:id/missions', requireAdmin, (req, res) => {
  const missions = db.prepare(`
    SELECT * FROM missions WHERE photographer_id=? ORDER BY scheduled_date DESC LIMIT 20
  `).all(req.params.id);
  res.json({ missions });
});

router.post('/api/photographers/:id/verify', requireAdmin, express.json(), (req, res) => {
  const { verified } = req.body;
  db.prepare('UPDATE photographers SET verified=? WHERE id=?').run(verified ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.post('/api/photographers/:id/active', requireAdmin, express.json(), (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE photographers SET active=? WHERE id=?').run(active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// ── API missions (admin) ──────────────────────────────────────────────────────
router.get('/api/missions', requireAdmin, (req, res) => {
  const missions = db.prepare(`
    SELECT m.*,
      p.first_name as photographer_first_name, p.last_name as photographer_last_name
    FROM missions m
    LEFT JOIN photographers p ON p.id = m.photographer_id
    ORDER BY m.scheduled_date ASC, m.scheduled_time ASC
  `).all();
  res.json({ missions });
});

router.post('/api/missions/:id/assign', requireAdmin, express.json(), (req, res) => {
  const { photographer_id } = req.body;
  if (!photographer_id) return res.json({ error: 'Photographe requis' });
  const p = db.prepare('SELECT * FROM photographers WHERE id=? AND active=1').get(photographer_id);
  if (!p) return res.json({ error: 'Photographe introuvable' });
  db.prepare(`UPDATE missions SET photographer_id=?, status='assigned' WHERE id=?`).run(photographer_id, req.params.id);
  res.json({ success: true });
});

// ── API Finance ───────────────────────────────────────────────
router.get('/api/finance', requireAdmin, (req, res) => {
  const totalClients = db.prepare("SELECT COUNT(*) as n FROM sellers WHERE paid_at IS NOT NULL").get()?.n || 0;
  const totalRevenue = db.prepare("SELECT COUNT(*) as n FROM sellers WHERE paid_at IS NOT NULL AND pack='serenite'").get()?.n || 0;
  const activeClients = db.prepare("SELECT COUNT(*) as n FROM sellers WHERE paid_at IS NOT NULL AND (vente_realisee IS NULL OR vente_realisee=0)").get()?.n || 0;
  const soldClients = db.prepare("SELECT COUNT(*) as n FROM sellers WHERE vente_realisee=1").get()?.n || 0;
  const packDist = db.prepare("SELECT pack, COUNT(*) as n FROM sellers WHERE paid_at IS NOT NULL GROUP BY pack").all();
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', paid_at) as month, COUNT(*) as clients, COUNT(CASE WHEN pack='serenite' THEN 1 END) as serenite
    FROM sellers WHERE paid_at IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all();
  const recent = db.prepare(`
    SELECT id, first_name, last_name, email, pack, paid_at FROM sellers
    WHERE paid_at IS NOT NULL ORDER BY paid_at DESC LIMIT 20
  `).all();

  // Views stats
  let topViewed = [];
  try { topViewed = db.prepare(`
    SELECT p.type, p.city, p.price, p.slug, COUNT(v.id) as views
    FROM property_page_views v JOIN properties p ON p.id = v.property_id
    GROUP BY v.property_id ORDER BY views DESC LIMIT 5
  `).all(); } catch(e) {}

  // Price history
  let priceChanges = [];
  try { priceChanges = db.prepare(`
    SELECT ph.*, p.city, p.type FROM property_price_history ph
    JOIN properties p ON p.id = ph.property_id
    ORDER BY ph.changed_at DESC LIMIT 10
  `).all(); } catch(e) {}

  // Offers summary
  let offersSummary = { total: 0, pending: 0, accepted: 0 };
  try { offersSummary = db.prepare("SELECT COUNT(*) as total, SUM(status='pending') as pending, SUM(status='accepted') as accepted FROM offers").get() || offersSummary; } catch(e) {}

  res.json({ totalClients, totalRevenue, activeClients, soldClients, packDist, monthly: monthly.reverse(), recent, topViewed, priceChanges, offersSummary });
});

// ── Historique des prix (admin) ───────────────────────────────
router.get('/api/crm/:id/price-history', requireAdmin, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(+req.params.id);
  if (!property) return res.json({ history: [] });
  try {
    const history = db.prepare('SELECT * FROM property_price_history WHERE property_id=? ORDER BY changed_at DESC').all(property.id);
    res.json({ history });
  } catch(e) { res.json({ history: [] }); }
});

// ── Vues de la page publique (admin) ─────────────────────────
router.get('/api/crm/:id/views', requireAdmin, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE seller_id=?').get(+req.params.id);
  if (!property) return res.json({ total: 0, today: 0, week: 0 });
  try {
    const total = db.prepare('SELECT COUNT(*) as n FROM property_page_views WHERE property_id=?').get(property.id)?.n || 0;
    const today = db.prepare("SELECT COUNT(*) as n FROM property_page_views WHERE property_id=? AND viewed_at >= date('now')").get(property.id)?.n || 0;
    const week = db.prepare("SELECT COUNT(*) as n FROM property_page_views WHERE property_id=? AND viewed_at >= date('now','-7 days')").get(property.id)?.n || 0;
    res.json({ total, today, week });
  } catch(e) { res.json({ total: 0, today: 0, week: 0 }); }
});

// ── Backup manuel de la base SQLite ──────────────────────────
router.post('/api/backup', requireAdmin, (req, res) => {
  try {
    const { backupDatabase } = require('../services/backup');
    const dest = backupDatabase();
    const files = require('fs').readdirSync('./backups').filter(f => /^db-/.test(f)).sort().reverse();
    res.json({ success: true, file: require('path').basename(dest || ''), backups: files });
  } catch(e) {
    console.error('Backup error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/api/backup/list', requireAdmin, (req, res) => {
  try {
    const backupsDir = './backups';
    if (!require('fs').existsSync(backupsDir)) return res.json({ backups: [] });
    const files = require('fs').readdirSync(backupsDir).filter(f => /^db-/.test(f)).sort().reverse()
      .map(f => { const s = require('fs').statSync(require('path').join(backupsDir, f)); return { name: f, size: s.size, date: s.mtime }; });
    res.json({ backups: files });
  } catch(e) { res.json({ backups: [] }); }
});

// ── Emails management ─────────────────────────────────────────
router.get('/emails', requireAdmin, (req, res) => {
  res.sendFile('emails.html', { root: './views/admin' });
});

const EMAIL_CATALOG = [
  { id: 'welcome',               label: 'Bienvenue + accès espace',         trigger: 'Création de compte',               recipient: 'Vendeur',  auto: true },
  { id: 'no_property',           label: 'Pas encore de bien créé',           trigger: 'J+3 sans fiche',                   recipient: 'Vendeur',  auto: true },
  { id: 'no_photos',             label: 'Photos manquantes',                 trigger: 'J+3 payé sans photos',             recipient: 'Vendeur',  auto: true },
  { id: 'photographer_request',  label: 'Demande de dispos photographe',     trigger: 'J+3 payé sans photos (manuel)',    recipient: 'Vendeur',  auto: false },
  { id: 'missing_doc',           label: 'Documents manquants',               trigger: 'J+5 payé sans diagnostics',        recipient: 'Vendeur',  auto: true },
  { id: 'not_published',         label: 'Fiche non publiée',                 trigger: 'J+7 non publié',                   recipient: 'Vendeur',  auto: true },
  { id: 'post_first_visit',      label: 'Retour 1ère session de visites',    trigger: 'J+2 après 1ère visite',            recipient: 'Vendeur',  auto: false },
  { id: 'check_in_no_offer',     label: 'Check-in sans offre',               trigger: 'J+14 publié sans offre',           recipient: 'Vendeur',  auto: false },
  { id: 'contract_renewal',      label: 'Renouvellement contrat',            trigger: '30j avant expiration',             recipient: 'Vendeur',  auto: true },
  { id: 'review_request',        label: 'Demande d\'avis',                   trigger: 'Après offre acceptée',             recipient: 'Vendeur',  auto: false },
  { id: 'visit_confirmation',    label: 'Confirmation de visite',            trigger: 'Réservation validée',              recipient: 'Acheteur', auto: true },
  { id: 'visit_reminder_seller', label: 'Rappel visite (vendeur)',           trigger: 'Veille de la visite',              recipient: 'Vendeur',  auto: true },
  { id: 'new_visit_request',     label: 'Nouvelle demande de visite',        trigger: 'Demande soumise',                  recipient: 'Vendeur',  auto: true },
  { id: 'contact_notification',  label: 'Notification contact acheteur',     trigger: 'SMS dossier acheteur reçu',        recipient: 'Vendeur',  auto: true },
  { id: 'mission_assigned',      label: 'Mission assignée',                  trigger: 'Attribution photographe/coach',    recipient: 'Prestataire', auto: true },
  { id: 'offer_notification',    label: 'Notification offre reçue',          trigger: 'Offre soumise par acheteur',       recipient: 'Vendeur',  auto: true },
  { id: 'prospect_nudge',        label: 'Relance prospect',                  trigger: 'J+7 inscrit non payé',             recipient: 'Prospect', auto: true },
  { id: 'info_needed',           label: 'Renseignements manquants sur la fiche', trigger: 'Manuel admin',                  recipient: 'Vendeur',  auto: false },
  { id: 'buyer_contacted',       label: 'Un acheteur vous a contacté',       trigger: 'Formulaire contact annonce',       recipient: 'Vendeur',  auto: true },
  { id: 'visit_feedback_buyer',  label: 'Retour visite (acheteur)',           trigger: 'J+1 après visite confirmée',       recipient: 'Acheteur', auto: false },
  { id: 'sold_congrats',         label: 'Félicitations — bien vendu !',       trigger: 'Offre acceptée',                   recipient: 'Vendeur',  auto: false },
  { id: 'welcome_v2',            label: 'Bienvenue (version améliorée)',      trigger: 'Création compte',                  recipient: 'Vendeur',  auto: true },
];

router.get('/api/emails/catalog', requireAdmin, (req, res) => {
  try {
    let lastSentMap = {};
    try {
      const logRows = db.prepare(`SELECT trigger_type, sent_at FROM email_log ORDER BY sent_at DESC LIMIT 500`).all();
      for (const row of logRows) {
        const base = row.trigger_type.split(':')[0];
        if (!lastSentMap[base]) lastSentMap[base] = row.sent_at;
      }
    } catch(e) { /* email_log might not exist yet */ }
    const catalog = EMAIL_CATALOG.map(e => ({ ...e, last_sent: lastSentMap[e.id] || null }));
    res.json({ catalog });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/emails/log', requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 50;
    let logs = [], total = 0;
    try {
      logs = db.prepare(`
        SELECT el.*, s.first_name, s.last_name
        FROM email_log el
        LEFT JOIN sellers s ON s.email = el.recipient_email
        ORDER BY el.sent_at DESC LIMIT ? OFFSET ?
      `).all(limit, page * limit);
      total = db.prepare(`SELECT COUNT(*) as c FROM email_log`).get()?.c || 0;
    } catch(e) { /* email_log might not exist yet */ }
    res.json({ logs, total, page });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/emails/sellers-list', requireAdmin, (req, res) => {
  try {
    const sellers = db.prepare(`
      SELECT id, first_name, last_name, email, pack, paid_at,
             (SELECT published_at FROM properties WHERE seller_id = sellers.id LIMIT 1) as published_at,
             (SELECT COUNT(*) FROM photos WHERE seller_id = sellers.id) as photo_count,
             (SELECT COUNT(*) FROM visits WHERE seller_id = sellers.id AND status='confirmed') as visit_count,
             (SELECT COUNT(*) FROM offers WHERE seller_id = sellers.id) as offer_count
      FROM sellers WHERE archived IS NULL OR archived = 0
      ORDER BY created_at DESC LIMIT 200
    `).all();
    res.json({ sellers });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/emails/send', requireAdmin, async (req, res) => {
  const { seller_id, email_type, custom_message } = req.body;
  if (!seller_id || !email_type) return res.status(400).json({ error: 'seller_id et email_type requis' });

  const seller = db.prepare(`SELECT * FROM sellers WHERE id = ?`).get(seller_id);
  if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });

  const prop = db.prepare(`SELECT * FROM properties WHERE seller_id = ? LIMIT 1`).get(seller_id);

  try {
    let ok = false;
    if (email_type === 'no_photos') {
      ok = await sendNoPhotosNudge({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'photographer_request') {
      ok = await sendPhotographerAvailabilityRequest({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'missing_doc') {
      ok = await sendMissingDocNudge({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'not_published') {
      ok = await sendNotPublishedNudge({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'post_first_visit') {
      ok = await sendPostFirstVisitFeedbackSeller({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'check_in_no_offer') {
      const pub = prop?.published_at;
      const days = pub ? Math.floor((Date.now() - new Date(pub).getTime()) / 86400000) : 0;
      ok = await sendCheckInNoOffer({ email: seller.email, firstName: seller.first_name, daysPublished: days });
    } else if (email_type === 'contract_renewal') {
      ok = await sendContractRenewal({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'review_request') {
      ok = await sendReviewRequest({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'prospect_nudge') {
      ok = await sendProspectNudge({ email: seller.email, firstName: seller.first_name });
    } else if (email_type === 'custom') {
      if (!custom_message) return res.status(400).json({ error: 'custom_message requis' });
      ok = await sendAdminDirectEmail({ to: seller.email, subject: 'Message de Serenis', body: custom_message });
    } else if (email_type === 'info_needed') {
      ok = await sendAdminDirectEmail({ to: seller.email, subject: 'Des renseignements sont nécessaires sur votre dossier', body: custom_message || `Bonjour ${seller.first_name || ''},\n\nDes informations complémentaires sont nécessaires pour compléter votre dossier Serenis.\n\nN\'hésitez pas à nous contacter pour plus de détails.\n\nL\'équipe Serenis` });
    } else if (email_type === 'sold_congrats') {
      ok = await sendAdminDirectEmail({ to: seller.email, subject: 'Félicitations — votre bien est vendu !', body: custom_message || `Bonjour ${seller.first_name || ''},\n\nToute l'équipe Serenis vous félicite pour la vente de votre bien !\n\nMerci pour votre confiance.\n\nL'équipe Serenis` });
    } else {
      // Fallback générique pour les types non encore implémentés
      ok = await sendAdminDirectEmail({ to: seller.email, subject: `Email Serenis — ${email_type}`, body: custom_message || `Bonjour ${seller.first_name || ''},\n\nMessage de l'équipe Serenis.\n\nL'équipe Serenis` });
    }

    if (ok) {
      db.prepare(`INSERT INTO email_log (trigger_type, recipient_email) VALUES (?,?) ON CONFLICT DO NOTHING`).run(`${email_type}:manual`, seller.email);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Envoi échoué (vérifiez SENDGRID_API_KEY)' });
    }
  } catch(e) {
    console.error('[ADMIN EMAIL SEND]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Offres d'achat (vue admin) ────────────────────────────────
router.get('/api/offres', requireAdmin, (req, res) => {
  const offres = db.prepare(`
    SELECT o.*, p.type as property_type, p.city, p.price as asking_price,
           s.first_name, s.last_name, s.email as seller_email
    FROM offers o
    JOIN properties p ON p.id = o.property_id
    JOIN sellers s ON s.id = o.seller_id
    ORDER BY o.created_at DESC
    LIMIT 100
  `).all();
  res.json({ offres });
});

module.exports = router;
