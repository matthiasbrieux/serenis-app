const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.env.DATABASE_URL || './database.db');
const BACKUP_DIR = path.resolve('./backups');
const MAX_BACKUPS = 7;

function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) { console.warn('Backup: DB file not found at', DB_PATH); return null; }
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(BACKUP_DIR, `db-${ts}.db`);

  fs.copyFileSync(DB_PATH, dest);
  console.log(`✓ Backup SQLite → ${path.basename(dest)} (${(fs.statSync(dest).size / 1024).toFixed(0)} Ko)`);

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^db-\d{4}-\d{2}-\d{2}/.test(f))
    .sort();
  while (files.length > MAX_BACKUPS) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, files.shift())); } catch(e) {}
  }
  return dest;
}

module.exports = { backupDatabase };
