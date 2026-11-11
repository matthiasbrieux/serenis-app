#!/usr/bin/env node
/**
 * MODE DÉMONSTRATION — Visites fictives pour tests locaux
 * =========================================================
 * Usage :
 *   node scripts/demo-visits.js add     → insérer les visites démo
 *   node scripts/demo-visits.js remove  → supprimer toutes les visites démo
 *   node scripts/demo-visits.js status  → afficher l'état actuel
 *
 * Sécurité :
 *   - Refusé si NODE_ENV=production
 *   - Les visites démo sont identifiées par "[DEMO]" dans buyer_name
 *   - Aucun email ni SMS n'est déclenché (insertion DB directe)
 *   - Les vraies visites ne sont jamais modifiées ni supprimées
 */

'use strict';

// ── Garde production ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('DEMO MODE INTERDIT EN PRODUCTION (NODE_ENV=production)');
  process.exit(1);
}

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ── Connexion DB ────────────────────────────────────────────────────────────
const DB_PATH = path.resolve(
  process.env.DATABASE_URL || path.join(__dirname, '..', 'database.db')
);

if (!fs.existsSync(DB_PATH)) {
  console.error(`Base de données introuvable : ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);

// ── Résolution seller + propriété ──────────────────────────────────────────
const SELLER_EMAIL = 'matthiasbrieux260598@gmail.com';

const seller = db.prepare(
  'SELECT id, first_name, email FROM sellers WHERE email = ? LIMIT 1'
).get(SELLER_EMAIL);

if (!seller) {
  console.error(`Seller introuvable : ${SELLER_EMAIL}`);
  process.exit(1);
}

const property = db.prepare(
  'SELECT id, address FROM properties WHERE seller_id = ? LIMIT 1'
).get(seller.id);

if (!property) {
  console.error(`Aucune propriété pour seller_id=${seller.id}`);
  process.exit(1);
}

const SELLER_ID   = seller.id;
const PROPERTY_ID = property.id;
const DEMO_TAG    = '[DEMO]';

// ── Jeu de données ──────────────────────────────────────────────────────────
// Référence : aujourd'hui = 2026-11-03
// J-1 = 2026-11-04

const DEMO_VISITS = [

  // ── 3 Programmées — status='pending', en attente de confirmation vendeur ──
  {
    buyer_name: 'Julien Martin [DEMO]',
    buyer_email: 'julien.martin.demo@example.com',
    buyer_phone: '06 11 00 01 01',
    visit_date: '2026-11-10', visit_time: '09:00',
    status: 'pending', sms_copied_at: null, reminder_sent: 0,
    notes: 'Démo — premier contact, intéressé par le quartier',
    buyer_budget: '280000', buyer_financing: 'Crédit', buyer_timeline: '3 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Nadia Benali [DEMO]',
    buyer_email: 'nadia.benali.demo@example.com',
    buyer_phone: '06 11 00 01 02',
    visit_date: '2026-11-13', visit_time: '11:00',
    status: 'pending', sms_copied_at: null, reminder_sent: 0,
    notes: 'Démo — couple, budget 320k, cherche dans ce quartier',
    buyer_budget: '320000', buyer_financing: 'Apport', buyer_timeline: '6 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Hugo Perrin [DEMO]',
    buyer_email: 'hugo.perrin.demo@example.com',
    buyer_phone: '06 11 00 01 03',
    visit_date: '2026-11-17', visit_time: '15:00',
    status: 'pending', sms_copied_at: null, reminder_sent: 0,
    notes: 'Démo — famille avec 2 enfants, priorité au rez-de-chaussée',
    buyer_budget: null, buyer_financing: null, buyer_timeline: null,
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },

  // ── 3 Confirmées — status='confirmed', SMS à copier (sms_copied_at=null) ──
  {
    buyer_name: 'Aurélie Dupont [DEMO]',
    buyer_email: 'aurelie.dupont.demo@example.com',
    buyer_phone: '06 11 00 02 01',
    visit_date: '2026-11-08', visit_time: '10:00',
    status: 'confirmed', sms_copied_at: null, reminder_sent: 0,
    notes: 'Démo — confirmée verbalement, SMS de confirmation à envoyer',
    buyer_budget: '260000', buyer_financing: 'Crédit', buyer_timeline: '4 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Sébastien Leroy [DEMO]',
    buyer_email: 'sebastien.leroy.demo@example.com',
    buyer_phone: '06 11 00 02 02',
    visit_date: '2026-11-11', visit_time: '14:00',
    status: 'confirmed', sms_copied_at: null, reminder_sent: 0,
    notes: 'Démo — investisseur, déjà visité un bien similaire',
    buyer_budget: '350000', buyer_financing: 'Cash', buyer_timeline: '2 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Céline Moreau [DEMO]',
    buyer_email: 'celine.moreau.demo@example.com',
    buyer_phone: '06 11 00 02 03',
    visit_date: '2026-11-15', visit_time: '10:00',
    status: 'confirmed', sms_copied_at: null, reminder_sent: 0,
    notes: 'Démo — primo-accédant, financement en cours de validation',
    buyer_budget: '240000', buyer_financing: 'Crédit', buyer_timeline: '5 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },

  // ── 2 Rappel J-1 — confirmed, SMS envoyé, rappel à faire (date demain) ───
  {
    buyer_name: 'Véronique Simon [DEMO]',
    buyer_email: 'veronique.simon.demo@example.com',
    buyer_phone: '06 11 00 03 01',
    visit_date: '2026-11-04', visit_time: '09:00',
    status: 'confirmed',
    sms_copied_at: '2026-11-02T09:00:00.000Z',
    reminder_sent: 0,
    notes: 'Démo — visite demain matin, rappel J-1 à effectuer',
    buyer_budget: '295000', buyer_financing: 'Crédit', buyer_timeline: '3 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Antoine Gérard [DEMO]',
    buyer_email: 'antoine.gerard.demo@example.com',
    buyer_phone: '06 11 00 03 02',
    visit_date: '2026-11-04', visit_time: '14:00',
    status: 'confirmed',
    sms_copied_at: '2026-11-02T14:00:00.000Z',
    reminder_sent: 0,
    notes: 'Démo — visite demain après-midi, rappel J-1 à effectuer',
    buyer_budget: '310000', buyer_financing: 'Apport + Crédit', buyer_timeline: '4 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },

  // ── 2 Confirmées 100% — sms_copied_at + reminder_sent=1 ──────────────────
  {
    buyer_name: 'Laurent Fontaine [DEMO]',
    buyer_email: 'laurent.fontaine.demo@example.com',
    buyer_phone: '06 11 00 04 01',
    visit_date: '2026-11-06', visit_time: '10:00',
    status: 'confirmed',
    sms_copied_at: '2026-11-03T08:00:00.000Z',
    reminder_sent: 1,
    notes: 'Démo — confirmation + rappel effectués, tout est ok',
    buyer_budget: '275000', buyer_financing: 'Crédit', buyer_timeline: '3 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Isabelle Renard [DEMO]',
    buyer_email: 'isabelle.renard.demo@example.com',
    buyer_phone: '06 11 00 04 02',
    visit_date: '2026-11-09', visit_time: '16:00',
    status: 'confirmed',
    sms_copied_at: '2026-11-01T10:00:00.000Z',
    reminder_sent: 1,
    notes: 'Démo — très motivée, a déjà visité 3 biens dans le secteur',
    buyer_budget: '330000', buyer_financing: 'Apport', buyer_timeline: '2 mois',
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
  },

  // ── 3 Visites passées — status='done', états de relance variés ───────────
  {
    buyer_name: 'Marc Petit [DEMO]',
    buyer_email: 'marc.petit.demo@example.com',
    buyer_phone: '06 11 00 05 01',
    visit_date: '2026-10-28', visit_time: '10:00',
    status: 'done',
    sms_copied_at: '2026-10-27T08:00:00.000Z',
    reminder_sent: 1,
    notes: 'Démo — visite effectuée, relance J+1 à envoyer',
    followup_sent_at: null,         // relance en attente
    skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Claire Lambert [DEMO]',
    buyer_email: 'claire.lambert.demo@example.com',
    buyer_phone: '06 11 00 05 02',
    visit_date: '2026-10-25', visit_time: '14:00',
    status: 'done',
    sms_copied_at: '2026-10-24T10:00:00.000Z',
    reminder_sent: 1,
    notes: 'Démo — visite effectuée, relance envoyée et reçue',
    followup_sent_at: '2026-10-26T10:00:00.000Z',  // relance déjà envoyée
    skip_reason: null, skip_comment: null, skipped_at: null,
  },
  {
    buyer_name: 'Émilie Bernard [DEMO]',
    buyer_email: 'emilie.bernard.demo@example.com',
    buyer_phone: '06 11 00 05 03',
    visit_date: '2026-10-20', visit_time: '11:00',
    status: 'done',
    sms_copied_at: '2026-10-19T09:00:00.000Z',
    reminder_sent: 1,
    notes: 'Démo — a indiqué ne pas donner suite',
    followup_sent_at: null,
    skip_reason: 'not_interested',
    skip_comment: 'Trop petit pour leurs besoins. Cherchent au moins 90m².',
    skipped_at: '2026-10-21T11:00:00.000Z',
  },
];

// ── Commandes ───────────────────────────────────────────────────────────────

function cmdStatus() {
  const rows = db.prepare(
    "SELECT id, buyer_name, visit_date, visit_time, status, sms_copied_at, reminder_sent, followup_sent_at, skip_reason FROM visits WHERE seller_id = ? AND buyer_name LIKE ? ORDER BY visit_date, visit_time"
  ).all(SELLER_ID, `%${DEMO_TAG}%`);

  if (rows.length === 0) {
    console.log('Aucune visite démo en base.');
    return;
  }

  console.log(`\n${rows.length} visite(s) démo pour seller ${seller.first_name} (id=${SELLER_ID}) — ${property.address}\n`);

  const cats = {
    pending:     rows.filter(r => r.status === 'pending'),
    scheduled:   rows.filter(r => r.status === 'confirmed' && !r.sms_copied_at),
    rappel:      rows.filter(r => r.status === 'confirmed' && r.sms_copied_at && !r.reminder_sent),
    full:        rows.filter(r => r.status === 'confirmed' && r.sms_copied_at && r.reminder_sent),
    past:        rows.filter(r => r.status === 'done'),
  };

  const labels = {
    pending:   'Programmées (pending)',
    scheduled: 'Confirmées – SMS à copier',
    rappel:    'Rappel J-1 (SMS copié, rappel à faire)',
    full:      'Confirmées 100%',
    past:      'Passées (done)',
  };

  for (const [key, list] of Object.entries(cats)) {
    console.log(`  ${labels[key]} : ${list.length}`);
    for (const r of list) {
      const extra = r.skip_reason ? '⛔ ne donnera pas suite'
        : r.followup_sent_at ? '✅ relance envoyée'
        : r.status === 'done' ? '⏳ relance à envoyer'
        : '';
      console.log(`    #${r.id} ${r.buyer_name} — ${r.visit_date} ${r.visit_time} ${extra}`);
    }
  }
  console.log();
}

