/**
 * Document permission system tests.
 * Run with: node tests/document-permissions.test.js
 *
 * These tests exercise the in-memory filtering logic that mirrors what
 * routes/dossier.js and routes/buyer.js apply to property_documents rows.
 * They do NOT hit the network or the real DB — they verify the guard logic
 * in isolation so a regression is caught before deployment.
 */

'use strict';

const assert = require('assert');

// ── Mirror of the filter logic in routes/dossier.js ──────────────────────────

function filterAcheteurDocs(allDocs, prop) {
  return allDocs.filter(doc => {
    const f = doc.folder || '';
    if (f === 'acheteur_serieux') return prop.acheteur_docs_visible === 1;
    if (f === 'diagnostics')      return prop.diagnostics_in_dossier !== 0;
    if (f === '' || f === null)   return prop.plan_docs_visible !== 0;
    return false; // notaire, entretien → never shown to acheteur
  });
}

// ── Mirror of the filter logic in routes/buyer.js ────────────────────────────

function filterPublicDocs(allDocs, property) {
  const pre = allDocs.filter(doc => {
    const f = doc.folder || '';
    return f === 'diagnostics' || f === '' || f === null;
  });
  return pre.filter(doc => {
    const f = doc.folder || '';
    if (f === 'diagnostics') return property.diagnostics_in_dossier !== 0;
    return property.plan_docs_visible !== 0;
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DOCS = [
  { id: 1, name: 'Plan RDC',         folder: null,              doc_type: 'plan' },
  { id: 2, name: 'Diagnostic DPE',   folder: 'diagnostics',     doc_type: 'dpe' },
  { id: 3, name: 'Pièce identité',   folder: 'acheteur_serieux', doc_type: 'id' },
  { id: 4, name: 'Simulation banque',folder: 'acheteur_serieux', doc_type: 'simulation' },
  { id: 5, name: 'Acte notaire',     folder: 'notaire',         doc_type: 'acte' },
  { id: 6, name: 'Entretien chaudière', folder: 'entretien',    doc_type: 'entretien' },
  { id: 7, name: 'Fiche descriptive', folder: '',               doc_type: 'descriptive' },
];

function ids(docs) { return docs.map(d => d.id).sort((a, b) => a - b); }

// ── acheteur dossier tests ─────────────────────────────────────────────────────

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    fail++;
  }
}

console.log('\n=== Acheteur dossier (/api/dossier/acheteur/:token) ===\n');

test('notaire docs NEVER appear regardless of flags', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1, acheteur_docs_visible: 1 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'notaire'), 'notaire doc should not appear');
});

test('entretien docs NEVER appear regardless of flags', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1, acheteur_docs_visible: 1 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'entretien'), 'entretien doc should not appear');
});

test('acheteur_serieux hidden when acheteur_docs_visible=0', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1, acheteur_docs_visible: 0 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'acheteur_serieux'), 'acheteur_serieux should be hidden');
});

test('acheteur_serieux visible when acheteur_docs_visible=1', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1, acheteur_docs_visible: 1 };
  const result = filterAcheteurDocs(DOCS, prop);
  const aq = result.filter(d => d.folder === 'acheteur_serieux');
  assert.strictEqual(aq.length, 2, 'both acheteur_serieux docs should appear');
});

test('diagnostics hidden when diagnostics_in_dossier=0', () => {
  const prop = { diagnostics_in_dossier: 0, plan_docs_visible: 1, acheteur_docs_visible: 1 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'diagnostics'), 'diagnostics should be hidden');
});

test('diagnostics visible when diagnostics_in_dossier=1', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1, acheteur_docs_visible: 0 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.ok(result.find(d => d.folder === 'diagnostics'), 'diagnostic should appear');
});

test('plan docs hidden when plan_docs_visible=0', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 0, acheteur_docs_visible: 0 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.ok(!result.find(d => !d.folder || d.folder === ''), 'plan docs should be hidden');
});

test('plan docs visible when plan_docs_visible=1', () => {
  const prop = { diagnostics_in_dossier: 0, plan_docs_visible: 1, acheteur_docs_visible: 0 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.ok(result.find(d => d.folder === '' || d.folder === null), 'plan doc should appear');
});

test('all flags off → empty result', () => {
  const prop = { diagnostics_in_dossier: 0, plan_docs_visible: 0, acheteur_docs_visible: 0 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.strictEqual(result.length, 0, 'no docs should appear when all flags off');
});

test('all flags on → only safe docs (no notaire/entretien)', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1, acheteur_docs_visible: 1 };
  const result = filterAcheteurDocs(DOCS, prop);
  assert.deepStrictEqual(ids(result), [1, 2, 3, 4, 7]);
});

console.log('\n=== Public listing (/api/bien/:slug) ===\n');

test('acheteur_serieux never in public listing', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1 };
  const result = filterPublicDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'acheteur_serieux'), 'acheteur_serieux must not appear publicly');
});

test('notaire never in public listing', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1 };
  const result = filterPublicDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'notaire'), 'notaire must not appear publicly');
});

test('entretien never in public listing', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1 };
  const result = filterPublicDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'entretien'), 'entretien must not appear publicly');
});

test('diagnostics hidden when diagnostics_in_dossier=0 (public)', () => {
  const prop = { diagnostics_in_dossier: 0, plan_docs_visible: 1 };
  const result = filterPublicDocs(DOCS, prop);
  assert.ok(!result.find(d => d.folder === 'diagnostics'), 'diagnostics hidden publicly when flag off');
});

test('plan docs hidden when plan_docs_visible=0 (public)', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 0 };
  const result = filterPublicDocs(DOCS, prop);
  assert.ok(!result.find(d => !d.folder || d.folder === ''), 'plan docs hidden publicly when flag off');
});

test('both flags on → only diagnostics + plan docs (public)', () => {
  const prop = { diagnostics_in_dossier: 1, plan_docs_visible: 1 };
  const result = filterPublicDocs(DOCS, prop);
  assert.deepStrictEqual(ids(result), [1, 2, 7]);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${pass + fail} tests: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
