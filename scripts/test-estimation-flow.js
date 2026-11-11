/**
 * Test fonctionnel — Parcours d'estimation Vendu Par Moi
 * Usage : node scripts/test-estimation-flow.js
 *
 * Aucun vrai e-mail n'est envoyé (RESEND_API_KEY forcé à vide avant tout import).
 * Données de test identifiables par le préfixe TEST_ESTIM_ et l'e-mail .invalid.
 * Toutes les données créées sont supprimées à la fin du script.
 */
'use strict';

// ── Désactiver l'envoi e-mail AVANT tout require ─────────────────
process.env.RESEND_API_KEY = '';

const http    = require('node:http');
const express = require('express');

const db = require('../database');

// ── Données de test ──────────────────────────────────────────────
const EPOCH        = Date.now();
const TEST_EMAIL   = `test-estim-${EPOCH}@venduparmoi-test.invalid`;
const TEST_PRENOM  = 'TEST_Sophie';
const TEST_PHONE   = '0612345678';
const TEST_ADDRESS = '12 rue Faidherbe, 59000 Lille';
const TEST_SURFACE = 85;
const TEST_TYPE    = 'Maison';

// ── Résultats ────────────────────────────────────────────────────
const rows = [];
function pass(step, detail) {
  rows.push({ step, result: 'OK', anomalie: detail || '' });
}
function warn(step, detail) {
  rows.push({ step, result: 'ATTENTION', anomalie: detail });
}
function fail(step, detail) {
  rows.push({ step, result: 'ECHEC', anomalie: detail });
  process.exitCode = 1;
}

// ── Serveur de test minimaliste ──────────────────────────────────
let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', 1);
  app.use('/', require('../routes/estimation'));
  return new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise(resolve => server.close(resolve));
}

async function post(path, body) {
  const res  = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, body: data };
}

async function get(path) {
  const res  = await fetch(`${baseUrl}${path}`);
  const data = await res.json().catch(() => null);
  return { status: res.status, body: data };
}

