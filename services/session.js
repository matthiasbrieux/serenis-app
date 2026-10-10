const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ISSUER = 'vendu-par-moi';
function stamp(account) { return crypto.createHmac('sha256', process.env.JWT_SECRET).update(account.password).digest('hex'); }
function sign(account, role, expiresIn = role === 'admin' ? '8h' : '30d') {
  return jwt.sign({ id: account.id, uuid: account.uuid, email: account.email, pack: account.pack, name: account.name || account.first_name, role, session: stamp(account) }, process.env.JWT_SECRET, { expiresIn, audience: role, issuer: ISSUER, algorithm: 'HS256' });
}
function verify(token, role, db) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { audience: role, issuer: ISSUER, algorithms: ['HS256'] });
  if (payload.role !== role || !Number.isSafeInteger(payload.id)) throw Error('Invalid session');
  const table = { seller: 'sellers', admin: 'admins', partner: 'photographers' }[role];
  const account = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(payload.id);
  if (!account || payload.session !== stamp(account) || (role === 'partner' && account.active === 0)) throw Error('Revoked session');
  return payload;
}
const cookieOptions = maxAge => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge });
module.exports = { sign, verify, cookieOptions };
