'use strict';
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// ── Configuration TVA ────────────────────────────────────────────────────────
// LEGAL_TVA_STATUS doit être défini explicitement dans le .env :
//   'franchise'           → TVA non applicable, art. 293 B du CGI
//   'taux_20'             → TVA 20 % appliquée
//   'exonere_formation'   → Exonération art. 261-4-4° du CGI
//
// Aucune valeur par défaut : l'absence de configuration bloque l'émission
// de factures plutôt que de supposer un régime fiscal.
const VALID_TVA_STATUS = new Set(['franchise', 'taux_20', 'exonere_formation']);
function getTvaStatus() {
  const v = process.env.LEGAL_TVA_STATUS;
  if (!v) throw new Error('[FACTURE] LEGAL_TVA_STATUS non configuré. Valeurs acceptées : franchise, taux_20, exonere_formation. Faire valider le statut TVA par un comptable avant d\'émettre des factures.');
  if (!VALID_TVA_STATUS.has(v)) throw new Error(`[FACTURE] LEGAL_TVA_STATUS="${v}" invalide. Valeurs acceptées : franchise, taux_20, exonere_formation.`);
  return v;
}

function computeTax(amountTTC) {
  switch (getTvaStatus()) {
    case 'taux_20': {
      const htCents = Math.round(amountTTC / 1.2);
      const tvaCents = amountTTC - htCents;
      return { htCents, tvaCents, tvaRate: 20, mention: null };
    }
    case 'exonere_formation':
      return { htCents: amountTTC, tvaCents: 0, tvaRate: 0, mention: 'Exonération de TVA, article 261-4-4° du CGI' };
    default: // 'franchise'
      return { htCents: amountTTC, tvaCents: 0, tvaRate: null, mention: 'TVA non applicable, article 293 B du CGI' };
  }
}

function fmtEur(cents) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ── Allocation du numéro (transactionnelle, atomique) ────────────────────────
// better-sqlite3 est synchrone : la transaction est vérouillée au niveau SQLite.
// Aucune autre instance Node.js ne peut interférer pendant l'exécution.
function allocateInvoiceNumber(db, year) {
  const allocate = db.transaction((y) => {
    db.prepare('INSERT OR IGNORE INTO invoice_sequences (year, next_seq) VALUES (?,1)').run(y);
    const { next_seq } = db.prepare('SELECT next_seq FROM invoice_sequences WHERE year=?').get(y);
    db.prepare('UPDATE invoice_sequences SET next_seq=next_seq+1 WHERE year=?').run(y);
    return next_seq;
  });
  const seq = allocate(year);
  return { seq, number: `VPM-${year}-${String(seq).padStart(5, '0')}` };
}

