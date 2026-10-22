const express = require('express');
const { documents, renderDocument, generateDocumentPdf } = require('../services/formation-documents');
// Authentication is inherited from the seller router mount.
const router = express.Router();
router.param('slug', (req, res, next, slug) => {
  if (!Object.hasOwn(documents, slug)) return res.status(404).send('Fiche introuvable');
  next();
});
router.get('/:slug', (req, res) => res.type('html').send(renderDocument(req.params.slug)));
router.get('/:slug/pdf', require('express-rate-limit')({ windowMs: 60000, max: 6, standardHeaders: true, legacyHeaders: false, keyGenerator: req => String(req.seller.id), handler: (req, res) => res.status(429).send('Veuillez patienter avant de générer un autre PDF.') }), async (req, res) => {
  try {
    const pdf = await generateDocumentPdf(req.params.slug);
    res.set('Content-Disposition', `attachment; filename="Vendu-Par-Moi-${req.params.slug}.pdf"`);
    res.type('pdf').send(pdf);
  } catch (error) {
    console.error('Génération fiche formation impossible:', error.message);
    res.status(503).send('La génération du PDF est temporairement indisponible. Vous pouvez imprimer la fiche depuis sa page.');
  }
});
module.exports = router;