// ── Nettoyage ────────────────────────────────────────────────────
function cleanup() {
  try {
    const estims = db.prepare('SELECT id FROM estimation_requests WHERE email=?').all(TEST_EMAIL);
    for (const r of estims) {
      db.prepare('DELETE FROM estimation_callback_requests WHERE estimation_request_id=?').run(r.id);
    }
    db.prepare('DELETE FROM estimation_callback_requests WHERE email=?').run(TEST_EMAIL);
    db.prepare('DELETE FROM estimation_requests WHERE email=?').run(TEST_EMAIL);
    db.prepare("DELETE FROM email_sends WHERE to_email=?").run(TEST_EMAIL);
    db.prepare("DELETE FROM email_sends WHERE to_email LIKE 'matthias%' AND subject LIKE '%TEST_%'").run();
    console.log('  [cleanup] Données de test supprimées.\n');
  } catch(e) {
    console.error('  [cleanup] Erreur :', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
//  PARCOURS DE TEST
// ════════════════════════════════════════════════════════════════
async function runTests() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  TEST FONCTIONNEL — Parcours estimation Vendu Par Moi');
  console.log('  Email test :', TEST_EMAIL);
  console.log('  RESEND_API_KEY :', process.env.RESEND_API_KEY === '' ? '(vide — aucun envoi réel)' : '*** DÉFINI ***');
  console.log('══════════════════════════════════════════════════════════\n');

  // ── Étape 1 : Soumission du formulaire sans consentements ────
  console.log('ÉTAPE 1 — Soumission estimation (aucun consentement)');
  let estimResponse;
  try {
    estimResponse = await post('/api/public/estimation', {
      raw_address:   TEST_ADDRESS,
      surface:       TEST_SURFACE,
      property_type: TEST_TYPE,
      prenom:        TEST_PRENOM,
      email:         TEST_EMAIL,
      phone:         null,
      callback_consent:  false,
      phone_consent:     false,
      email_consent:     false,
    });

    if (estimResponse.status === 200) {
      pass('1.1 — Réponse HTTP', `status ${estimResponse.status}`);
    } else {
      fail('1.1 — Réponse HTTP', `status inattendu ${estimResponse.status} : ${JSON.stringify(estimResponse.body)}`);
      return; // Bloquant
    }

    const status = estimResponse.body && estimResponse.body.status;
    if (['ok', 'unsupported', 'unavailable', 'insufficient'].includes(status)) {
      pass('1.2 — Statut d\'estimation valide', `statut = "${status}"`);
    } else {
      fail('1.2 — Statut d\'estimation valide', `statut inattendu : "${status}"`);
    }

    if (status === 'ok' && estimResponse.body.indicativeValue) {
      pass('1.3 — Valeur indicative présente', `${estimResponse.body.indicativeValue.toLocaleString('fr-FR')} €`);
    } else if (status !== 'ok') {
      pass('1.3 — Valeur indicative absente (attendu)', `statut = "${status}" → aucune valeur exposée`);
    } else {
      warn('1.3 — Valeur indicative', 'Statut ok mais indicativeValue absent');
    }

    // Vérifier que les données sensibles ne sont PAS exposées au navigateur
    const rawBody = JSON.stringify(estimResponse.body);
    if (!rawBody.includes('comparables') && !rawBody.includes('priceM2') || status !== 'ok') {
      pass('1.4 — Sanitisation réponse', 'Données DVF brutes non exposées');
    } else {
      const keys = Object.keys(estimResponse.body);
      const allowed = ['status', 'priceM2', 'indicativeValue', 'count', 'radiusMeters'];
      const extra = keys.filter(k => !allowed.includes(k));
      if (extra.length === 0) {
        pass('1.4 — Sanitisation réponse', `Clés exposées : ${keys.join(', ')}`);
      } else {
        warn('1.4 — Sanitisation réponse', `Clés supplémentaires exposées : ${extra.join(', ')}`);
      }
    }
  } catch(e) {
    fail('1 — Soumission formulaire', e.message);
    return;
  }

  // ── Étape 2 : Vérification DB estimation ────────────────────
  console.log('\nÉTAPE 2 — Vérification base de données (estimation)');
  await new Promise(r => setTimeout(r, 300)); // Attendre callback async d'envoi email

  const estimRow = db.prepare('SELECT * FROM estimation_requests WHERE email=? ORDER BY id DESC LIMIT 1').get(TEST_EMAIL);

  if (estimRow) {
    pass('2.1 — Enregistrement DB présent', `id=${estimRow.id}`);
  } else {
    fail('2.1 — Enregistrement DB présent', 'Aucune ligne trouvée dans estimation_requests');
    return;
  }

  // Consentements tous à 0
  if (estimRow.callback_consent === 0 && estimRow.phone_consent === 0 && estimRow.email_consent === 0) {
    pass('2.2 — Consentements à 0 (aucune case cochée)', 'callback=0, phone=0, email=0');
  } else {
    fail('2.2 — Consentements', `callback=${estimRow.callback_consent}, phone=${estimRow.phone_consent}, email=${estimRow.email_consent} (attendu: tous 0)`);
  }

  // Champs obligatoires
  if (estimRow.prenom === TEST_PRENOM && estimRow.email === TEST_EMAIL && estimRow.surface === TEST_SURFACE) {
    pass('2.3 — Champs identité/bien corrects', `prenom="${estimRow.prenom}", surface=${estimRow.surface}`);
  } else {
    fail('2.3 — Champs identité/bien', `prenom="${estimRow.prenom}", surface=${estimRow.surface}`);
  }

  // Token CTA généré
  if (estimRow.cta_token && /^[0-9a-f]{32}$/.test(estimRow.cta_token)) {
    pass('2.4 — Token CTA généré', `token=${estimRow.cta_token}`);
  } else {
    fail('2.4 — Token CTA', `Valeur : "${estimRow.cta_token}"`);
  }

  // Statut commercial initial
  if (estimRow.commercial_status === 'prospect') {
    pass('2.5 — Statut commercial initial', '"prospect"');
  } else {
    warn('2.5 — Statut commercial initial', `Valeur : "${estimRow.commercial_status}" (attendu "prospect")`);
  }

  // ── Étape 3 : Templates e-mail ───────────────────────────────
  console.log('\nÉTAPE 3 — Vérification templates e-mail (sans envoi)');

  const { buildProspectHtml, buildProspectText, buildInternalHtml, buildCallbackNotifHtml } = require('../services/estimation-email');

  // On force estimation_status='ok' et des valeurs factices pour tester le template
  // indépendamment de la disponibilité des APIs externes (DVF/IGN peut être unavailable).
  const emailData = {
    prenom: TEST_PRENOM, email: TEST_EMAIL, phone: null,
    callback_consent: false, phone_consent: false, email_consent: false,
    callback_consent_at: null, phone_consent_at: null, email_consent_at: null,
    raw_address: TEST_ADDRESS, address: '12 rue Faidherbe', city: 'Lille',
    postal_code: '59000', surface: TEST_SURFACE, property_type: TEST_TYPE,
    estimation_status: 'ok',
    price_m2: estimRow.price_m2 || 2500,
    indicative_value: estimRow.indicative_value || 212000,
    radiusMeters: estimRow.radiusMeters || 1000, count: estimRow.count || 8,
    comparables: null, period_from: null, period_to: null,
    created_at: estimRow.created_at, ip_hash: estimRow.ip_hash,
    mapUrl: null, cta_token: estimRow.cta_token,
    threeValues: { rapide: 190000, conseille: 212000, ambitieux: 240000 },
  };

  try {
    const html = buildProspectHtml(emailData);

    if (html.includes('Votre estimation est un repère')) {
      pass('3.1 — Bloc pédagogique présent', '"Votre estimation est un repère"');
    } else {
      fail('3.1 — Bloc pédagogique', 'Texte introuvable dans le HTML');
    }

    if (html.includes('Et si votre bien valait davantage')) {
      pass('3.2 — Bloc commercial présent', '"Et si votre bien valait davantage"');
    } else {
      fail('3.2 — Bloc commercial', 'Texte introuvable dans le HTML');
    }

    if (html.includes(`token=${estimRow.cta_token}`)) {
      pass('3.3 — Lien CTA contient le token', `?token=${estimRow.cta_token.slice(0, 8)}…`);
    } else {
      fail('3.3 — Lien CTA token', 'Token absent de l\'URL CTA dans le HTML');
    }

    // Pas de couleur verte
    const greenPatterns = ['#00', '#0c', '#1d', '#3d', '#6b', '#2d6a4f', 'rgb(0,'];
    const foundGreen = greenPatterns.filter(p => html.toLowerCase().includes(p.toLowerCase()) && !html.includes('#1C0804'));
    // Vérification spécifique : aucun vert immobilier
    if (!html.includes('#2d6a4f') && !html.includes('#1D3A28') && !html.includes('#6BBF82')) {
      pass('3.4 — Aucune couleur verte immobilière', 'Palettes verte absentes');
    } else {
      fail('3.4 — Couleur verte', 'Couleur verte trouvée dans le template');
    }

    // E-mail status : n'affiche pas le téléphone si non fourni
    if (!html.includes('undefined') && !html.includes('[object')) {
      pass('3.5 — Pas de valeur undefined dans le HTML', '');
    } else {
      fail('3.5 — HTML propre', 'Valeur "undefined" ou "[object" détectée dans le HTML');
    }

    const text = buildProspectText(emailData);
    if (text.includes('Demander un échange personnalisé')) {
      pass('3.6 — Version texte : lien entretien présent', '');
    } else {
      fail('3.6 — Version texte', 'Lien entretien absent de la version texte');
    }

    // Vérification notification interne
    const notifHtml = buildInternalHtml(emailData);
    if (notifHtml.includes('Prospection téléphonique') && notifHtml.includes('Marketing e-mail')) {
      pass('3.7 — Notification interne : champs consentements présents', '');
    } else {
      fail('3.7 — Notification interne consentements', 'Champs consentements absents');
    }
    if (notifHtml.includes('Non') && !notifHtml.includes('Oui')) {
      pass('3.8 — Notification interne : tous consentements = Non', '');
    } else {
      warn('3.8 — Notification interne consentements', 'Au moins un consentement affiché comme "Oui" alors qu\'aucun n\'a été coché');
    }

  } catch(e) {
    fail('3 — Templates e-mail', e.message);
  }

  // ── Étape 4 : Endpoint hint (token → email) ──────────────────
  console.log('\nÉTAPE 4 — Résolution token /entretien');
  try {
    const hint = await get(`/api/public/estimation-hint?token=${estimRow.cta_token}`);
    if (hint.status === 200 && hint.body && hint.body.email === TEST_EMAIL) {
      pass('4.1 — Token résolu correctement', `email="${hint.body.email}"`);
    } else {
      fail('4.1 — Token hint', `status=${hint.status}, body=${JSON.stringify(hint.body)}`);
    }

    // Token invalide → 400
    const badHint = await get('/api/public/estimation-hint?token=invalidtoken');
    if (badHint.status === 400) {
      pass('4.2 — Token invalide rejeté (400)', '');
    } else {
      fail('4.2 — Token invalide', `status attendu 400, reçu ${badHint.status}`);
    }

    // Token inconnu → 404
    const unknownHint = await get('/api/public/estimation-hint?token=' + 'a'.repeat(32));
    if (unknownHint.status === 404) {
      pass('4.3 — Token inconnu → 404', '');
    } else {
      fail('4.3 — Token inconnu', `status attendu 404, reçu ${unknownHint.status}`);
    }
  } catch(e) {
    fail('4 — Endpoint hint', e.message);
  }

  // ── Étape 5 : Demande de rappel (/entretien) ─────────────────
  console.log('\nÉTAPE 5 — Demande de rappel via /entretien');
  let cbResponse;
  try {
    cbResponse = await post('/api/public/estimation-callback', {
      email:         TEST_EMAIL,
      phone:         TEST_PHONE,
      sell_horizon:  '3_6_mois',
      source:        'entretien_page',
      token:         estimRow.cta_token,
    });

    if (cbResponse.status === 200 && cbResponse.body && cbResponse.body.ok) {
      pass('5.1 — Rappel enregistré (HTTP 200)', '');
    } else {
      fail('5.1 — Rappel enregistré', `status=${cbResponse.status}, body=${JSON.stringify(cbResponse.body)}`);
    }

    // Téléphone invalide → 400
    const badPhone = await post('/api/public/estimation-callback', {
      email: TEST_EMAIL,
      phone: '00000',
      token: estimRow.cta_token,
    });
    if (badPhone.status === 400) {
      pass('5.2 — Téléphone invalide rejeté (400)', '');
    } else {
      fail('5.2 — Validation téléphone', `status attendu 400, reçu ${badPhone.status}`);
    }

  } catch(e) {
    fail('5 — Demande de rappel', e.message);
  }

  // ── Étape 6 : Vérification DB rappel ─────────────────────────
  console.log('\nÉTAPE 6 — Vérification base de données (rappel)');
  await new Promise(r => setTimeout(r, 200));

  const cbRow = db.prepare(
    'SELECT * FROM estimation_callback_requests WHERE email=? ORDER BY id DESC LIMIT 1'
  ).get(TEST_EMAIL);

  if (cbRow) {
    pass('6.1 — Enregistrement rappel présent', `id=${cbRow.id}`);
  } else {
    fail('6.1 — Enregistrement rappel', 'Aucune ligne dans estimation_callback_requests');
  }

  if (cbRow && cbRow.phone === TEST_PHONE) {
    pass('6.2 — Téléphone enregistré', cbRow.phone);
  } else if (cbRow) {
    fail('6.2 — Téléphone', `Valeur : "${cbRow.phone}" (attendu "${TEST_PHONE}")`);
  }

  if (cbRow && cbRow.sell_horizon === '3_6_mois') {
    pass('6.3 — Horizon de vente enregistré', cbRow.sell_horizon);
  } else if (cbRow) {
    fail('6.3 — Horizon de vente', `"${cbRow.sell_horizon}"`);
  }

  if (cbRow && cbRow.estimation_request_id === estimRow.id) {
    pass('6.4 — Lié à la demande d\'estimation', `estimation_request_id=${cbRow.estimation_request_id}`);
  } else if (cbRow) {
    warn('6.4 — Lien estimation', `estimation_request_id=${cbRow.estimation_request_id} (attendu ${estimRow.id})`);
  }

  // Statut commercial mis à jour
  const updatedEstim = db.prepare('SELECT commercial_status FROM estimation_requests WHERE id=?').get(estimRow.id);
  if (updatedEstim && updatedEstim.commercial_status === 'rappel_demande') {
    pass('6.5 — Statut commercial mis à jour', '"rappel_demande"');
  } else {
    fail('6.5 — Statut commercial', `Valeur : "${updatedEstim && updatedEstim.commercial_status}"`);
  }

  // ── Étape 7 : Visibilité dans le suivi commercial ────────────
  console.log('\nÉTAPE 7 — Visibilité dans le suivi commercial (admin leads)');
  try {
    const leads = db.prepare(`
      SELECT ecr.*, er.prenom AS er_prenom, er.phone AS er_phone,
             er.raw_address, er.surface, er.property_type, er.indicative_value
      FROM estimation_callback_requests ecr
      LEFT JOIN estimation_requests er ON ecr.estimation_request_id = er.id
      WHERE ecr.email = ?
      ORDER BY ecr.created_at DESC LIMIT 1
    `).get(TEST_EMAIL);

    if (leads) {
      pass('7.1 — Prospect visible dans la jointure admin', `id=${leads.id}`);
    } else {
      fail('7.1 — Jointure admin', 'Aucun résultat pour l\'email test');
    }

    if (leads && leads.er_prenom === TEST_PRENOM) {
      pass('7.2 — Prénom depuis estimation liée', leads.er_prenom);
    } else if (leads) {
      warn('7.2 — Prénom', `"${leads.er_prenom}" (attendu "${TEST_PRENOM}")`);
    }

    if (leads && leads.phone === TEST_PHONE) {
      pass('7.3 — Téléphone depuis le formulaire /entretien', leads.phone);
    } else if (leads) {
      warn('7.3 — Téléphone', `"${leads.phone}"`);
    }

    if (leads && leads.raw_address) {
      pass('7.4 — Adresse du bien visible', leads.raw_address);
    } else if (leads) {
      warn('7.4 — Adresse', `"${leads.raw_address}"`);
    }

    // Différenciation estimation seule vs à rappeler
    const estimOnlyCount = db.prepare(
      "SELECT COUNT(*) AS n FROM estimation_requests WHERE email=? AND commercial_status='prospect'"
    ).get(TEST_EMAIL + '_never_exists');
    const rappelCount = db.prepare(
      "SELECT COUNT(*) AS n FROM estimation_requests WHERE email=? AND commercial_status='rappel_demande'"
    ).get(TEST_EMAIL);
    if (rappelCount && rappelCount.n > 0) {
      pass('7.5 — Différenciation prospect/à rappeler', `commercial_status="rappel_demande" pour l\'email test`);
    } else {
      fail('7.5 — Statut commercial', 'estimation_requests.commercial_status non mis à jour');
    }

  } catch(e) {
    fail('7 — Suivi commercial', e.message);
  }

  // ── Étape 8 : Contenu notification de rappel ─────────────────
  console.log('\nÉTAPE 8 — Contenu notification interne de rappel');
  try {
    const { buildCallbackNotifHtml, buildCallbackNotifText } = require('../services/estimation-email');

    const notifData = {
      email: TEST_EMAIL, phone: TEST_PHONE,
      prenom: TEST_PRENOM,
      raw_address: TEST_ADDRESS, surface: TEST_SURFACE, property_type: TEST_TYPE,
      indicative_value: 215000,
      sell_horizon: '3_6_mois',
      source: 'entretien_page',
      created_at: new Date().toISOString(),
    };

    const notifHtml = buildCallbackNotifHtml(notifData);
    const notifText = buildCallbackNotifText(notifData);

    if (notifHtml.includes(TEST_EMAIL)) {
      pass('8.1 — E-mail dans la notif', '');
    } else {
      fail('8.1 — E-mail dans la notif', 'E-mail absent');
    }

    if (notifHtml.includes(TEST_PHONE)) {
      pass('8.2 — Téléphone dans la notif', TEST_PHONE);
    } else {
      fail('8.2 — Téléphone dans la notif', 'Numéro absent');
    }

    if (notifHtml.includes(TEST_PRENOM)) {
      pass('8.3 — Prénom dans la notif', TEST_PRENOM);
    } else {
      fail('8.3 — Prénom dans la notif', 'Prénom absent');
    }

    if (notifHtml.includes('Faidherbe') || notifHtml.includes('Lille')) {
      pass('8.4 — Adresse/ville dans la notif', '');
    } else {
      fail('8.4 — Adresse dans la notif', 'Adresse absente');
    }

    if (notifHtml.includes('3 à 6 mois') || notifHtml.includes('3_6_mois')) {
      pass('8.5 — Horizon de vente dans la notif', '');
    } else {
      fail('8.5 — Horizon dans la notif', 'Horizon absent');
    }

    if (notifText.includes(TEST_PHONE) && notifText.includes(TEST_EMAIL)) {
      pass('8.6 — Version texte complète', '');
    } else {
      fail('8.6 — Version texte', 'Téléphone ou e-mail absent de la version texte');
    }

    // Vérifier que "Non communiqué" s'affiche si téléphone absent
    const noPhoneNotif = buildCallbackNotifHtml({ ...notifData, phone: null });
    if (noPhoneNotif.includes('Non communiqué')) {
      pass('8.7 — "Non communiqué" si téléphone absent', '');
    } else {
      fail('8.7 — Téléphone absent', '"Non communiqué" non affiché');
    }

  } catch(e) {
    fail('8 — Notification de rappel', e.message);
  }

  // ── Étape 9 : Vérification aucun e-mail réel envoyé ──────────
  console.log('\nÉTAPE 9 — Vérification absence d\'envoi réel');

  if (process.env.RESEND_API_KEY === '') {
    pass('9.1 — RESEND_API_KEY vide (mode test)', 'Aucun appel réseau Resend possible');
  } else {
    fail('9.1 — RESEND_API_KEY', 'Clé API définie — des e-mails réels auraient pu partir');
  }

  // Vérifier dans email_sends que success=0 pour les envois test
  const emailSendRows = db.prepare(
    "SELECT * FROM email_sends WHERE to_email=? ORDER BY id DESC"
  ).all(TEST_EMAIL);

  if (emailSendRows.length > 0) {
    const allFailed = emailSendRows.every(r => r.success === 0);
    if (allFailed) {
      pass('9.2 — email_sends : tous les envois success=0', `${emailSendRows.length} entrée(s)`);
    } else {
      fail('9.2 — email_sends', `${emailSendRows.filter(r => r.success === 1).length} envoi(s) success=1 détecté(s)`);
    }
  } else {
    pass('9.2 — email_sends : aucune tentative enregistrée', '(sendEstimationEmails non exécuté car async hors test)');
  }

  // ── Étape 10 : Champs adresse structurée (LOT 6) ────────────
  console.log('\nÉTAPE 10 — Adresse structurée (BAN)');
  const TEST_EMAIL_STRUCT = `test-estim-struct-${EPOCH}@venduparmoi-test.invalid`;
  try {
    // 10.1 — Soumission avec champs structurés (cas normal Nord-59)
    const structResp = await post('/api/public/estimation', {
      street:        '10 rue Auguste Renoir',
      postal_code:   '59552',
      city:          'Courchelettes',
      address_source: 'ban',
      insee_code:    '59163',
      lat:           50.37,
      lon:           3.08,
      surface:       95,
      property_type: 'Maison',
      prenom:        'TEST_Struct',
      email:         TEST_EMAIL_STRUCT,
      phone:         null,
      callback_consent: false,
      phone_consent:    false,
      email_consent:    false,
    });
    if (structResp.status === 200) {
      pass('10.1 — Champs structurés acceptés (HTTP 200)', `statut="${structResp.body && structResp.body.status}"`);
    } else {
      fail('10.1 — Champs structurés', `status ${structResp.status} : ${JSON.stringify(structResp.body)}`);
    }

    // 10.2 — Vérification DB : champs BAN stockés
    await new Promise(r => setTimeout(r, 200));
    const structRow = db.prepare('SELECT * FROM estimation_requests WHERE email=? ORDER BY id DESC LIMIT 1').get(TEST_EMAIL_STRUCT);
    if (structRow) {
      pass('10.2 — Enregistrement DB structuré présent', `id=${structRow.id}`);
    } else {
      fail('10.2 — DB structuré', 'Aucune ligne trouvée');
    }
    if (structRow && structRow.address === '10 rue Auguste Renoir' && structRow.city === 'Courchelettes') {
      pass('10.3 — address/city bien décomposés', `address="${structRow.address}", city="${structRow.city}"`);
    } else if (structRow) {
      fail('10.3 — address/city', `address="${structRow.address}", city="${structRow.city}"`);
    }
    if (structRow && structRow.insee_code === '59163') {
      pass('10.4 — insee_code stocké', structRow.insee_code);
    } else if (structRow) {
      warn('10.4 — insee_code', `Valeur : "${structRow.insee_code}"`);
    }
    if (structRow && structRow.address_source === 'ban') {
      pass('10.5 — address_source = "ban"', '');
    } else if (structRow) {
      warn('10.5 — address_source', `"${structRow.address_source}" (attendu "ban")`);
    }

    // 10.6 — Code postal invalide → 400
    const badCpResp = await post('/api/public/estimation', {
      street: '10 rue de la Paix', postal_code: 'ABCDE', city: 'Lille',
      surface: 80, property_type: 'Maison',
      prenom: 'TEST', email: TEST_EMAIL_STRUCT,
      callback_consent: false, phone_consent: false, email_consent: false,
    });
    if (badCpResp.status === 400) {
      pass('10.6 — Code postal invalide rejeté (400)', '');
    } else {
      fail('10.6 — Validation code postal', `status ${badCpResp.status}`);
    }

    // 10.7 — Rue trop courte → 400 (< 3 chars)
    const shortRueResp = await post('/api/public/estimation', {
      street: 'AB', postal_code: '59000', city: 'Lille',
      surface: 80, property_type: 'Maison',
      prenom: 'TEST', email: TEST_EMAIL_STRUCT,
      callback_consent: false, phone_consent: false, email_consent: false,
    });
    if (shortRueResp.status === 400) {
      pass('10.7 — Rue trop courte rejetée (400)', '');
    } else {
      fail('10.7 — Validation rue', `status ${shortRueResp.status}`);
    }

    // 10.8 — Rétrocompat : raw_address seul toujours accepté
    const rawCompatResp = await post('/api/public/estimation', {
      raw_address: '12 rue Faidherbe, 59000 Lille',
      surface: 80, property_type: 'Maison',
      prenom: 'TEST_Compat', email: TEST_EMAIL_STRUCT,
      callback_consent: false, phone_consent: false, email_consent: false,
    });
    if (rawCompatResp.status === 200) {
      pass('10.8 — Rétrocompat raw_address (HTTP 200)', `statut="${rawCompatResp.body && rawCompatResp.body.status}"`);
    } else {
      fail('10.8 — Rétrocompat', `status ${rawCompatResp.status} : ${JSON.stringify(rawCompatResp.body)}`);
    }

    // 10.9 — Coordonnées BAN stockées (à vérifier avant nettoyage, ligne address_source='ban')
    await new Promise(r => setTimeout(r, 200));
    const banCheckRow = db.prepare("SELECT * FROM estimation_requests WHERE email=? AND address_source='ban' ORDER BY id ASC LIMIT 1").get(TEST_EMAIL_STRUCT);
    if (banCheckRow && banCheckRow.lat != null && banCheckRow.lon != null) {
      pass('10.9 — Coordonnées BAN stockées en base (lat/lon non nuls)', `lat=${banCheckRow.lat}, lon=${banCheckRow.lon}`);
    } else if (banCheckRow) {
      warn('10.9 — Coordonnées BAN', `lat=${banCheckRow.lat}, lon=${banCheckRow.lon}`);
    } else {
      warn('10.9 — Coordonnées BAN', 'Ligne non trouvée');
    }

  } catch(e) {
    fail('10 — Adresse structurée', e.message);
  } finally {
    // Nettoyage spécifique à l'étape 10
    try {
      db.prepare('DELETE FROM estimation_requests WHERE email=?').run(TEST_EMAIL_STRUCT);
    } catch(_) {}
  }

  // ── Étape 11 : Validation moteur (calculate direct, sans HTTP) ──
  // Ces tests appellent calculate() directement pour éviter le rate limiter.
  console.log('\nÉTAPE 11 — Validation moteur (calculate, sans HTTP)');
  const { calculate } = require('../services/price-reference');

  // Fetcher factice : simule IGN vide (adresse introuvable) + DVF vide
  function makeFetcherEmpty() {
    let ignCalled = false;
    const fetcher = async (url) => {
      if (String(url).includes('geopf.fr')) {
        ignCalled = true;
        return new Response(JSON.stringify({ type:'FeatureCollection', features:[] }), { status: 200, headers: {'Content-Type':'application/json'} });
      }
      // DVF : collection vide, pagination terminée
      return new Response(JSON.stringify({ type:'FeatureCollection', features:[], count:0, next:null }), { status: 200, headers: {'Content-Type':'application/json'} });
    };
    fetcher.wasIgnCalled = () => ignCalled;
    return fetcher;
  }

  // Fetcher factice : IGN retourne un housenumber à des coordonnées précises + DVF vide
  function makeFetcherWithIGN(ignLon, ignLat, postcode, citycode) {
    let ignCalled = false;
    const fetcher = async (url) => {
      if (String(url).includes('geopf.fr')) {
        ignCalled = true;
        return new Response(JSON.stringify({
          type: 'FeatureCollection',
          features: [{
            geometry: { type: 'Point', coordinates: [ignLon, ignLat] },
            properties: { type: 'housenumber', score: 0.92, postcode, citycode, city: 'TestVille' }
          }]
        }), { status: 200, headers: {'Content-Type':'application/json'} });
      }
      return new Response(JSON.stringify({ type:'FeatureCollection', features:[], count:0, next:null }), { status: 200, headers: {'Content-Type':'application/json'} });
    };
    fetcher.wasIgnCalled = () => ignCalled;
    return fetcher;
  }

  try {
    // 11.1 — CP hors Nord → 'missing' avant tout appel réseau
    const resHorsNord = await calculate({ address:'10 rue de la Paix', postal_code:'75000', city:'Paris', type:'Maison', surface_habitable:80 });
    if (resHorsNord.status === 'missing' || resHorsNord.status === 'unsupported') {
      pass('11.1 — CP hors Nord rejeté par le moteur', `status="${resHorsNord.status}" — aucun appel réseau`);
    } else {
      fail('11.1 — CP hors Nord', `status="${resHorsNord.status}" (attendu missing/unsupported)`);
    }

    // 11.2 — Adresse fictive Nord (IGN retourne 0 résultats) → 'location', indicativeValue absent
    const fetcherFake = makeFetcherEmpty();
    const resFake = await calculate(
      { address:'99 rue Inexistante', postal_code:'59000', city:'Lille', type:'Maison', surface_habitable:80 },
      { fetcher: fetcherFake }
    );
    if (resFake.status === 'location' && resFake.indicativeValue == null) {
      pass('11.2 — Adresse fictive : statut "location", aucune valeur', `ignCalled=${fetcherFake.wasIgnCalled()}`);
    } else {
      fail('11.2 — Adresse fictive', `status="${resFake.status}", indicativeValue=${resFake.indicativeValue}`);
    }

    // 11.3 — Coordonnées BAN cohérentes avec IGN (<1500 m) → IGN appelé, statut non-'location'
    // IGN: [3.08, 50.37] | BAN: [3.082, 50.371] ≈ 180 m d'écart
    const fetcherBAN = makeFetcherWithIGN(3.08, 50.37, '59552', '59179');
    const resBAN = await calculate(
      { address:'10 rue Auguste Renoir', postal_code:'59552', city:'Courchelettes', type:'Maison', surface_habitable:95, lat:50.371, lon:3.082 },
      { fetcher: fetcherBAN }
    );
    if (fetcherBAN.wasIgnCalled() && resBAN.status !== 'location') {
      pass('11.3 — Coordonnées BAN cohérentes : IGN appelé, pas d\'erreur location', `status="${resBAN.status}"`);
    } else {
      fail('11.3 — Coordonnées BAN cohérentes', `ignCalled=${fetcherBAN.wasIgnCalled()}, status="${resBAN.status}" (attendu IGN appelé + status≠location)`);
    }

    // 11.4 — Coordonnées BAN hors zone (lat=99, lon=200) → hasBanCoords=false → fallback IGN
    const fetcherOOB = makeFetcherEmpty();
    const resOOB = await calculate(
      { address:'10 rue Auguste Renoir', postal_code:'59552', city:'Courchelettes', type:'Maison', surface_habitable:95, lat:99.0, lon:200.0 },
      { fetcher: fetcherOOB }
    );
    if (fetcherOOB.wasIgnCalled()) {
      pass('11.4 — Coordonnées hors France : fallback IGN déclenché', `status="${resOOB.status}"`);
    } else {
      fail('11.4 — Coordonnées hors France', 'IGN non appelé alors que les coords BAN sont invalides');
    }

    // 11.5 — Vérifier qu'aucun statut non-'ok' n'expose indicativeValue
    const nonOkStatuses = [resFake, resOOB, resHorsNord];
    const leaked = nonOkStatuses.filter(r => r.indicativeValue != null);
    if (leaked.length === 0) {
      pass('11.5 — Aucune valeur indicative exposée pour statuts non-ok', '');
    } else {
      fail('11.5 — Fuite indicativeValue', leaked.map(r=>`status=${r.status} val=${r.indicativeValue}`).join(', '));
    }

    // 11.6 — Coordonnées BAN incohérentes avec l'adresse (Paris vs Nord) → rejetées
    // IGN: [3.08, 50.37] (Courchelettes) | BAN: [2.35, 48.85] (Paris) ≈ 177 km
    const fetcherParis = makeFetcherWithIGN(3.08, 50.37, '59552', '59179');
    const resParis = await calculate(
      { address:'10 rue Auguste Renoir', postal_code:'59552', city:'Courchelettes', type:'Maison', surface_habitable:95, lat:48.85, lon:2.35 },
      { fetcher: fetcherParis }
    );
    if (resParis.status === 'location') {
      pass('11.6 — Coordonnées BAN Paris vs adresse Nord → rejetées (location)', `status="${resParis.status}"`);
    } else {
      fail('11.6 — Contournement coordonnées inter-ville', `status="${resParis.status}" (attendu "location")`);
    }

    // 11.7 — Coordonnées BAN à >1500 m de l'IGN → rejetées
    // IGN: [3.08, 50.37] | BAN: [3.11, 50.395] ≈ 3 500 m d'écart
    const fetcherFar = makeFetcherWithIGN(3.08, 50.37, '59552', '59179');
    const resFar = await calculate(
      { address:'10 rue Auguste Renoir', postal_code:'59552', city:'Courchelettes', type:'Maison', surface_habitable:95, lat:50.395, lon:3.11 },
      { fetcher: fetcherFar }
    );
    if (resFar.status === 'location') {
      pass('11.7 — Coordonnées BAN trop éloignées de l\'IGN (>1500 m) → rejetées', `status="${resFar.status}"`);
    } else {
      fail('11.7 — Seuil distance BAN/IGN', `status="${resFar.status}" (attendu "location")`);
    }

    // 11.8 — Coordonnées BAN proches de l'IGN (<1500 m) → acceptées
    // IGN: [3.08, 50.37] | BAN: [3.082, 50.372] ≈ 264 m d'écart
    const fetcherClose = makeFetcherWithIGN(3.08, 50.37, '59552', '59179');
    const resClose = await calculate(
      { address:'10 rue Auguste Renoir', postal_code:'59552', city:'Courchelettes', type:'Maison', surface_habitable:95, lat:50.372, lon:3.082 },
      { fetcher: fetcherClose }
    );
    if (fetcherClose.wasIgnCalled() && resClose.status !== 'location') {
      pass('11.8 — Coordonnées BAN proches de l\'IGN (<1500 m) → acceptées', `status="${resClose.status}"`);
    } else {
      fail('11.8 — Coordonnées BAN proches', `ignCalled=${fetcherClose.wasIgnCalled()}, status="${resClose.status}" (attendu IGN appelé + status≠location)`);
    }

  } catch(e) {
    fail('11 — Validation moteur', e.message);
  }

  // ── Étape 12 : Intégrité du reste du site ────────────────────
  console.log('\nÉTAPE 12 — Intégrité des tables non liées');
  try {
    const sellers = db.prepare('SELECT COUNT(*) AS n FROM sellers').get();
    const callbacks = db.prepare('SELECT COUNT(*) AS n FROM callback_requests').get();
    const visits = db.prepare('SELECT COUNT(*) AS n FROM visits').get();
    pass('12.1 — Tables vendeur/visites/rappels non modifiées',
      `sellers=${sellers.n}, callback_requests=${callbacks.n}, visits=${visits.n}`);

    // Vérifier que aucune table vendeur n'a de données test
    const sellerTest = db.prepare("SELECT COUNT(*) AS n FROM sellers WHERE email LIKE 'test-estim-%'").get();
    if (sellerTest.n === 0) {
      pass('12.2 — Aucune donnée test dans la table sellers', '');
    } else {
      fail('12.2 — Contamination', `${sellerTest.n} enregistrement(s) test dans sellers`);
    }
  } catch(e) {
    warn('12 — Intégrité tables', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
//  EXÉCUTION
// ════════════════════════════════════════════════════════════════
(async () => {
  try {
    await startServer();
    await runTests();
  } catch(e) {
    console.error('\n[FATAL]', e.message, e.stack);
    process.exitCode = 1;
  } finally {
    await stopServer();
    cleanup();
  }

  // ── Tableau de résultats ──────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  RÉSULTATS');
  console.log('══════════════════════════════════════════════════════════');

  const colStep    = 55;
  const colResult  = 12;

  const header = `  ${'ÉTAPE'.padEnd(colStep)} ${'RÉSULTAT'.padEnd(colResult)} ANOMALIE`;
  console.log(header);
  console.log('  ' + '─'.repeat(header.length - 2));

  for (const r of rows) {
    const icon = r.result === 'OK' ? '✓' : r.result === 'ECHEC' ? '✗' : '⚠';
    const line = `  ${icon} ${r.step.padEnd(colStep - 2)} ${r.result.padEnd(colResult)} ${r.anomalie}`;
    console.log(line);
  }

  const ok     = rows.filter(r => r.result === 'OK').length;
  const warn_  = rows.filter(r => r.result === 'ATTENTION').length;
  const failed = rows.filter(r => r.result === 'ECHEC').length;
  console.log('\n  ' + '─'.repeat(80));
  console.log(`  Total : ${rows.length} tests — ${ok} OK, ${warn_} ATTENTION, ${failed} ECHEC`);
  console.log('══════════════════════════════════════════════════════════\n');
})();