// ── Génération PDF ────────────────────────────────────────────────────────────
function generatePdf({ invoiceNumber, date, seller, amountTTC, pack }) {
  const legal = {
    raisonSociale:  process.env.LEGAL_RAISON_SOCIALE  || '',
    formeJuridique: process.env.LEGAL_FORME_JURIDIQUE || '',
    adresse:        process.env.LEGAL_ADRESSE_SIEGE   || '',
    siren:          process.env.LEGAL_SIREN           || '',
    rcs:            process.env.LEGAL_RCS             || '',
    tvaIntra:       process.env.LEGAL_TVA_INTRA       || null,
  };

  const { htCents, tvaCents, tvaRate, mention } = computeTax(amountTTC);
  const packLabel = pack === 'serenite' ? 'Pack Accompagnement' : 'Pack Autonomie';
  const packDesc  = pack === 'serenite'
    ? 'Accès plateforme Vendu Par Moi + accompagnement personnalisé (formation, coach IA, agenda, publications)'
    : 'Accès plateforme Vendu Par Moi (formation, coach IA, agenda, publications)';
  const dateStr     = new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const clientName  = `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || seller.email;

  // Couleurs
  const GREEN      = '#0C1910';
  const TERRACOTTA = '#C4603A';
  const LIGHT_GRAY = '#F5F5F0';
  const MID_GRAY   = '#888888';
  const TEXT       = '#1A1A1A';
  const WHITE      = '#FFFFFF';

  const W = 495; // largeur utile (595 - 2×50)
  const L = 50;  // marge gauche

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: `Facture ${invoiceNumber}`, Author: 'Vendu Par Moi', Subject: `Facture ${invoiceNumber}` },
      compress: true,
    });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Bandeau haut ──────────────────────────────────────────────
    doc.rect(0, 0, 595, 70).fill(GREEN);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE)
      .text('VENDU PAR MOI', L, 18, { lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.65)')
      .text('venduparmoi.fr', L, 42, { lineBreak: false });
    // "FACTURE" aligné à droite dans le bandeau
    doc.fontSize(16).font('Helvetica-Bold').fillColor(TERRACOTTA)
      .text('FACTURE', 0, 22, { width: 545, align: 'right', lineBreak: false });

    let y = 90;

    // ── Numéro + date ──────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT)
      .text('N° ', L, y, { continued: true })
      .font('Helvetica').text(invoiceNumber, { lineBreak: false });
    doc.fontSize(10).font('Helvetica').fillColor(MID_GRAY)
      .text(`Date d'émission : ${dateStr}`, 0, y, { width: 545, align: 'right', lineBreak: false });

    y += 30;
    // ── Ligne séparatrice ──────────────────────────────────────────
    doc.moveTo(L, y).lineTo(545, y).strokeColor('#DDDDDD').lineWidth(0.5).stroke();

    y += 20;
    // ── Blocs émetteur / client ────────────────────────────────────
    const colW = (W - 20) / 2;

    // Émetteur
    doc.rect(L, y, colW, 110).fill(LIGHT_GRAY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TERRACOTTA)
      .text('ÉMETTEUR', L + 10, y + 10);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT)
      .text(legal.raisonSociale ? `${legal.raisonSociale} (${legal.formeJuridique})` : 'Vendu Par Moi', L + 10, y + 24);
    let ey = y + 38;
    if (legal.adresse) {
      doc.fontSize(8.5).font('Helvetica').fillColor(TEXT).text(legal.adresse, L + 10, ey, { width: colW - 20 });
      ey += 22;
    }
    if (legal.siren) {
      doc.fontSize(8.5).font('Helvetica').fillColor(TEXT).text(`SIREN : ${legal.siren}`, L + 10, ey);
      ey += 14;
    }
    if (legal.rcs) {
      doc.fontSize(8.5).font('Helvetica').fillColor(TEXT).text(`RCS : ${legal.rcs}`, L + 10, ey);
      ey += 14;
    }
    if (legal.tvaIntra) {
      doc.fontSize(8.5).font('Helvetica').fillColor(TEXT).text(`N° TVA : ${legal.tvaIntra}`, L + 10, ey);
    }

    // Client
    const cx = L + colW + 20;
    doc.rect(cx, y, colW, 110).fill(LIGHT_GRAY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TERRACOTTA).text('CLIENT', cx + 10, y + 10);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT).text(clientName, cx + 10, y + 24);
    doc.fontSize(8.5).font('Helvetica').fillColor(TEXT).text(seller.email, cx + 10, y + 40);

    y += 130;

    // ── Tableau prestations ────────────────────────────────────────
    const colWidths = [260, 60, 80, 80]; // Description, Qté, Prix HT, Total
    const colX = [L, L + 260, L + 320, L + 400];

    // En-tête tableau
    doc.rect(L, y, W, 24).fill(GREEN);
    const headers = ['Description', 'Qté', 'Prix HT', 'Total TTC'];
    headers.forEach((h, i) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE)
        .text(h, colX[i] + 6, y + 7, { width: colWidths[i] - 6, lineBreak: false });
    });

    y += 24;

    // Ligne prestation
    doc.rect(L, y, W, 55).fill(WHITE).strokeColor('#E0E0E0').lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT)
      .text(packLabel, colX[0] + 6, y + 8, { width: colWidths[0] - 12 });
    doc.fontSize(8).font('Helvetica').fillColor(MID_GRAY)
      .text(packDesc, colX[0] + 6, y + 22, { width: colWidths[0] - 12 });
    doc.fontSize(9).font('Helvetica').fillColor(TEXT)
      .text('1', colX[1] + 6, y + 18, { width: colWidths[1] - 6, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(TEXT)
      .text(fmtEur(htCents), colX[2] + 6, y + 18, { width: colWidths[2] - 6, lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT)
      .text(fmtEur(amountTTC), colX[3] + 6, y + 18, { width: colWidths[3] - 6, lineBreak: false });

    y += 70;

    // ── Totaux ─────────────────────────────────────────────────────
    const totX = L + 260;
    const totW = W - 260;
    function totalRow(label, value, bold = false, highlight = false) {
      if (highlight) doc.rect(totX, y, totW, 22).fill(GREEN);
      else           doc.rect(totX, y, totW, 22).fill(LIGHT_GRAY);
      doc.fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(highlight ? WHITE : TEXT)
        .text(label, totX + 8, y + 6, { width: totW / 2 - 8, lineBreak: false });
      doc.fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(highlight ? WHITE : TEXT)
        .text(value, totX + totW / 2, y + 6, { width: totW / 2 - 8, align: 'right', lineBreak: false });
      y += 23;
    }

    if (tvaRate === 20) {
      totalRow('Total HT', fmtEur(htCents));
      totalRow(`TVA ${tvaRate} %`, fmtEur(tvaCents));
    }
    totalRow('Total TTC', fmtEur(amountTTC), true, true);

    y += 20;

    // ── Mention TVA ─────────────────────────────────────────────────
    if (mention) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor(MID_GRAY)
        .text(mention, L, y, { width: W });
      y += 20;
    }

    y += 10;

    // ── Informations paiement ───────────────────────────────────────
    doc.rect(L, y, W, 36).fill(LIGHT_GRAY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT)
      .text('Mode de règlement :', L + 10, y + 8, { lineBreak: false });
    doc.fontSize(8).font('Helvetica').fillColor(TEXT)
      .text(' Carte bancaire via Stripe — paiement à la commande', { continued: false });
    doc.fontSize(8).font('Helvetica').fillColor(TEXT)
      .text(`Réglé le ${dateStr}`, L + 10, y + 22);

    // ── Pied de page ────────────────────────────────────────────────
    doc.fontSize(7.5).font('Helvetica').fillColor(MID_GRAY)
      .text(
        'Vendu Par Moi — contact@venduparmoi.fr — venduparmoi.fr',
        L, 800, { width: W, align: 'center' }
      );

    doc.end();
  });
}

