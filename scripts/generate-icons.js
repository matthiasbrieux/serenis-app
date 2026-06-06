// Generates all app icons and favicon from a master SVG using macOS sips
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '../public');
const ICONS = path.join(PUB, 'icons');
fs.mkdirSync(ICONS, { recursive: true });

// ── Master SVG (512×512) ────────────────────────────────────────────────────
// Design: dark green background, rounded square, "VPM" large bold white,
// thin terracotta underline accent, "Vendu Par Moi" small below.
const masterSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4A6B56"/>
      <stop offset="100%" stop-color="#2E4435"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- Subtle inner glow top -->
  <rect width="512" height="256" fill="url(#shine)"/>

  <!-- Terracotta accent bar -->
  <rect x="176" y="316" width="160" height="5" rx="2.5" fill="#C4785A"/>

  <!-- VPM — main letters -->
  <text
    x="256" y="300"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="172"
    font-weight="700"
    letter-spacing="-4"
    fill="white"
    text-anchor="middle"
    dominant-baseline="alphabetic"
  >VPM</text>

  <!-- Vendu Par Moi -->
  <text
    x="256" y="364"
    font-family="Arial, Helvetica, sans-serif"
    font-size="36"
    font-weight="400"
    letter-spacing="5"
    fill="rgba(255,255,255,0.72)"
    text-anchor="middle"
    dominant-baseline="alphabetic"
  >VENDU PAR MOI</text>
</svg>`;

const masterPath = path.join(ICONS, 'icon-master.svg');
fs.writeFileSync(masterPath, masterSvg);
console.log('  SVG master écrit');

// ── Generate PNG at every required size ─────────────────────────────────────
function topng(srcSvg, destPng, size) {
  // sips resizes from its native render, --resampleHeightWidthMax keeps square
  execSync(`sips -s format png "${srcSvg}" --out "${destPng}" --resampleHeightWidth ${size} ${size} 2>/dev/null`);
  console.log(`  ${path.basename(destPng)}  (${size}×${size})`);
}

topng(masterPath, path.join(ICONS, 'icon-512.png'),  512);
topng(masterPath, path.join(ICONS, 'icon-192.png'),  192);
topng(masterPath, path.join(ICONS, 'icon-180.png'),  180);  // apple-touch-icon
topng(masterPath, path.join(ICONS, 'icon-152.png'),  152);  // iPad retina
topng(masterPath, path.join(ICONS, 'icon-120.png'),  120);  // iPhone retina
toping = (s) => topng(masterPath, path.join(ICONS, `icon-${s}.png`), s);

// Favicon sizes (32 and 16 in a combined file via the png32 trick)
topng(masterPath, path.join(ICONS, 'favicon-32.png'), 32);
topng(masterPath, path.join(ICONS, 'favicon-16.png'), 16);

// Copy favicon-32.png as favicon.ico (browsers accept PNG-in-ICO via .ico ext or just PNG named favicon.ico)
fs.copyFileSync(path.join(ICONS, 'favicon-32.png'), path.join(PUB, 'favicon.ico'));
fs.copyFileSync(path.join(ICONS, 'favicon-32.png'), path.join(PUB, 'favicon-32.png'));
fs.copyFileSync(path.join(ICONS, 'favicon-16.png'), path.join(PUB, 'favicon-16.png'));
fs.copyFileSync(path.join(ICONS, 'icon-180.png'),   path.join(PUB, 'apple-touch-icon.png'));
fs.copyFileSync(path.join(ICONS, 'icon-512.png'),   path.join(PUB, 'icon-512.png'));
fs.copyFileSync(path.join(ICONS, 'icon-192.png'),   path.join(PUB, 'icon-192.png'));

console.log('\n  Copies dans public/ : favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png');
console.log('\nTerminé.');
