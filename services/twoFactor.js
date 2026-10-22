const crypto = require('crypto');
const db = require('../database');
const { sendLoginCode } = require('./email');

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// Crée un code à usage unique pour ce compte et l'envoie par email.
// Retourne { emailSent, devMode } pour que l'appelant puisse détecter un
// échec d'envoi et en informer l'utilisateur au lieu de l'attendre en vain.
// Le console.log du code n'est activé qu'avec NODE_ENV=development explicite —
// jamais par défaut, jamais en production même si RESEND_API_KEY est absent.
async function issue2FACode(accountType, accountId, email) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO login_2fa_codes (account_type, account_id, code, expires_at) VALUES (?, ?, ?, ?)'
  ).run(accountType, accountId, code, expiresAt);
  const devMode = process.env.NODE_ENV === 'development';
  if (!process.env.RESEND_API_KEY && devMode) {
    console.log(`\n[2FA DEV] Code de connexion pour ${email} : ${code}\n`);
  }
  const emailSent = await sendLoginCode(email, code).catch(() => false);
  return { emailSent: emailSent === true, devMode };
}

// Vérifie le code le plus récent, non utilisé et non expiré pour ce compte.
// Compte les tentatives ratées pour empêcher le brute-force sur 6 chiffres.
function verify2FACode(accountType, accountId, code) {
  const row = db.prepare(
    `SELECT * FROM login_2fa_codes WHERE account_type=? AND account_id=? AND used_at IS NULL AND julianday(expires_at) > julianday('now') ORDER BY id DESC LIMIT 1`
  ).get(accountType, accountId);
  if (!row) return { ok: false, error: 'Code expiré ou introuvable. Demandez-en un nouveau.' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Trop de tentatives. Demandez un nouveau code.' };
  if (row.code !== code) {
    db.prepare('UPDATE login_2fa_codes SET attempts = attempts + 1 WHERE id=?').run(row.id);
    return { ok: false, error: 'Code incorrect.' };
  }
  db.prepare("UPDATE login_2fa_codes SET used_at = datetime('now') WHERE id=?").run(row.id);
  return { ok: true };
}

module.exports = { issue2FACode, verify2FACode };
