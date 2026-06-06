// Generates all app icons and favicon from a master SVG using macOS sips
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '../public');
const ICONS = path.join(PUB, 'icons');
fs.mkdirSync(ICONS, { recursive: true });

// ── Master SVG (512×512) ──────────────────────────────��──────────────────────
// Premium immobilier: gradient vert profond, "VPM" serif bold, accent terracotta,
// silhouette maison subtile, "Vendu Par Moi" en dessous
const masterSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#4D6E5A"/>
      <stop offset="100%" stop-color="#243528"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.10"/>
      <stop offset="60%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- Subtle top highlight -->
  <rect width="512" height="300" fill="url(#shine)"/>

  <!-- Silhouette maison — élément architectural discret -->
  <path d="M256 108 L162 178 L162 216 L350 216 L350 178 Z"
        fill="none" stroke="rgba(255,255,255,0.13)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="218" y="178" width="76" height="38" fill="none" stroke="rgba(255,255,255,0.13)" stroke-width="5.5" rx="2"/>

  <!-- VPM — lettres principales -->
  <text
    x="256" y="356"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="188"
    font-weight="700"
    letter-spacing="-6"
    fill="white"
    text-anchor="middle"
    dominant-baseline="alphabetic"
  >VPM</text>

  <!-- Barre accent terracotta -->
  <rect x="184" y="374" width="144" height="7" rx="3.5" fill="#C4785A"/>

  <!-- Vendu Par Moi — sous-titre (lisible à 192px+) -->
  <text
    x="256" y="422"
    font-family="Arial, Helvetica, sans-serif"
    font-size="34"
    font-weight="400"
    letter-spacing="7"
    fill="rgba(255,255,255,0.62)"
    text-anchor="middle"
    dominant-baseline="alphabetic"
  >VENDU PAR MOI</text>
</svg>`;

const masterPath = path.join(ICONS, 'icon-master.svg');
fs.writeFileSync(masterPath, masterSvg);
console.log('  SVG master écrit');

// ── PNG generation ────────────────────────────────────────────────────────────
function topng(srcSvg, destPng, size) {
  execSync(`sips -s format png "${srcSvg}" --out "${destPng}" --resampleHeightWidth ${size} ${size} 2>/dev/null`);
  const bytes = fs.statSync(destPng).size;
  console.log(`  ${path.basename(destPng).padEnd(20)} ${size}×${size}  (${(bytes/1024).toFixed(1)}KB)`);
}

topng(masterPath, path.join(ICONS, 'icon-512.png'),  512);
topng(masterPath, path.join(ICONS, 'icon-192.png'),  192);
topng(masterPath, path.join(ICONS, 'icon-180.png'),  180);
topng(masterPath, path.join(ICONS, 'icon-152.png'),  152);
topng(masterPath, path.join(ICONS, 'icon-120.png'),  120);
topng(masterPath, path.join(ICONS, 'favicon-32.png'), 32);
topng(masterPath, path.join(ICONS, 'favicon-16.png'), 16);

// ── Copies vers public/ ───────────────────────────────────────────────────────
fs.copyFileSync(path.join(ICONS, 'favicon-32.png'), path.join(PUB, 'favicon-32.png'));
fs.copyFileSync(path.join(ICONS, 'favicon-16.png'), path.join(PUB, 'favicon-16.png'));
fs.copyFileSync(path.join(ICONS, 'icon-180.png'),   path.join(PUB, 'apple-touch-icon.png'));
fs.copyFileSync(path.join(ICONS, 'icon-512.png'),   path.join(PUB, 'icon-512.png'));
fs.copyFileSync(path.join(ICONS, 'icon-192.png'),   path.join(PUB, 'icon-192.png'));

console.log('\n  Copies: favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png');
console.log('  Lancez scripts/make-ico.py pour reconstruire favicon.ico (multi-taille)');
console.log('\nTerminé.');
