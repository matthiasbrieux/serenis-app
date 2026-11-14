'use strict';
const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { createHash, randomBytes } = require('node:crypto');
const { getReference } = require('../services/price-reference');
const { sendEstimationEmails, sendCallbackNotif } = require('../services/estimation-email');
const db         = require('../database');

const router = express.Router();

// 5 demandes par heure par IP pour limiter les abus
const estimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      error: 'Trop de demandes. Veuillez réessayer dans 1 heure.',
      retryAfter: 3600,
    });
  },
});

// 10 demandes par heure par IP pour les prises de contact
const callbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      error: 'Trop de demandes. Veuillez réessayer dans 1 heure.',
      retryAfter: 3600,
    });
  },
});

// Extrait code postal, ville et rue depuis une adresse libre
function parseAddress(raw) {
  const str = String(raw || '').trim();
  const m   = str.match(/\b(\d{5})\b/);
  if (!m) return null;
  const cp     = m[1];
  const pos    = m.index;
  const street = str.slice(0, pos).replace(/[,\s]+$/, '').trim();
  const city   = str.slice(pos + m[0].length).replace(/^[,\s]+/, '').trim();
  return { address: street || null, city: city || null, postal_code: cp };
}

function ipHash(req) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || '';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// Ne retourner que les informations nécessaires au navigateur
function sanitize(raw) {
  if (!raw) return { status: 'unavailable' };
  if (raw.status === 'ok') {
    return {
      status:         'ok',
      priceM2:        raw.priceM2,
      indicativeValue: raw.indicativeValue,
      count:          raw.count,
      radiusMeters:   raw.radiusMeters,
    };
  }
  return { status: raw.status };
}