// ── Émission d'une facture (idempotente) ─────────────────────────────────────
// Vérifie si une facture existe déjà pour ce vendeur avant d'en créer une.
// Si oui, retourne l'enregistrement existant sans créer de doublon.
async function issueInvoice(db, seller, { amountTTC, pack, stripeSessionId, date }) {
  // Idempotence : si une facture est déjà archivée pour ce vendeur, ne pas en créer une autre.
  const existing = db.prepare('SELECT * FROM invoices WHERE seller_id=?').get(seller.id);
  if (existing) return existing;

  // Récupérer ou allouer le numéro de facture
  let invoiceNumber = seller.invoice_number;
  let seq = null;
  const year = new Date(date || Date.now()).getFullYear();

  if (!invoiceNumber) {
    const allocated = allocateInvoiceNumber(db, year);
    invoiceNumber = allocated.number;
    seq = allocated.seq;
    // Écriture immédiate sur la table sellers (compatible avec l'ancien système)
    db.prepare('UPDATE sellers SET invoice_number=? WHERE id=? AND invoice_number IS NULL').run(invoiceNumber, seller.id);
  } else {
    // Extraire le seq depuis le numéro existant (format VPM-YYYY-NNNNN)
    const m = invoiceNumber.match(/^VPM-\d{4}-(\d+)/);
    seq = m ? parseInt(m[1], 10) : null;
  }

  const { htCents, tvaCents, tvaRate } = computeTax(amountTTC);

  const pdfBuffer = await generatePdf({
    invoiceNumber,
    date: date || new Date(),
    seller,
    amountTTC,
    pack,
  });

  const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  const finalSeller = db.prepare('SELECT * FROM sellers WHERE id=?').get(seller.id);

  db.prepare(`
    INSERT INTO invoices
      (seller_id, invoice_number, year, seq, amount_ttc, amount_ht, tva_rate, tva_amount,
       pack, pdf_data, pdf_hash, stripe_session_id, client_email, client_first_name, client_last_name)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    seller.id, invoiceNumber, year, seq,
    amountTTC, htCents, tvaRate, tvaCents,
    pack, pdfBuffer, pdfHash,
    stripeSessionId || null,
    seller.email, seller.first_name || null, seller.last_name || null,
  );

  return db.prepare('SELECT * FROM invoices WHERE seller_id=?').get(seller.id);
}

// ── Récupération du PDF archivé ──────────────────────────────────────────────
function getArchivedInvoice(db, sellerId) {
  return db.prepare('SELECT * FROM invoices WHERE seller_id=?').get(sellerId);
}

// ── Initialisation du compteur depuis les factures existantes ────────────────
// À appeler une fois au démarrage pour ne pas repartir de 1 si des factures
// ont déjà été émises avant l'adoption de ce système.
function initSequenceFromExisting(db) {
  try {
    const rows = db.prepare(`
      SELECT invoice_number FROM sellers WHERE invoice_number IS NOT NULL
      UNION
      SELECT invoice_number FROM invoices
    `).all();
    const byYear = {};
    for (const { invoice_number } of rows) {
      const m = String(invoice_number).match(/^VPM-(\d{4})-(\d+)/);
      if (!m) continue;
      const y = parseInt(m[1], 10);
      const s = parseInt(m[2], 10);
      if (!byYear[y] || s > byYear[y]) byYear[y] = s;
    }
    for (const [year, maxSeq] of Object.entries(byYear)) {
      db.prepare(`
        INSERT INTO invoice_sequences (year, next_seq) VALUES (?,?)
        ON CONFLICT(year) DO UPDATE SET next_seq=MAX(next_seq, excluded.next_seq)
      `).run(parseInt(year, 10), maxSeq + 1);
    }
  } catch(e) {
    console.error('[INVOICE] initSequenceFromExisting error:', e.message);
  }
}

module.exports = { issueInvoice, getArchivedInvoice, allocateInvoiceNumber, computeTax, generatePdf, initSequenceFromExisting, VALID_TVA_STATUS };
