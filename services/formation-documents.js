const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const documents = Object.freeze({
  'etat-civil': { title: 'Fiche de renseignements d’état civil', heading: 'Préparez dès maintenant les informations pour le notaire', source: 'Renseignements d’état civil · Page 53 du guide', intro: 'Pour faciliter la préparation du compromis de vente, Vendu Par Moi met à votre disposition une fiche de renseignements d’état civil à transmettre à votre acheteur. Il pourra la compléter et la remettre à son notaire afin d’anticiper les formalités et d’éviter des délais inutiles.', chapter: 'La signature de mon compromis', lesson: 3, note: 'Cette fiche contient des informations personnelles. Transmettez-la directement à votre acheteur pour qu’il la remette à son notaire de manière sécurisée.' },
  'etat-des-lieux': { title: 'Fiche d’état des lieux', heading: 'Préparez votre dernière visite et la remise des clés', source: 'Fiche d’état des lieux · Page 57 du guide', intro: 'Avant la signature définitive, une dernière visite du bien permet de vérifier son état, de relever les compteurs et de préparer la remise des clés. Pour ne rien oublier, Vendu Par Moi met à votre disposition une fiche d’état des lieux prête à imprimer et à compléter avec votre acheteur.', chapter: 'Les 3 dates jusqu’à la vente de mon bien', lesson: 4, note: '' }
});
function renderDocument(slug, { pdf = false } = {}) {
  const doc = documents[slug];
  if (!Object.hasOwn(documents, slug)) throw new Error('Fiche inconnue');
  const content = fs.readFileSync(path.join(root, 'views/seller/formation-documents', `${slug}.html`), 'utf8');
  const asset = (file, mime) => pdf ? `data:${mime};base64,${fs.readFileSync(path.join(root, 'public', file)).toString('base64')}` : `/${file}`;
  const css = pdf ? `<style>${fs.readFileSync(path.join(root, 'public/css/formation-documents.css'), 'utf8')
    .replaceAll('/fonts/vpm-sans.ttf', asset('fonts/vpm-sans.ttf', 'font/ttf'))
    .replaceAll('/fonts/vpm-sans-bold.ttf', asset('fonts/vpm-sans-bold.ttf', 'font/ttf'))
    .replaceAll('/fonts/vpm-editorial.ttf', asset('fonts/vpm-editorial.ttf', 'font/ttf'))}</style>` : '<link rel="stylesheet" href="/css/formation-documents.css?v=2">';
  const logo = asset('images/email-logo.png', 'image/png');
  const actions = `<div class="document-actions"><a class="document-button primary" href="/ma-formation/documents/${slug}/pdf" download><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/></svg><span>Enregistrer en PDF</span></a><button class="document-button secondary" type="button" data-print><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H3V9h18v8h-4M7 14h10v7H7Z"/><path d="M17 11h1"/></svg><span>Imprimer la fiche</span></button></div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${doc.title} — Vendu Par Moi</title>${css}</head><body class="formation-document-page ${slug}">
    <header class="document-site-header"><a href="/ma-formation" aria-label="Vendu Par Moi — Ma formation"><img src="${logo}" alt="Vendu Par Moi" width="1200" height="347"></a><a href="/ma-formation#formation/lecon/6/${doc.lesson}">← Retour à ma formation</a></header>
    <div class="document-layout"><aside class="document-sidebar"><img class="document-sidebar-photo" src="${pdf ? '' : '/images/formation/chapitre1/chapitre-1-hero.jpg'}" alt=""><div><strong>Ma formation</strong><p>Je négocie et je conclus</p><span class="document-sidebar-current">${doc.chapter}</span><a href="/ma-formation">← Retrouver ma formation</a><hr><strong>Vos documents prêts à l’emploi</strong><a href="/ma-formation/documents/etat-civil" ${slug === 'etat-civil' ? 'aria-current="page"' : ''}>Renseignements d’état civil</a><a href="/ma-formation/documents/etat-des-lieux" ${slug === 'etat-des-lieux' ? 'aria-current="page"' : ''}>Fiche d’état des lieux</a></div></aside>
    <main class="document-main"><nav class="document-breadcrumb" aria-label="Fil d’Ariane"><a href="/ma-formation">Ma formation</a><span aria-hidden="true">/</span><a href="/ma-formation#formation/chapitre/6">Je négocie et je conclus</a><span aria-hidden="true">/</span><span aria-current="page">${doc.title}</span></nav><section class="document-introduction"><h1>${doc.title}</h1><h2>${doc.heading}</h2><p>${doc.intro}</p>${doc.note ? `<p class="document-privacy"><span aria-hidden="true">ⓘ</span>${doc.note}</p>` : ''}${actions}</section>
    <section class="document-presentation" aria-label="Document complet"><div class="document-paper"><header class="document-paper-brand"><img src="${logo}" alt="Vendu Par Moi" width="1200" height="347"></header><article class="document-content">${content}</article><footer class="document-paper-footer"><span>VENDU PAR MOI</span><span>${doc.source}</span></footer></div></section>${actions}<p class="document-status" role="status"></p></main></div>${pdf ? '' : '<script src="/js/formation-documents.js?v=1"></script>'}</body></html>`;
}
async function generateDocumentPdf(slug) {
  const html = renderDocument(slug, { pdf: true });
  const browser = await require('puppeteer').launch({ headless: true, args: [], timeout: 20000 });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', req => req.url().startsWith('data:') ? req.continue() : req.abort());
    await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true, timeout: 20000 }));
  } finally { await browser.close(); }
}
module.exports = { documents, renderDocument, generateDocumentPdf };
