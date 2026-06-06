// Injects canonical favicon/PWA meta tags into every HTML file
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Canonical block to inject (after <meta charset> or first <meta>)
const ICON_BLOCK = `  <link rel="icon" href="/favicon.ico" sizes="any"/>
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"/>
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png"/>
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
  <link rel="manifest" href="/manifest.json"/>
  <meta name="theme-color" content="#3D5A47"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="VPM"/>`;

// Tags we'll remove if already present (avoid duplicates on re-run)
const STALE_PATTERNS = [
  /\s*<link rel="icon"[^>]*\/>/gi,
  /\s*<link rel="shortcut icon"[^>]*\/>/gi,
  /\s*<link rel="apple-touch-icon"[^>]*\/>/gi,
  /\s*<link rel="manifest"[^>]*\/>/gi,
  /\s*<meta name="theme-color"[^>]*\/>/gi,
  /\s*<meta name="apple-mobile-web-app-capable"[^>]*\/>/gi,
  /\s*<meta name="apple-mobile-web-app-status-bar-style"[^>]*\/>/gi,
  /\s*<meta name="apple-mobile-web-app-title"[^>]*\/>/gi,
  // Also remove duplicate end-of-self-closing variants without /
  /\s*<link rel="icon"[^>]*>/gi,
  /\s*<link rel="shortcut icon"[^>]*>/gi,
  /\s*<link rel="apple-touch-icon"[^>]*>/gi,
  /\s*<link rel="manifest"[^>]*>/gi,
];

function htmlFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '_next', '.git'].includes(entry.name)) {
      results = results.concat(htmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const files = htmlFiles(ROOT);
let updated = 0, skipped = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');

  // Only touch files with a <head> section
  if (!/<head/i.test(html)) { skipped++; continue; }

  // Remove stale icon tags
  for (const pat of STALE_PATTERNS) html = html.replace(pat, '');

  // Find insertion point: after <meta charset...> if present, else after <head>
  const charsetMatch = html.match(/<meta\s+charset[^>]*>/i);
  if (charsetMatch) {
    const idx = html.indexOf(charsetMatch[0]) + charsetMatch[0].length;
    html = html.slice(0, idx) + '\n' + ICON_BLOCK + html.slice(idx);
  } else {
    html = html.replace(/(<head[^>]*>)/i, `$1\n${ICON_BLOCK}`);
  }

  fs.writeFileSync(file, html, 'utf8');
  console.log('  ✓', path.relative(ROOT, file));
  updated++;
}

console.log(`\n${updated} fichiers mis à jour, ${skipped} ignorés.`);
