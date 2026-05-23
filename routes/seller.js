const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const { uploadPhoto, uploadDocument } = require('../services/upload');
const { assignTwilioNumber } = require('../services/twilio');

// Dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile('dashboard.html', { root: './views/seller' });
});

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
    'rooms','bedrooms','year_built','heating_type','heating_year','dpe_class',
    'taxe_fonciere','exposition','garden','terrace','commerces',
    'school_maternelle','school_primaire','school_college','school_lycee',
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

module.exports = router;
