const crypto = require('crypto');
const db = require('../database');
const { sendLoginCode } = require('./email');

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// Crée un code à usage unique pour ce compte et l'envoie par email.
// N'attend pas l'envoi de l'email pour ne pas bloquer la réponse de login
// si SendGrid est lent — l'échec d'envoi est loggé côté services/email.js.
async function issue2FACode(accountType, accountId, email) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO login_2fa_codes (account_type, account_id, code, expires_at) VALUES (?, ?, ?, ?)'
  ).run(accountType, accountId, code, expiresAt);
  sendLoginCode(email, code).catch(() => {});
}

// Vérifie le code le plus récent, non utilisé et non expiré pour ce compte.
// Compte les tentatives ratées pour empêcher le brute-force sur 6 chiffres.
function verify2FACode(accountType, accountId, code) {
  const row = db.prepare(
    `SELECT * FROM login_2fa_codes WHERE account_type=? AND account_id=? AND used_at IS NULL AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1`
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
