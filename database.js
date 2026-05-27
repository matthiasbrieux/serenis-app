const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_URL || './database.db';
const db = new Database(path.resolve(DB_PATH));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    pack TEXT NOT NULL DEFAULT 'autonome',
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    twilio_number TEXT,
    twilio_number_sid TEXT
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    slug TEXT UNIQUE,
    status TEXT DEFAULT 'preparation',
    type TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    surface_habitable REAL,
    surface_terrain REAL,
    rooms INTEGER,
    bedrooms INTEGER,
    year_built INTEGER,
    heating_type TEXT,
    heating_year INTEGER,
    dpe_class TEXT,
    taxe_fonciere INTEGER,
    exposition TEXT,
    garden BOOLEAN DEFAULT 0,
    terrace BOOLEAN DEFAULT 0,
    commerces TEXT,
    school_maternelle TEXT,
    school_primaire TEXT,
    school_college TEXT,
    school_lycee TEXT,
    highway TEXT,
    train_station TEXT,
    equipment TEXT,
    sale_reason TEXT,
    price INTEGER,
    description TEXT,
    virtual_tour_url TEXT,
    published BOOLEAN DEFAULT 0,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS property_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    cloudinary_id TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS property_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    name TEXT NOT NULL,
    cloudinary_id TEXT,
    url TEXT NOT NULL,
    doc_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agenda_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    day_of_week INTEGER,
    specific_date TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_recurring BOOLEAN DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    visit_date TEXT NOT NULL,
    visit_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    reminder_sent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS buyer_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    buyer_phone TEXT,
    buyer_email TEXT,
    dossier_sent BOOLEAN DEFAULT 0,
    dossier_sent_at DATETIME,
    source TEXT DEFAULT 'sms',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS checklist_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    checklist_type TEXT NOT NULL,
    item_index INTEGER NOT NULL,
    checked BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seller_id, checklist_type, item_index)
  );

  CREATE TABLE IF NOT EXISTS contact_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    offer TEXT,
    city TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS property_publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    platform TEXT NOT NULL,
    url TEXT,
    active BOOLEAN DEFAULT 1,
    published_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS property_performances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    platform TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    favorites INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    visits_done INTEGER DEFAULT 0,
    offers INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seller_id, platform)
  );
`);

// ── Table gestion des numéros IA ──────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS phone_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    provider TEXT DEFAULT 'Twilio',
    notes TEXT,
    seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME
  );
`);

// Migrations: add columns not in original CREATE TABLE
const newCols = [
  "ALTER TABLE properties ADD COLUMN heating_mechanism TEXT",
  "ALTER TABLE properties ADD COLUMN hauteur_plafond REAL",
  "ALTER TABLE properties ADD COLUMN assainissement_type TEXT",
  "ALTER TABLE properties ADD COLUMN certificat_assainissement BOOLEAN DEFAULT 0",
  "ALTER TABLE properties ADD COLUMN toiture_couverture TEXT",
  "ALTER TABLE properties ADD COLUMN volets_type TEXT",
  "ALTER TABLE properties ADD COLUMN sols_dalle TEXT",
  "ALTER TABLE properties ADD COLUMN stationnement_type TEXT",
  "ALTER TABLE properties ADD COLUMN mitoyennete TEXT",
  "ALTER TABLE properties ADD COLUMN heating_details TEXT",
  "ALTER TABLE properties ADD COLUMN garage_motorise TEXT",
  "ALTER TABLE properties ADD COLUMN garage_sol TEXT",
  "ALTER TABLE properties ADD COLUMN garage_surface REAL",
  "ALTER TABLE properties ADD COLUMN terrace_revetement TEXT",
  "ALTER TABLE properties ADD COLUMN terrace_surface REAL",
  "ALTER TABLE properties ADD COLUMN fenetres_type TEXT",
  "ALTER TABLE properties ADD COLUMN cheminee_type TEXT",
  "ALTER TABLE properties ADD COLUMN eau_chaude_type TEXT",
  "ALTER TABLE properties ADD COLUMN wc_count INTEGER DEFAULT 1",
  "ALTER TABLE properties ADD COLUMN cuisine_type TEXT",
  "ALTER TABLE properties ADD COLUMN grenier TEXT",
  "ALTER TABLE properties ADD COLUMN dpe_conso_energie REAL",
  "ALTER TABLE properties ADD COLUMN dpe_ges REAL",
  "ALTER TABLE properties ADD COLUMN dpe_cout_min INTEGER",
  "ALTER TABLE properties ADD COLUMN dpe_cout_max INTEGER",
  "ALTER TABLE properties ADD COLUMN facture_eau INTEGER",
  "ALTER TABLE properties ADD COLUMN facture_electricite INTEGER",
  "ALTER TABLE properties ADD COLUMN facture_gaz INTEGER",
  "ALTER TABLE properties ADD COLUMN grenier_present BOOLEAN DEFAULT 0",
  "ALTER TABLE sellers ADD COLUMN contrat_signe BOOLEAN DEFAULT 0",
  "ALTER TABLE sellers ADD COLUMN rdv_photographe BOOLEAN DEFAULT 0",
  "ALTER TABLE sellers ADD COLUMN admin_notes TEXT",
];
newCols.forEach(sql => { try { db.exec(sql); } catch(e) {} });

module.exports = db;
