// Synchronise les sidebars vendeur : insère les items manquants au bon endroit
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../views/seller');

// Items à insérer (HTML exact, indenté avec 6 espaces comme les autres pages)
const ACHETEURS_HTML = `
      <a href="/mes-acheteurs" class="sidebar-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Mes acheteurs
      </a>`;

const OFFRES_HTML = `
      <a href="/mes-offres" class="sidebar-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Mes offres
      </a>`;

// Pages à ignorer (sidebars volontairement réduites)
const SKIP = new Set(['booking.html', 'coach.html', 'contrat.html', 'notifications.html', 'onboarding.html']);

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html') && !SKIP.has(f));

let changed = 0;

for (const file of files) {
  const filePath = path.join(DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');

  // Vérifier que la sidebar principale existe (pas juste un lien vers /dashboard)
  const sidebarNavCount = (html.match(/class="sidebar-item/g) || []).length;
  if (sidebarNavCount < 4) {
    console.log(`  SKIP ${file} (sidebar trop réduite)`);
    continue;
  }

  let modified = false;

  // ── 1. Insérer /mes-acheteurs après /mon-agenda ──────────────────────────
  if (!html.includes('href="/mes-acheteurs"')) {
    // Trouver la fin du bloc </a> qui suit href="/mon-agenda"
    const agendaIdx = html.indexOf('href="/mon-agenda"');
    if (agendaIdx !== -1) {
      // Chercher le </a> suivant
      const closingIdx = html.indexOf('</a>', agendaIdx);
      if (closingIdx !== -1) {
        const insertAt = closingIdx + '</a>'.length;
        html = html.slice(0, insertAt) + ACHETEURS_HTML + html.slice(insertAt);
        modified = true;
      }
    }
  }

  // ── 2. Insérer /mes-offres après /mes-publications ───────────────────────
  if (!html.includes('href="/mes-offres"')) {
    const pubIdx = html.indexOf('href="/mes-publications"');
    if (pubIdx !== -1) {
      const closingIdx = html.indexOf('</a>', pubIdx);
      if (closingIdx !== -1) {
        const insertAt = closingIdx + '</a>'.length;
        html = html.slice(0, insertAt) + OFFRES_HTML + html.slice(insertAt);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ✓ ${file}`);
    changed++;
  } else {
    console.log(`  — ${file} (déjà complet)`);
  }
}

console.log(`\n${changed} fichier(s) mis à jour.`);
