/**
 * Initialisation idempotente des données de démonstration VRP.
 *
 * seedDemoAccounts({ force }) :
 *   - force=false (défaut) : ne crée que si aucun compte @demo.venduparmoi n'existe
 *   - force=true           : supprime et recrée (réinitialisation complète)
 *
 * getDemoSeller() : retourne un vendeur démo prêt à l'emploi (contrat signé)
 *
 * Les comptes créés ici :
 *   - ont l'email *@demo.venduparmoi (jamais de vraie boîte)
 *   - ont is_demo = 1 (blocage IA + emails côté serveur)
 *   - ne touchent aucune donnée de production
 *   - ne déclenchent aucun email, SMS ni paiement
 */

'use strict';

const db      = require('../database');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Mot de passe démo fixe — hash bcrypt mis en cache pour ne pas le recalculer à chaque appel
let _demoHash = null;
function demoHash() {
  if (!_demoHash) _demoHash = bcrypt.hashSync('demo1234', 10);
  return _demoHash;
}

function ago(days) {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
function fromNow(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const PHOTOS = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
  'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
];
const DOC_TYPES = ['Titre de propriété', 'Diagnostics DPE', 'Plan cadastral', 'Taxe foncière', 'Règlement copropriété'];

function getDemoScenarios() {
  return [
    {
      first_name: 'Jean', last_name: 'Dupont', phone: '06 12 34 56 78',
      email: 'jean.dupont@demo.venduparmoi', pack: 'serenite', paid_at: ago(8),
      twilio_number: null, contrat_signe: 0, rdv_photographe: 0,
      photographer_scheduled: 0, photographer_name: null, photographer_date: null,
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: 'Nouveau client — relance à faire',
      property: { city: 'Lyon', price: 385000, surface: 112, rooms: 5, address: '14 rue des Lilas', postal: '69003', type: 'maison', description: '', published: 0, status: 'preparation', photosCount: 0, docsCount: 0 },
    },
    {
      first_name: 'Marie', last_name: 'Martin', phone: '06 98 76 54 32',
      email: 'marie.martin@demo.venduparmoi', pack: 'serenite', paid_at: ago(15),
      twilio_number: null, contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 0, photographer_name: null, photographer_date: null,
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: null,
      property: { city: 'Bordeaux', price: 290000, surface: 78, rooms: 3, address: '5 allée des Pins', postal: '33000', type: 'appartement', description: 'Bel appartement lumineux', published: 0, status: 'preparation', photosCount: 0, docsCount: 1 },
    },
    {
      first_name: 'Pierre', last_name: 'Lefebvre', phone: '07 11 22 33 44',
      email: 'pierre.lefebvre@demo.venduparmoi', pack: 'serenite', paid_at: ago(22),
      twilio_number: null, contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 1, photographer_name: 'Studio Lumière - Julien', photographer_date: fromNow(3),
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: 'RDV confirmé par le photographe',
      property: { city: 'Nantes', price: 445000, surface: 140, rooms: 6, address: '8 rue du Château', postal: '44000', type: 'maison', description: '', published: 0, status: 'preparation', photosCount: 0, docsCount: 2 },
    },
    {
      first_name: 'Sophie', last_name: 'Bernard', phone: '06 55 44 33 22',
      email: 'sophie.bernard@demo.venduparmoi', pack: 'serenite', paid_at: ago(34),
      twilio_number: null, contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 1, photographer_name: 'Photographe Pro - Clara', photographer_date: ago(10).slice(0, 10),
      photographer_done: 1, photo_report_url: 'https://drive.google.com/drive/folders/demo-sophie',
      virtual_tour_done: 1, admin_notes: null,
      property: { city: 'Toulouse', price: 320000, surface: 95, rooms: 4, address: '22 boulevard Victor Hugo', postal: '31000', type: 'appartement', description: 'Magnifique appartement T4 entièrement rénové au cœur de Toulouse. Parquet en chêne massif, cuisine équipée haut de gamme, double exposition sud-ouest.', published: 0, status: 'preparation', photosCount: 15, docsCount: 3 },
    },
    {
      first_name: 'Thomas', last_name: 'Moreau', phone: '06 77 88 99 00',
      email: 'thomas.moreau@demo.venduparmoi', pack: 'serenite', paid_at: ago(48),
      twilio_number: null, contrat_signe: 1, rdv_photographe: 1,
      photographer_scheduled: 1, photographer_name: 'Agence Pixel - Marc', photographer_date: ago(30).slice(0, 10),
      photographer_done: 1, photo_report_url: 'https://drive.google.com/drive/folders/demo-thomas',
      virtual_tour_done: 1, admin_notes: '3 offres reçues — compromis en cours',
      property: { city: 'Paris 15e', price: 680000, surface: 88, rooms: 4, address: '3 rue de la Fédération', postal: '75015', type: 'appartement', description: 'Superbe appartement Haussmannien en plein cœur de Paris. Hauts plafonds, moulures d\'époque, parquet point de Hongrie. Vue dégagée sur cour intérieure arborée.', published: 1, published_at: ago(28), status: 'offre', photosCount: 22, docsCount: 5, contactsCount: 8, visitsCount: 5, visitsDone: 3 },
    },
    {
      first_name: 'Emma', last_name: 'Petit', phone: '07 33 22 11 00',
      email: 'emma.petit@demo.venduparmoi', pack: 'autonome', paid_at: ago(11),
      twilio_number: null, contrat_signe: 0, rdv_photographe: 0,
      photographer_scheduled: 0, photographer_name: null, photographer_date: null,
      photographer_done: 0, photo_report_url: null, virtual_tour_done: 0,
      admin_notes: null,
      property: { city: 'Montpellier', price: 198000, surface: 58, rooms: 2, address: '7 place de la Comédie', postal: '34000', type: 'appartement', description: 'Studio entièrement rénové', published: 0, status: 'preparation', photosCount: 4, docsCount: 0 },
    },
  ];
}

function _deleteDemoAccounts(sellers) {
  const tx = db.transaction((list) => {
    list.forEach(s => {
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
  });
  tx(sellers);
}

function _createDemoAccounts() {
  const scenarios = getDemoScenarios();
  const hash = demoHash();

  const insertSeller = db.prepare(`
    INSERT INTO sellers (uuid, email, password, pack, first_name, last_name, phone, paid_at, created_at,
      twilio_number, contrat_signe, rdv_photographe, admin_notes,
      photographer_scheduled, photographer_name, photographer_date,
      photographer_done, photo_report_url, virtual_tour_done, is_demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
  `);
  const insertProp = db.prepare(`
    INSERT INTO properties (uuid, seller_id, slug, acheteur_token, notaire_token, type, address, city, postal_code,
      surface_habitable, rooms, price, description, status, published, published_at, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insertPhoto   = db.prepare('INSERT INTO property_photos (property_id, cloudinary_id, url, order_index) VALUES (?,?,?,?)');
  const insertDoc     = db.prepare("INSERT INTO property_documents (property_id, name, url, doc_type) VALUES (?,?,?,?)");
  const insertContact = db.prepare("INSERT INTO buyer_contacts (property_id, seller_id, buyer_phone, buyer_email, source) VALUES (?,?,?,?,'demo')");
  const insertVisit   = db.prepare("INSERT INTO visits (property_id, seller_id, buyer_name, buyer_email, buyer_phone, visit_date, visit_time, status) VALUES (?,?,?,?,?,?,?,?)");

  const tx = db.transaction(() => {
    scenarios.forEach((d) => {
      const uuid = uuidv4();
      const r = insertSeller.run(
        uuid, d.email, hash, d.pack, d.first_name, d.last_name, d.phone,
        d.paid_at, d.paid_at,
        d.twilio_number, d.contrat_signe, d.rdv_photographe, d.admin_notes,
        d.photographer_scheduled, d.photographer_name, d.photographer_date,
        d.photographer_done, d.photo_report_url, d.virtual_tour_done
      );
      const sellerId = r.lastInsertRowid;
      const p = d.property;
      const slug = `demo-${p.city.toLowerCase().replace(/[\s']/g, '-')}-${sellerId}`;
      const pr = insertProp.run(
        uuidv4(), sellerId, slug, uuidv4(), uuidv4(),
        p.type, p.address, p.city, p.postal,
        p.surface, p.rooms, p.price, p.description,
        p.status, p.published ? 1 : 0, p.published_at || null, d.paid_at
      );
      const propertyId = pr.lastInsertRowid;

      for (let i = 0; i < (p.photosCount || 0); i++)
        insertPhoto.run(propertyId, `demo_cld_${sellerId}_${i}`, PHOTOS[i % PHOTOS.length], i);

      for (let i = 0; i < (p.docsCount || 0); i++)
        insertDoc.run(propertyId, DOC_TYPES[i] || `Document ${i + 1}`, `https://demo.venduparmoi/doc/${sellerId}/${i}`, 'document');

      for (let i = 0; i < (p.contactsCount || 0); i++)
        insertContact.run(propertyId, sellerId, `+336${String(i).padStart(8, '0')}`, `acheteur${i + 1}@demo.fr`);

      const visitDates = [ago(20).slice(0, 10), ago(14).slice(0, 10), ago(7).slice(0, 10), ago(3).slice(0, 10), fromNow(5)];
      for (let i = 0; i < (p.visitsCount || 0); i++) {
        const status = i < (p.visitsDone || 0) ? 'done' : 'confirmed';
        insertVisit.run(propertyId, sellerId, `Acheteur ${i + 1}`, `acheteur${i + 1}@demo.fr`, `+336${String(i).padStart(8, '0')}`, visitDates[i] || fromNow(i), '10:00', status);
      }
    });
  });

  tx();
  return scenarios.length;
}

/**
 * Initialise les données de démo si absentes, ou les recrée si force=true.
 * Retourne { created: bool, count: number }.
 */
function seedDemoAccounts({ force = false } = {}) {
  const existing = db.prepare("SELECT id FROM sellers WHERE email LIKE '%@demo.venduparmoi'").all();

  if (!force && existing.length > 0) {
    return { created: false, count: existing.length };
  }

  if (existing.length > 0) _deleteDemoAccounts(existing);

  const count = _createDemoAccounts();
  return { created: true, count };
}

/**
 * Retourne un vendeur démo prêt à l'emploi (contrat signé, is_demo=1).
 * Garantit qu'il existe — appelle seedDemoAccounts si nécessaire.
 */
function getDemoSeller() {
  let seller = db.prepare(
    "SELECT * FROM sellers WHERE email LIKE '%@demo.venduparmoi' AND contrat_signe = 1 AND is_demo = 1 LIMIT 1"
  ).get();

  if (!seller) {
    seedDemoAccounts({ force: false });
    seller = db.prepare(
      "SELECT * FROM sellers WHERE email LIKE '%@demo.venduparmoi' AND contrat_signe = 1 AND is_demo = 1 LIMIT 1"
    ).get();
  }

  return seller || null;
}

/**
 * Supprime tous les comptes démo.
 */
function deleteDemoAccounts() {
  const existing = db.prepare("SELECT id FROM sellers WHERE email LIKE '%@demo.venduparmoi'").all();
  if (existing.length) _deleteDemoAccounts(existing);
  return existing.length;
}

module.exports = { seedDemoAccounts, getDemoSeller, deleteDemoAccounts };
