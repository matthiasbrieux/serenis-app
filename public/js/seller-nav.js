// Badges notifications dans la sidebar
(async function loadBadges() {
  try {
    const r = await fetch('/api/notifications/counts');
    if (!r.ok) return;
    const { pendingOffers, upcomingVisits, unreadNotifs } = await r.json();
    function badge(selector, count) {
      if (!count) return;
      const el = document.querySelector(selector);
      if (!el) return;
      const span = document.createElement('span');
      span.textContent = count;
      span.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#C4603A;color:#fff;font-size:10px;font-weight:700;border-radius:50%;width:16px;height:16px;margin-left:6px;flex-shrink:0;';
      el.appendChild(span);
    }
    badge('a[href="/mes-offres"]', pendingOffers);
    badge('a[href="/mon-agenda"]', (upcomingVisits || 0) + (unreadNotifs || 0) || undefined);
  } catch(e) {}
})();

// Menu hamburger mobile — injecté dynamiquement sur toutes les pages vendeur
(function injectMobileNav() {
  const sidebar = document.querySelector('aside.sidebar, .sidebar');
  if (!sidebar || document.querySelector('.mobile-menu-btn')) return;

  // CSS mobile
  const style = document.createElement('style');
  style.textContent = `
    .mobile-menu-btn {
      display: none;
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 300;
      width: 44px;
      height: 44px;
      background: #3D5A47;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 5px;
      padding: 0;
      transition: opacity .2s, transform .2s;
    }
    .mobile-menu-btn span {
      display: block;
      width: 20px;
      height: 2px;
      background: #FDFCF8;
      border-radius: 2px;
    }
    /* Bouton fermer intégré dans le header sidebar */
    .sidebar-close-btn {
      display: none;
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      color: rgba(253,252,248,0.8);
      font-size: 1.1rem;
      line-height: 1;
      transition: background .15s;
      z-index: 10;
    }
    .sidebar-close-btn:hover { background: rgba(255,255,255,0.18); }
    .snav-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 199;
    }
    @media (max-width: 768px) {
      .mobile-menu-btn { display: flex !important; }
      .sidebar-close-btn { display: flex !important; }
      aside.sidebar, .sidebar {
        transform: translateX(-100%);
        transition: transform .25s cubic-bezier(.4,0,.2,1);
        z-index: 200;
        position: fixed !important;
      }
      .sidebar-logo { position: relative; }
      aside.sidebar.open, .sidebar.open {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0,0,0,.25);
      }
      .snav-overlay.open { display: block; }
      .main, .content, main { margin-left: 0 !important; padding-top: 64px !important; }
    }
    @media (max-width: 480px) {
      .main, .content, main { padding-left: 16px !important; padding-right: 16px !important; }
    }
  `;
  document.head.appendChild(style);

  // Bouton hamburger (visible uniquement quand sidebar fermée)
  const btn = document.createElement('button');
  btn.className = 'mobile-menu-btn';
  btn.setAttribute('aria-label', 'Ouvrir le menu');
  btn.innerHTML = '<span></span><span></span><span></span>';
  document.body.prepend(btn);

  // Bouton fermer intégré dans le header de la sidebar
  const closeBtn = document.createElement('button');
  closeBtn.className = 'sidebar-close-btn';
  closeBtn.setAttribute('aria-label', 'Fermer le menu');
  closeBtn.innerHTML = '✕';
  const sidebarLogo = sidebar.querySelector('.sidebar-logo');
  if (sidebarLogo) sidebarLogo.appendChild(closeBtn);
  else sidebar.insertBefore(closeBtn, sidebar.firstChild);

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'snav-overlay';
  document.body.appendChild(overlay);

  function openMenu() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    // Cacher le hamburger externe pour ne pas couvrir le logo
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
    btn.style.transform = 'scale(0.8)';
  }
  function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    btn.style.opacity = '1';
    btn.style.pointerEvents = '';
    btn.style.transform = '';
  }

  btn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  // Fermer quand on clique sur un lien sidebar (navigation)
  sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
})();
