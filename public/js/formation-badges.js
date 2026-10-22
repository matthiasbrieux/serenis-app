/* Official PNGs only. Presentation hooks restricted to approved headings. */
(() => {
  'use strict';
  const container = document.getElementById('modContainer');
  if (!container) return;
  const files = {
    outil: '02_BADGE_VOTRE_OUTIL_VPM.png',
    avantage: '01_BADGE_VOTRE_AVANTAGE_VPM.png',
  };
  function heading(step, text) {
    return Array.from(step.querySelectorAll('.sst-title')).find(node => node.textContent.trim() === text);
  }
  function place(step, target, key, kind) {
    if (!target) return;
    let badge = step.querySelector(`[data-vpm-badge="${key}"]`);
    if (badge && badge.parentElement === target.parentElement) return;
    if (!badge) {
      badge = document.createElement('img');
      badge.className = 'vpm-official-badge';
      badge.dataset.vpmBadge = key;
      badge.dataset.vpmBadgeKind = kind;
      badge.src = key === 'valeur'
        ? '/images/formation/valeur/badge-outil-transparent.png'
        : '/images/formation/badges/' + files[kind];
      badge.alt = kind === 'outil' ? 'Votre outil Vendu Par Moi' : 'Votre avantage Vendu Par Moi';
      badge.width = 989;
      badge.height = 419;
      badge.decoding = 'async';
    }
    let header = target.parentElement;
    if (!header.classList.contains('vpm-badge-heading')) {
      header = document.createElement('div');
      header.className = 'vpm-badge-heading';
      target.before(header);
      header.append(target);
    }
    header.append(badge);
  }
  function update() {
    const commune = container.querySelector('#step-0-0');
    if (commune) place(commune, commune.querySelector('.pr-commune-wrap .pr-bench-title') || commune.querySelector('#price-reference-title'), 'commune', 'outil');
    const nearby = container.querySelector('#step-0-1');
    if (nearby) {
      place(nearby, nearby.querySelector('.pr-calc-title'), 'valeur', 'outil');
    }
    const price = container.querySelector('#step-0-2');
    if (price) {
      place(price, price.querySelector('.formation-method-section .pt-ann-pm2-val'), 'annonces', 'outil');
      place(price, heading(price, 'VOTRE RÉFÉRENCE DE MARCHÉ'), 'reference', 'outil');
      place(price, heading(price, 'DÉFINISSEZ VOTRE PRIX DE VENTE SOUHAITÉ'), 'souhaite', 'outil');
    }
    const advantage = container.querySelector('#step-0-3');
    if (advantage) {
      place(advantage, heading(advantage, "TROIS POSSIBILITÉS S'OFFRENT À VOUS"), 'strategies', 'avantage');
      place(advantage, heading(advantage, "CE QU'IL FAUT RETENIR"), 'synthese', 'avantage');
    }
    const approved = [
      ['step-1-1', 'Les diagnostics à réaliser pour votre logement', 'diagnostics', 'outil'],
      ['step-1-2', 'VOTRE ACTION — COMPLÉTER MA FICHE', 'fiche', 'outil'],
      ['step-1-3', 'TROIS DOSSIERS, TROIS OBJECTIFS', 'partage', 'avantage'],
      ['step-2-1', 'LES QUATRE ALBUMS À RETENIR', 'albums', 'outil'],
      ['step-2-2', "VOTRE OUTIL — LE GÉNÉRATEUR D'ANNONCE VENDU PAR MOI", 'annonce', 'outil'],
      ['step-2-3', 'VOTRE ACTION — PUBLIER VOTRE ANNONCE', 'publications', 'avantage'],
      ['step-3-0', '2 — RENSEIGNEZ VOS DISPONIBILITÉS', 'agenda', 'outil'],
      ['step-3-1', 'À RETENIR', 'qualification', 'avantage'],
      ['step-5-1', '10 — UTILISEZ « MES OFFRES » DANS VOTRE APPLICATION', 'offres', 'outil'],
      ['step-5-2', '5 — PRÉPAREZ VOTRE DOSSIER NOTAIRE', 'notaire', 'outil'],
      ['step-5-3', '7 — UTILISEZ VOTRE AGENDA VENDU PAR MOI', 'echeances', 'outil'],
    ];
    approved.forEach(([id, title, key, kind]) => {
      const step = container.querySelector('#' + id);
      if (step) place(step, heading(step, title), key, kind);
    });
    // Existing shared checklists stay in their panel, with their original handlers.
    for (const [id, key] of [['ckWrap_photos', 'photos-checklist'], ['ckWrap_visite', 'visite-checklist']]) {
      const checklist = document.getElementById(id);
      if (checklist) place(checklist, checklist.querySelector('.ck-hdr-title'), key, 'outil');
    }
    // 2.1 has no separate document-access block; 5.2 has no identified model tool.
  }
  // Dynamic tools replace their output after API responses; no API or data hooks.
  new MutationObserver(update).observe(container, { childList: true, subtree: true });
  const checklists = document.getElementById('ckContainer');
  if (checklists) new MutationObserver(update).observe(checklists, { childList: true, subtree: true });
  update();
})();
