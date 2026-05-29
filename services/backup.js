const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.env.DATABASE_URL || './database.db');
const BACKUP_DIR = path.resolve('./backups');
const MAX_BACKUPS = 7;

async function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) { console.warn('Backup: DB file not found at', DB_PATH); return null; }
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(BACKUP_DIR, `db-${ts}.db`);

  fs.copyFileSync(DB_PATH, dest);
  const sizeKo = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`✓ Backup SQLite → ${path.basename(dest)} (${sizeKo} Ko)`);

  // Rotation locale : garder 7 backups max
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^db-\d{4}-\d{2}-\d{2}/.test(f))
    .sort();
  while (files.length > MAX_BACKUPS) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, files.shift())); } catch(e) {}
  }

  // Upload vers Cloudinary pour persistance hors-serveur
  if (process.env.CLOUDINARY_URL) {
    try {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({ secure: true });
      const publicId = `serenis-backups/db-${ts}`;
      await cloudinary.uploader.upload(dest, {
        resource_type: 'raw',
        public_id: publicId,
        overwrite: true,
        tags: ['backup', 'sqlite'],
      });
      console.log(`✓ Backup uploadé sur Cloudinary : ${publicId}`);

      // Supprimer les backups Cloudinary de plus de 7 jours
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { resources } = await cloudinary.api.resources({
        type: 'upload', resource_type: 'raw', prefix: 'serenis-backups/', max_results: 50,
      });
      for (const r of resources) {
        if (new Date(r.created_at) < cutoff) {
          await cloudinary.uploader.destroy(r.public_id, { resource_type: 'raw' }).catch(() => {});
        }
      }
    } catch(e) {
      console.error('Backup Cloudinary error:', e.message);
    }
  } else {
    console.warn('Backup: CLOUDINARY_URL non défini — backup local uniquement');
  }

  return dest;
}

module.exports = { backupDatabase };
