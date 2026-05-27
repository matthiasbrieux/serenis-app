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

router.get('/numbers', requireAdmin, (req, res) => {
  res.sendFile('numbers.html', { root: './views/admin' });
});

router.get('/crm', requireAdmin, (req, res) => {
  res.sendFile('crm.html', { root: './views/admin' });
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

router.get('/create-seller', async (req, res) => {
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

// ── CRM VENDEURS ──────────────────────────────────────────
router.put('/api/crm/:id/flags', requireAdmin, express.json(), (req, res) => {
  const allowed = [
    'contrat_signe', 'rdv_photographe', 'admin_notes',
    'photographer_scheduled', 'photographer_name', 'photographer_date',
    'photographer_done', 'photo_report_url', 'virtual_tour_done',
  ];
  const updates = [], params = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key}=?`);
      params.push(typeof req.body[key] === 'boolean' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (!updates.length) return res.json({ error: 'Rien à modifier' });
  params.push(req.params.id);
  db.prepare(`UPDATE sellers SET ${updates.join(',')} WHERE id=?`).run(...params);
  res.json({ success: true });
});

router.get('/api/crm', requireAdmin, (req, res) => {
  const crm = db.prepare(`
    SELECT
      s.id, s.first_name, s.last_name, s.email, s.phone, s.pack,
      s.twilio_number, s.created_at, s.paid_at,
      s.contrat_signe, s.rdv_photographe, s.admin_notes,
      s.photographer_scheduled, s.photographer_name, s.photographer_date,
      s.photographer_done, s.photo_report_url, s.virtual_tour_done,
      p.status as property_status, p.published, p.published_at, p.price, p.city,
      p.description, p.surface_habitable,
      COALESCE(photos.cnt, 0)    as photos_count,
      COALESCE(docs.cnt, 0)      as docs_count,
      COALESCE(contacts.cnt, 0)  as buyer_contacts_count,
      COALESCE(visits.cnt, 0)    as visits_count,
      COALESCE(visits_done.cnt,0) as visits_done_count,
      perf.total_views,
      perf.last_updated as last_activity
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
    LEFT JOIN (
      SELECT seller_id, SUM(views) as total_views, MAX(updated_at) as last_updated
      FROM property_performances GROUP BY seller_id
    ) perf ON perf.seller_id = s.id
    ORDER BY s.created_at DESC
  `).all();
  res.json({ crm });
});

module.exports = router;
