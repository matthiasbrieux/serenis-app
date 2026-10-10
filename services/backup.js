const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const DB_PATH = path.resolve(process.env.DATABASE_URL || './database.db');
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || './backups');
const CLOUD_PREFIX = (process.env.NODE_ENV === 'production' || process.env.RENDER) ? 'venduparmo-backups/prod' : 'venduparmo-backups/dev';
let running;
async function performBackup() {
  if (!fs.existsSync(DB_PATH)) throw Error('Base absente');
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(BACKUP_DIR,0o700);
  const dest = path.join(BACKUP_DIR, `db-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomBytes(4).toString('hex')}.db`);
  const source = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try { await source.backup(dest); } finally { source.close(); }
  fs.chmodSync(dest, 0o600);
  const copy = new Database(dest, { readonly: true });
  try { if (copy.pragma('integrity_check', { simple: true }) !== 'ok') throw Error('Sauvegarde SQLite invalide'); } finally { copy.close(); }
  // No deletion of historical local/remote backups: retention is an explicit operation.
  if (process.env.CLOUDINARY_URL) {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    if (!key || !/^[a-f\d]{64}$/i.test(key)) {
      console.error('Sauvegarde distante désactivée : BACKUP_ENCRYPTION_KEY (32 octets hex) requis. Copie locale conservée.');
    } else {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key,'hex'), iv);
      const ciphertext = Buffer.concat([cipher.update(fs.readFileSync(dest)),cipher.final()]);
      const encrypted = dest + '.enc';
      fs.writeFileSync(encrypted, Buffer.concat([Buffer.from('VPMBACKUP1'),iv,cipher.getAuthTag(),ciphertext]), {mode:0o600});
      try {
        const cloud = require('cloudinary').v2; cloud.config(true);
        await cloud.uploader.upload(encrypted, { resource_type:'raw', type:'authenticated', public_id:`${CLOUD_PREFIX}/${path.basename(encrypted)}`, overwrite:false });
      } finally { fs.unlinkSync(encrypted); }
    }
  }
  return dest;
}
function backupDatabase() {
  if (!running) running = performBackup().finally(() => { running = null; });
  return running;
}
module.exports = { backupDatabase, CLOUD_PREFIX };
