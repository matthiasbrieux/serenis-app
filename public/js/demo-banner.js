(function () {
  function inject(seller) {
    if (!seller || !seller.is_demo) return;
    if (document.getElementById('demo-mode-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'demo-mode-banner';
    banner.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:10px 20px;',
      'background:linear-gradient(135deg,#4a1d96,#6d28d9);color:#fff;font-size:0.82rem;font-weight:500;',
      'position:fixed;top:0;left:0;right:0;z-index:9999;text-align:center;">',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">',
      '<path d="M1 6l5.5 5.5L12 5l5.5 6.5L23 6"/><path d="M1 18l5.5-5.5L12 19l5.5-6.5L23 18"/></svg>',
      '<strong>MODE DÉMONSTRATION</strong>',
      '<span style="opacity:0.85;">Compte fictif — aucune donnée réelle, aucun email envoyé.</span>',
      '<a href="/vrp/dashboard" style="color:#fff;text-decoration:underline;font-weight:600;white-space:nowrap;">← Retour espace VRP</a>',
      '</div>',
    ].join('');

    document.body.insertBefore(banner, document.body.firstChild);

    var bannerH = banner.offsetHeight || 42;
    document.querySelectorAll('.main-content,.sidebar').forEach(function (el) {
      el.style.marginTop = (parseInt(getComputedStyle(el).marginTop) || 0) + bannerH + 'px';
    });
  }

  window.VPMDemo = { inject: inject };

  // Auto-detect demo mode on page load — one lightweight fetch to /api/me
  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.seller) inject(d.seller); })
    .catch(function () {});
})();
