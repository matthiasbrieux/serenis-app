// Interface de cette page uniquement. Aucun accès aux biens ni transmission publique.
(function () {
  'use strict';
  const form = document.getElementById('filters-form');
  if (!form) return;
  // Même état visuel que le header, sans modifier le filtrage.
  const header = document.querySelector('.nav');
  const searchSubmit = form.querySelector('.search-submit');
  const resetButton = form.querySelector('[type="reset"]');
  function syncSearchPalette() {
    const dark = header.classList.contains('is-scrolled');
    form.classList.toggle('search-is-dark', dark);
    form.style.setProperty('--search-surface', getComputedStyle(header).getPropertyValue('--nav-bg').trim() || 'var(--terracotta)');
    searchSubmit.setAttribute('data-vpm-action', dark ? 'light' : 'solid');
    searchSubmit.style.setProperty('--vpm-rest-bg', dark ? 'var(--blanc)' : 'var(--terracotta)');
    searchSubmit.style.setProperty('--vpm-rest-ink', dark ? 'var(--terracotta)' : 'var(--blanc)');
    if (resetButton) {
      resetButton.style.setProperty('--vpm-rest-ink', dark ? 'var(--blanc)' : 'var(--terracotta)');
      resetButton.style.setProperty('--vpm-link-hover', dark ? 'var(--blanc)' : 'var(--terracotta)');
    }
  }
  if (header && searchSubmit) {
    new MutationObserver(syncSearchPalette).observe(header, { attributes: true, attributeFilter: ['class'] });
    syncSearchPalette();
  }
  const privatePreview = document.body.hasAttribute('data-private-preview');
  // Le mode privé est injecté uniquement par le serveur local isolé ;
  // aucun paramètre d'URL ne peut l'activer sur la page publique.
  if (!privatePreview) {
    form.addEventListener('submit', function (event) { event.preventDefault(); });
  }
  const filtersToggle = document.getElementById('filters-toggle');
  filtersToggle.addEventListener('click', function () {
    const open = form.classList.toggle('filters-open');
    filtersToggle.setAttribute('aria-expanded', String(open));
    filtersToggle.querySelector('span').textContent = open ? '−' : '+';
  });
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  function setMenu(open) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  toggle.addEventListener('click', function () { setMenu(menu.hidden); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  window.addEventListener('resize', function () { if (innerWidth > 1200) setMenu(false); });
})();
