// Usage: node scripts/seed-test-sellers.js

'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const PASSWORD = 'Test1234!';
const SALT_ROUNDS = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function futureDate(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Nettoyage idempotent ──────────────────────────────────────────────────────

function cleanupTestData() {
  console.log('Nettoyage des comptes test.* existants…');

  // Récupérer les seller_id des comptes test
  const testSellers = db.prepare("SELECT id FROM sellers WHERE email LIKE 'test.%@test.fr'").all();
  const sellerIds = testSellers.map(s => s.id);

  if (sellerIds.length === 0) {
    console.log('Aucun compte test existant.');
    return;
  }

  const ids = sellerIds.join(',');

  // Supprimer dans l'ordre des dépendances (FK)
  db.exec(`DELETE FROM offers              WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM visits              WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM notifications       WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM email_log           WHERE recipient_email LIKE 'test.%@test.fr'`);
  db.exec(`DELETE FROM checklist_progress  WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM buyer_contacts      WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM agenda_slots        WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM property_performances WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM property_publications WHERE seller_id IN (${ids})`);
  db.exec(`DELETE FROM admin_activity_log  WHERE seller_id IN (${ids})`);

  // Récupérer les property_id associées
  const props = db.prepare(`SELECT id FROM properties WHERE seller_id IN (${ids})`).all();
  if (props.length > 0) {
    const propIds = props.map(p => p.id).join(',');
    db.exec(`DELETE FROM property_page_views  WHERE property_id IN (${propIds})`);
    db.exec(`DELETE FROM property_price_history WHERE property_id IN (${propIds})`);
    db.exec(`DELETE FROM property_documents   WHERE property_id IN (${propIds})`);
    db.exec(`DELETE FROM property_photos      WHERE property_id IN (${propIds})`);
    db.exec(`DELETE FROM properties           WHERE id IN (${propIds})`);
  }

  db.exec(`DELETE FROM sellers WHERE id IN (${ids})`);
  console.log(`${sellerIds.length} compte(s) test supprimé(s).`);
}

// ── Insertions ────────────────────────────────────────────────────────────────

function insertSeller(data) {
  const stmt = db.prepare(`
    INSERT INTO sellers (
      uuid, email, password, first_name, last_name, phone, pack,
      paid_at, contrat_signe, contrat_signe_at, twilio_number, twilio_number_sid
    ) VALUES (
      @uuid, @email, @password, @first_name, @last_name, @phone, @pack,
      @paid_at, @contrat_signe, @contrat_signe_at, @twilio_number, @twilio_number_sid
    )
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
}

function insertProperty(data) {
  const stmt = db.prepare(`
    INSERT INTO properties (
      uuid, seller_id, slug, status, type, address, city, postal_code,
      surface_habitable, surface_terrain, rooms, bedrooms, year_built,
      heating_type, dpe_class, dpe_conso_energie, dpe_ges,
      taxe_fonciere, garden, terrace, price, description,
      published, published_at, created_at, updated_at
    ) VALUES (
      @uuid, @seller_id, @slug, @status, @type, @address, @city, @postal_code,
      @surface_habitable, @surface_terrain, @rooms, @bedrooms, @year_built,
      @heating_type, @dpe_class, @dpe_conso_energie, @dpe_ges,
      @taxe_fonciere, @garden, @terrace, @price, @description,
      @published, @published_at, @created_at, @updated_at
    )
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
}

function insertPhoto(propertyId, index) {
  db.prepare(`
    INSERT INTO property_photos (property_id, cloudinary_id, url, thumbnail_url, order_index, category)
    VALUES (?, ?, ?, ?, ?, 'pro')
  `).run(
    propertyId,
    `serenis/test/photo_${index}`,
    `https://res.cloudinary.com/serenis/image/upload/v1/serenis/test/photo_${index}.jpg`,
    `https://res.cloudinary.com/serenis/image/upload/c_thumb,w_400/serenis/test/photo_${index}.jpg`,
    index
  );
}

function insertDocument(propertyId, name, docType) {
  db.prepare(`
    INSERT INTO property_documents (property_id, name, cloudinary_id, url, doc_type, folder)
    VALUES (?, ?, ?, ?, ?, 'diagnostics')
  `).run(
    propertyId,
    name,
    `serenis/test/docs/${docType}`,
    `https://res.cloudinary.com/serenis/raw/upload/serenis/test/docs/${docType}.pdf`,
    docType
  );
}

function insertVisit(propertyId, sellerId, buyerNum, futureDays) {
  db.prepare(`
    INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(
    propertyId,
    sellerId,
    `Acheteur Test ${buyerNum}`,
    `acheteur${buyerNum}@example.fr`,
    `060000000${buyerNum}`,
    futureDate(futureDays),
    '10:00'
  );
}

function insertOffer(propertyId, sellerId, amount, status, respondedAt) {
  db.prepare(`
    INSERT INTO offers (uuid, property_id, seller_id, buyer_name, buyer_email, buyer_phone, amount, conditions, validity_days, status, responded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, ?, ?)
  `).run(
    uuidv4(),
    propertyId,
    sellerId,
    'Marc Dupont',
    'marc.dupont@example.fr',
    '0601234567',
    amount,
    'Offre sous condition de prêt immobilier',
    status,
    respondedAt || null
  );
}

// ── Données de base réalistes ─────────────────────────────────────────────────

const BASE_PROPERTY = {
  type: 'maison',
  address: '12 rue des Lilas',
  city: 'Bordeaux',
  postal_code: '33000',
  surface_habitable: 112,
  surface_terrain: 350,
  rooms: 5,
  bedrooms: 3,
  year_built: 1998,
  heating_type: 'gaz',
  dpe_class: 'C',
  dpe_conso_energie: 128,
  dpe_ges: 22,
  taxe_fonciere: 1850,
  garden: 1,
  terrace: 1,
  price: 295000,
  description: 'Belle maison familiale de 112 m² avec jardin de 350 m², 5 pièces dont 3 chambres, cuisine équipée, double garage. Quartier calme et résidentiel proche des commodités.',
};

// ── Seed principal ────────────────────────────────────────────────────────────

async function seed() {
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  cleanupTestData();
  console.log('\nInsertion des 10 scénarios de test…\n');

  // ── 1. Prospect non converti ──────────────────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.prospect@test.fr',
      password: hash,
      first_name: 'Sophie',
      last_name: 'Marchand',
      phone: '0611111101',
      pack: 'autonome',
      paid_at: null,
      contrat_signe: 0,
      contrat_signe_at: null,
      twilio_number: null,
      twilio_number_sid: null,
    });
    insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-prospect-${Date.now()}`,
      status: 'preparation',
      ...BASE_PROPERTY,
      published: 0,
      published_at: null,
      created_at: daysAgo(5),
      updated_at: daysAgo(5),
    });
    console.log('✓ 1. Prospect non converti           — test.prospect@test.fr');
  }

  // ── 2. Pack Autonome — fiche vide ─────────────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.empty@test.fr',
      password: hash,
      first_name: 'Thomas',
      last_name: 'Bernard',
      phone: '0611111102',
      pack: 'autonome',
      paid_at: daysAgo(10),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(10),
      twilio_number: null,
      twilio_number_sid: null,
    });
    insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-empty-${Date.now()}`,
      status: 'preparation',
      type: null,
      address: null,
      city: null,
      postal_code: null,
      surface_habitable: null,
      surface_terrain: null,
      rooms: null,
      bedrooms: null,
      year_built: null,
      heating_type: null,
      dpe_class: null,
      dpe_conso_energie: null,
      dpe_ges: null,
      taxe_fonciere: null,
      garden: 0,
      terrace: 0,
      price: null,
      description: null,
      published: 0,
      published_at: null,
      created_at: daysAgo(10),
      updated_at: daysAgo(10),
    });
    console.log('✓ 2. Pack Autonome — fiche vide      — test.empty@test.fr');
  }

  // ── 3. Pack Autonome — pas de photos ─────────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.nophotos@test.fr',
      password: hash,
      first_name: 'Isabelle',
      last_name: 'Leroy',
      phone: '0611111103',
      pack: 'autonome',
      paid_at: daysAgo(12),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(12),
      twilio_number: null,
      twilio_number_sid: null,
    });
    insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-nophotos-${slugify('12-rue-des-lilas-bordeaux')}-${Date.now()}`,
      status: 'preparation',
      ...BASE_PROPERTY,
      city: 'Lyon',
      postal_code: '69003',
      published: 0,
      published_at: null,
      created_at: daysAgo(12),
      updated_at: daysAgo(8),
    });
    console.log('✓ 3. Pack Autonome — pas de photos   — test.nophotos@test.fr');
  }

  // ── 4. Pack Autonome — pas de diagnostics ────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.nodocs@test.fr',
      password: hash,
      first_name: 'Pierre',
      last_name: 'Fontaine',
      phone: '0611111104',
      pack: 'autonome',
      paid_at: daysAgo(14),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(14),
      twilio_number: null,
      twilio_number_sid: null,
    });
    const propId = insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-nodocs-${Date.now()}`,
      status: 'preparation',
      ...BASE_PROPERTY,
      city: 'Nantes',
      postal_code: '44000',
      published: 0,
      published_at: null,
      created_at: daysAgo(14),
      updated_at: daysAgo(9),
    });
    insertPhoto(propId, 1);
    insertPhoto(propId, 2);
    insertPhoto(propId, 3);
    console.log('✓ 4. Pack Autonome — pas de docs     — test.nodocs@test.fr');
  }

  // ── 5. Pack Autonome — fiche complète non publiée ────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.notpublished@test.fr',
      password: hash,
      first_name: 'Marie',
      last_name: 'Girard',
      phone: '0611111105',
      pack: 'autonome',
      paid_at: daysAgo(20),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(20),
      twilio_number: null,
      twilio_number_sid: null,
    });
    const propId = insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-notpublished-${Date.now()}`,
      status: 'preparation',
      ...BASE_PROPERTY,
      city: 'Toulouse',
      postal_code: '31000',
      published: 0,
      published_at: null,
      created_at: daysAgo(20),
      updated_at: daysAgo(3),
    });
    insertPhoto(propId, 1);
    insertPhoto(propId, 2);
    insertPhoto(propId, 3);
    insertPhoto(propId, 4);
    insertDocument(propId, 'DPE', 'dpe');
    insertDocument(propId, 'Diagnostic amiante', 'amiante');
    insertDocument(propId, 'Diagnostic plomb', 'plomb');
    console.log('✓ 5. Pack Autonome — non publiée     — test.notpublished@test.fr');
  }

  // ── 6. Pack Sérénité — publié, 0 visite ─────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.published@test.fr',
      password: hash,
      first_name: 'Jean',
      last_name: 'Moreau',
      phone: '0611111106',
      pack: 'serenite',
      paid_at: daysAgo(30),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(30),
      twilio_number: '+33756001001',
      twilio_number_sid: 'PNtest000001',
    });
    const propId = insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-published-${Date.now()}`,
      status: 'published',
      ...BASE_PROPERTY,
      city: 'Montpellier',
      postal_code: '34000',
      published: 1,
      published_at: daysAgo(15),
      created_at: daysAgo(30),
      updated_at: daysAgo(15),
    });
    insertPhoto(propId, 1);
    insertPhoto(propId, 2);
    insertPhoto(propId, 3);
    insertPhoto(propId, 4);
    insertPhoto(propId, 5);
    insertDocument(propId, 'DPE', 'dpe');
    insertDocument(propId, 'Diagnostic amiante', 'amiante');
    console.log('✓ 6. Pack Sérénité — publié 0 visite — test.published@test.fr');
  }

  // ── 7. Pack Sérénité — visites en cours ─────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.visits@test.fr',
      password: hash,
      first_name: 'Lucie',
      last_name: 'Petit',
      phone: '0611111107',
      pack: 'serenite',
      paid_at: daysAgo(45),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(45),
      twilio_number: '+33756001002',
      twilio_number_sid: 'PNtest000002',
    });
    const propId = insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-visits-${Date.now()}`,
      status: 'published',
      ...BASE_PROPERTY,
      city: 'Strasbourg',
      postal_code: '67000',
      price: 320000,
      published: 1,
      published_at: daysAgo(25),
      created_at: daysAgo(45),
      updated_at: daysAgo(25),
    });
    insertPhoto(propId, 1);
    insertPhoto(propId, 2);
    insertPhoto(propId, 3);
    insertDocument(propId, 'DPE', 'dpe');
    insertVisit(propId, sellerId, 1, 3);
    insertVisit(propId, sellerId, 2, 7);
    insertVisit(propId, sellerId, 3, 12);
    console.log('✓ 7. Pack Sérénité — visites en cours — test.visits@test.fr');
  }

  // ── 8. Pack Sérénité — offre reçue ──────────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.offer@test.fr',
      password: hash,
      first_name: 'Nicolas',
      last_name: 'Dubois',
      phone: '0611111108',
      pack: 'serenite',
      paid_at: daysAgo(60),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(60),
      twilio_number: '+33756001003',
      twilio_number_sid: 'PNtest000003',
    });
    const propId = insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-offer-${Date.now()}`,
      status: 'published',
      ...BASE_PROPERTY,
      city: 'Rennes',
      postal_code: '35000',
      price: 285000,
      published: 1,
      published_at: daysAgo(40),
      created_at: daysAgo(60),
      updated_at: daysAgo(40),
    });
    insertPhoto(propId, 1);
    insertPhoto(propId, 2);
    insertPhoto(propId, 3);
    insertPhoto(propId, 4);
    insertDocument(propId, 'DPE', 'dpe');
    insertDocument(propId, 'Diagnostic amiante', 'amiante');
    insertOffer(propId, sellerId, 280000, 'pending', null);
    console.log('✓ 8. Pack Sérénité — offre reçue     — test.offer@test.fr');
  }

  // ── 9. Pack Sérénité — bien vendu ───────────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.sold@test.fr',
      password: hash,
      first_name: 'Claire',
      last_name: 'Simon',
      phone: '0611111109',
      pack: 'serenite',
      paid_at: daysAgo(90),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(90),
      twilio_number: '+33756001004',
      twilio_number_sid: 'PNtest000004',
    });
    const propId = insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-sold-${Date.now()}`,
      status: 'sold',
      ...BASE_PROPERTY,
      city: 'Lille',
      postal_code: '59000',
      price: 310000,
      published: 1,
      published_at: daysAgo(75),
      created_at: daysAgo(90),
      updated_at: daysAgo(30),
    });
    insertPhoto(propId, 1);
    insertPhoto(propId, 2);
    insertPhoto(propId, 3);
    insertPhoto(propId, 4);
    insertDocument(propId, 'DPE', 'dpe');
    insertDocument(propId, 'Diagnostic amiante', 'amiante');
    insertDocument(propId, 'Diagnostic plomb', 'plomb');
    insertOffer(propId, sellerId, 305000, 'accepted', daysAgo(30));
    // Marquer la vente réalisée
    db.prepare("UPDATE sellers SET vente_realisee=1, vente_date=? WHERE id=?")
      .run(daysAgo(28).slice(0, 10), sellerId);
    console.log('✓ 9. Pack Sérénité — bien vendu       — test.sold@test.fr');
  }

  // ── 10. Numéro IA non renseigné ──────────────────────────────────────────
  {
    const sellerId = insertSeller({
      uuid: uuidv4(),
      email: 'test.nophone@test.fr',
      password: hash,
      first_name: 'Antoine',
      last_name: 'Laurent',
      phone: '0611111110',
      pack: 'serenite',
      paid_at: daysAgo(18),
      contrat_signe: 1,
      contrat_signe_at: daysAgo(18),
      twilio_number: null,        // pas de numéro IA attribué
      twilio_number_sid: null,
    });
    const propId = insertProperty({
      uuid: uuidv4(),
      seller_id: sellerId,
      slug: `test-nophone-${Date.now()}`,
      status: 'preparation',
      ...BASE_PROPERTY,
      city: 'Nice',
      postal_code: '06000',
      price: 425000,
      published: 0,
      published_at: null,
      created_at: daysAgo(18),
      updated_at: daysAgo(5),
    });
    insertPhoto(propId, 1);
    insertPhoto(propId, 2);
    insertDocument(propId, 'DPE', 'dpe');
    console.log('✓ 10. Numéro IA non renseigné         — test.nophone@test.fr');
  }

  console.log('\nSeed terminé. 10 scénarios insérés avec succès.');
  console.log('Mot de passe commun : Test1234!');
}

seed().catch(err => {
  console.error('Erreur lors du seed :', err);
  process.exit(1);
});