router.post('/api/public/estimation', estimLimiter, async (req, res) => {
  const {
    raw_address,
    street: rawStreet, postal_code: rawPostalCode, city: rawCity,
    insee_code: rawInsee, lat: rawLat, lon: rawLon, address_source: rawAddressSource,
    surface: surfRaw, property_type,
    prenom, email, phone,
    callback_consent, callback_consent_at, callback_consent_version,
    phone_consent, phone_consent_at, phone_consent_version,
    email_consent, email_consent_at, email_consent_version,
  } = req.body;

  // ── Validation ──────────────────────────────────────────────
  const errors = {};

  const hasStructured = !!(rawStreet && rawPostalCode && rawCity);
  let rawAddr;

  if (hasStructured) {
    const st = String(rawStreet).trim();
    const cp = String(rawPostalCode).trim();
    const ci = String(rawCity).trim();
    if (st.length < 3)        errors.street      = 'Numéro et rue requis.';
    if (!/^\d{5}$/.test(cp))  errors.postal_code = 'Code postal invalide (5 chiffres).';
    if (!ci)                  errors.city        = 'Ville requise.';
    rawAddr = st + ', ' + cp + ' ' + ci;
  } else {
    rawAddr = String(raw_address || '').trim();
    if (rawAddr.length < 6) errors.raw_address = 'Adresse trop courte.';
  }

  const surface = parseInt(surfRaw, 10);
  if (!surface || surface < 10 || surface > 2000) errors.surface = 'Surface invalide (10–2000 m²).';

  const type = String(property_type || '').trim();
  if (!['Maison', 'Appartement'].includes(type)) errors.property_type = 'Type de bien invalide.';

  const p = String(prenom || '').trim();
  if (!p || p.length < 2) errors.prenom = 'Prénom requis.';

  const em = String(email || '').trim().toLowerCase();
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) errors.email = 'E-mail invalide.';

  const ph = String(phone || '').trim() || null;
  if (ph) {
    const clean = ph.replace(/[\s.\-()]/g, '');
    if (!/^(\+33|0033|0)[1-9](\d{2}){4}$/.test(clean)) errors.phone = 'Numéro invalide.';
  }

  const wantsCb = callback_consent === true || callback_consent === 'true' || callback_consent === 1;
  if (wantsCb && !ph) errors.phone = 'Numéro requis pour le rappel.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Données invalides.', fields: errors });
  }

  // ── Parsing adresse ─────────────────────────────────────────
  let parsedAddress, parsedCity, parsedPostalCode;

  if (hasStructured) {
    parsedAddress    = String(rawStreet).trim();
    parsedCity       = String(rawCity).trim();
    parsedPostalCode = String(rawPostalCode).trim();
  } else {
    const parsed = parseAddress(rawAddr);
    if (!parsed || !parsed.address || !parsed.city) {
      return res.status(400).json({
        error: 'Adresse incomplète.',
        fields: { raw_address: 'Incluez le code postal et la ville. Ex : 12 rue de la Paix, 59000 Lille.' },
      });
    }
    parsedAddress    = parsed.address;
    parsedCity       = parsed.city;
    parsedPostalCode = parsed.postal_code;
  }

  // ── Consentements RGPD optionnels ────────────────────────────
  const now = new Date().toISOString();

  const wantsPhoneCb  = phone_consent === true || phone_consent === 'true' || phone_consent === 1;
  const pcAt  = wantsPhoneCb  ? String(phone_consent_at  || now) : null;
  const pcVer = wantsPhoneCb  ? String(phone_consent_version || 'v1-2026') : null;

  const wantsEmailMkt = email_consent === true || email_consent === 'true' || email_consent === 1;
  const ecAt  = wantsEmailMkt ? String(email_consent_at  || now) : null;
  const ecVer = wantsEmailMkt ? String(email_consent_version || 'v1-2026') : null;

  const latVal  = rawLat  != null ? (Number(rawLat)  || null) : null;
  const lonVal  = rawLon  != null ? (Number(rawLon)  || null) : null;

  // ── Estimation ──────────────────────────────────────────────
  let engineResult;

  if (type !== 'Maison') {
    engineResult = { status: 'unsupported' };
  } else if (!/^59\d{3}$/.test(parsedPostalCode)) {
    engineResult = { status: 'unsupported' };
  } else {
    try {
      engineResult = await getReference({
        address:          parsedAddress,
        city:             parsedCity,
        postal_code:      parsedPostalCode,
        type:             'Maison',
        surface_habitable: surface,
        lat:              latVal,
        lon:              lonVal,
      });
    } catch {
      engineResult = { status: 'unavailable' };
    }
  }

  // ── Enregistrement ──────────────────────────────────────────
  const cbAt  = wantsCb ? String(callback_consent_at  || now)       : null;
  const cbVer = wantsCb ? String(callback_consent_version || 'v1-2026') : null;

  const ctaToken = randomBytes(16).toString('hex'); // 32-char hex non-devinable

  const insCode = (hasStructured && rawInsee) ? String(rawInsee).trim().slice(0, 10) : null;
  const addrSrc = String(rawAddressSource || (hasStructured ? 'ban' : 'raw')).trim().slice(0, 20);

  let recordId = null;
  try {
    const ins = db.prepare(`
      INSERT INTO estimation_requests
        (raw_address, address, city, postal_code, surface, property_type,
         prenom, email, phone,
         callback_consent, callback_consent_at, callback_consent_version,
         phone_consent, phone_consent_at, phone_consent_version,
         email_consent, email_consent_at, email_consent_version,
         estimation_status, price_m2, indicative_value,
         email_status, notif_status, ip_hash, cta_token,
         insee_code, lat, lon, address_source)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      rawAddr, parsedAddress, parsedCity, parsedPostalCode, surface, type,
      p, em, ph,
      wantsCb ? 1 : 0, cbAt, cbVer,
      wantsPhoneCb  ? 1 : 0, pcAt, pcVer,
      wantsEmailMkt ? 1 : 0, ecAt, ecVer,
      engineResult.status,
      engineResult.priceM2        != null ? engineResult.priceM2        : null,
      engineResult.indicativeValue != null ? engineResult.indicativeValue : null,
      'pending',
      'pending',
      ipHash(req),
      ctaToken,
      insCode, latVal, lonVal, addrSrc,
    );
    recordId = ins.lastInsertRowid;
  } catch (dbErr) {
    console.error('[estimation] DB insert error:', dbErr.message);
  }

  // Emails (silently skipped if RESEND_API_KEY absent)
  if (recordId) {
    const emailData = {
      prenom: p, email: em, phone: ph,
      callback_consent: wantsCb, callback_consent_at: cbAt,
      phone_consent: wantsPhoneCb, phone_consent_at: pcAt,
      email_consent: wantsEmailMkt, email_consent_at: ecAt,
      raw_address: rawAddr, address: parsedAddress, city: parsedCity,
      postal_code: parsedPostalCode, surface, property_type: type,
      estimation_status: engineResult.status,
      price_m2:         engineResult.priceM2        ?? null,
      indicative_value: engineResult.indicativeValue ?? null,
      radiusMeters:     engineResult.radiusMeters    ?? null,
      count:            engineResult.count           ?? null,
      comparables:      engineResult.comparables     ?? null,
      period_from:      engineResult.periodFrom      ?? null,
      period_to:        engineResult.periodTo        ?? null,
      created_at:       now,
      ip_hash:          ipHash(req),
    };
    emailData.cta_token = ctaToken;
    sendEstimationEmails(emailData).then(({ emailSent, notifSent }) => {
      try {
        db.prepare('UPDATE estimation_requests SET email_status=?, notif_status=? WHERE id=?')
          .run(emailSent ? 'sent' : 'skipped', notifSent ? 'sent' : 'skipped', recordId);
      } catch {}
    }).catch(() => {});
  }

  return res.json(sanitize(engineResult));
});

// ── Prise de contact depuis l'e-mail (CTA "Demander un échange") ──
router.post('/api/public/estimation-callback', callbackLimiter, (req, res) => {
  const { email: rawEmail, phone: rawPhone, sell_horizon, source, token } = req.body;

  // ── Résolution via token (prioritaire sur email) ──────────────
  let resolvedEmail = null;
  let estimRow      = null;

  if (token && typeof token === 'string' && /^[0-9a-f]{32}$/.test(token)) {
    try {
      estimRow = db.prepare(
        'SELECT * FROM estimation_requests WHERE cta_token=? ORDER BY id DESC LIMIT 1'
      ).get(token);
      if (estimRow) resolvedEmail = estimRow.email;
    } catch {}
  }

  // Si pas de token valide, utiliser l'email fourni directement
  const em = resolvedEmail
    || String(rawEmail || '').trim().toLowerCase();

  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
    return res.status(400).json({ error: 'E-mail invalide.' });
  }

  // Validation téléphone si fourni
  const ph = String(rawPhone || '').trim() || null;
  if (ph) {
    const clean = ph.replace(/[\s.\-()]/g, '');
    if (!/^(\+33|0033|0)[1-9](\d{2}){4}$/.test(clean)) {
      return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
    }
  }

  const horizon = String(sell_horizon || '').trim().slice(0, 100) || null;
  const src     = String(source || 'email_cta').trim().slice(0, 50);

  // Si pas de row trouvée via token, chercher par email
  if (!estimRow) {
    try {
      estimRow = db.prepare(
        'SELECT * FROM estimation_requests WHERE email=? ORDER BY id DESC LIMIT 1'
      ).get(em);
    } catch {}
  }
  const estimId = estimRow ? estimRow.id : null;

  let callbackId = null;
  try {
    const ins = db.prepare(`
      INSERT INTO estimation_callback_requests
        (estimation_request_id, email, phone, sell_horizon, source)
      VALUES (?, ?, ?, ?, ?)
    `).run(estimId, em, ph, horizon, src);
    callbackId = ins.lastInsertRowid;
  } catch (dbErr) {
    console.error('[estimation-callback] DB insert error:', dbErr.message);
    return res.status(500).json({ error: 'Erreur interne.' });
  }

  // Mise à jour du statut commercial de la demande d'estimation
  if (estimId) {
    try {
      db.prepare("UPDATE estimation_requests SET commercial_status='rappel_demande' WHERE id=?")
        .run(estimId);
    } catch {}
  }

  // Notification interne (non bloquante)
  if (callbackId) {
    const notifData = {
      email:        em,
      phone:        ph || (estimRow && estimRow.phone) || null,
      prenom:       estimRow ? (estimRow.prenom || null) : null,
      raw_address:  estimRow ? (estimRow.raw_address || null) : null,
      surface:      estimRow ? (estimRow.surface || null) : null,
      property_type: estimRow ? (estimRow.property_type || null) : null,
      indicative_value: estimRow ? (estimRow.indicative_value || null) : null,
      sell_horizon: horizon,
      source:       src,
      created_at:   new Date().toISOString(),
    };
    sendCallbackNotif(notifData).catch(() => {});
  }

  return res.json({ ok: true });
});

// ── Résolution d'un token CTA → pré-remplissage /entretien ───────
router.get('/api/public/estimation-hint', (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token || !/^[0-9a-f]{32}$/.test(token)) {
    return res.status(400).json({ error: 'Token invalide.' });
  }
  try {
    const row = db.prepare(
      'SELECT prenom, email FROM estimation_requests WHERE cta_token=? LIMIT 1'
    ).get(token);
    if (!row) return res.status(404).json({ error: 'Token introuvable.' });
    return res.json({ prenom: row.prenom || null, email: row.email });
  } catch {
    return res.status(500).json({ error: 'Erreur interne.' });
  }
});

// ── Page prise de rendez-vous (CTA e-mail) ───────────────────────
router.get('/entretien', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile('entretien.html', { root: './public' });
});

module.exports = router;