function cmdAdd() {
  const existing = db.prepare(
    "SELECT COUNT(*) AS n FROM visits WHERE seller_id = ? AND buyer_name LIKE ?"
  ).get(SELLER_ID, `%${DEMO_TAG}%`);

  if (existing.n > 0) {
    console.log(`${existing.n} visite(s) démo déjà présente(s). Exécutez d'abord 'remove' pour les supprimer.`);
    cmdStatus();
    return;
  }

  const insert = db.prepare(`
    INSERT INTO visits (
      property_id, seller_id, buyer_name, buyer_email, buyer_phone,
      visit_date, visit_time, status, sms_copied_at, reminder_sent, notes,
      buyer_budget, buyer_financing, buyer_timeline,
      followup_sent_at, skip_reason, skip_comment, skipped_at
    ) VALUES (
      @property_id, @seller_id, @buyer_name, @buyer_email, @buyer_phone,
      @visit_date, @visit_time, @status, @sms_copied_at, @reminder_sent, @notes,
      @buyer_budget, @buyer_financing, @buyer_timeline,
      @followup_sent_at, @skip_reason, @skip_comment, @skipped_at
    )
  `);

  const defaults = {
    buyer_budget: null, buyer_financing: null, buyer_timeline: null,
    followup_sent_at: null, skip_reason: null, skip_comment: null, skipped_at: null,
    sms_copied_at: null, reminder_sent: 0, notes: null,
  };

  const insertAll = db.transaction(visits => {
    for (const v of visits) {
      insert.run({ ...defaults, ...v, property_id: PROPERTY_ID, seller_id: SELLER_ID });
    }
  });

  try {
    insertAll(DEMO_VISITS);
    console.log(`\n✓ ${DEMO_VISITS.length} visites démo insérées pour ${seller.first_name} (${SELLER_EMAIL})\n`);
    cmdStatus();
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.error('Conflit de créneau — un créneau démo entre en collision avec une vraie visite.');
      console.error(err.message);
    } else {
      console.error('Erreur lors de l\'insertion :', err.message);
    }
    process.exit(1);
  }
}

function cmdRemove() {
  const result = db.prepare(
    "DELETE FROM visits WHERE seller_id = ? AND buyer_name LIKE ?"
  ).run(SELLER_ID, `%${DEMO_TAG}%`);

  if (result.changes === 0) {
    console.log('Aucune visite démo à supprimer.');
  } else {
    console.log(`✓ ${result.changes} visite(s) démo supprimée(s).`);
  }
}

// ── Dispatch commande ───────────────────────────────────────────────────────
const cmd = process.argv[2];

switch (cmd) {
  case 'add':    cmdAdd();    break;
  case 'remove': cmdRemove(); break;
  case 'status': cmdStatus(); break;
  default:
    console.log('Usage : node scripts/demo-visits.js add|remove|status');
    process.exit(1);
}
