// Navigation vendeur commune — maquette navigation validée, octobre 2026.
(function buildSellerNavigation() {
  const sidebar = document.querySelector('aside.sidebar, .sidebar');
  if (!sidebar) return;
  sidebar.classList.add('vpm-navigation');
  if (!document.querySelector('link[href^="/css/seller-navigation.css"]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/css/seller-navigation.css?v=2';
    document.head.appendChild(css);
  }
  const groups = [{"title": "Mon espace", "items": [{"href": "/dashboard", "title": "Ma vente", "sub": "Vue d'ensemble et prochaines étapes", "help": "Retrouvez ici la vue d'ensemble de votre vente : votre avancement, les prochaines étapes et les actions à effectuer.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/></svg>"}, {"href": "/mon-agenda", "title": "Mon agenda", "sub": "Visites et disponibilités", "help": "Gérez vos disponibilités, consultez vos visites et proposez facilement des créneaux aux acheteurs.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/></svg>"}, {"href": "/mon-bien", "title": "Mon bien", "sub": "Infos, documents, fiche, photos", "help": "Commencez ici pour préparer votre vente : renseignez les informations de votre logement, ajoutez les documents nécessaires, complétez votre fiche descriptive et déposez vos photos.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/></svg>"}]}, {"title": "Vendre pas à pas", "items": [{"href": "/ma-formation", "title": "Ma formation", "sub": "Les 6 étapes pour vendre", "help": "Découvrez les six étapes de la méthode Vendu Par Moi pour vendre votre logement vous-même, en toute confiance.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z\"/><path d=\"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z\"/></svg>"}, {"href": "/mon-guide-photos", "title": "Mon guide photos", "sub": "Des conseils pour réussir vos photos", "help": "Retrouvez nos conseils pour photographier votre logement et le présenter sous son meilleur jour.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/></svg>"}]}, {"title": "Gérer ma vente", "items": [{"href": "/mes-publications", "title": "Mon annonce en ligne", "sub": "Publication et suivi", "help": "Retrouvez les outils pour publier votre annonce sur les plateformes immobilières et suivre vos publications.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12.55a11 11 0 0 1 14.08 0\"/><path d=\"M1.42 9a16 16 0 0 1 21.16 0\"/><path d=\"M8.53 16.11a6 6 0 0 1 6.95 0\"/><circle cx=\"12\" cy=\"20\" r=\"1\"/></svg>"}, {"href": "/mes-offres", "title": "Mes offres d'achat", "sub": "Propositions et réponses", "help": "Consultez les propositions reçues et retrouvez les outils pour les examiner et y répondre.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z\"/><line x1=\"7\" y1=\"7\" x2=\"7.01\" y2=\"7\"/></svg>"}]}, {"title": "Mes outils", "items": [{"href": "/ma-bibliotheque", "title": "Ma boîte à outils", "sub": "Modèles, checklists et documents", "help": "Accédez aux modèles de messages, documents, checklists et ressources utiles pour votre vente.", "icon": "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/></svg>"}]}];
  const items = groups.flatMap(group => group.items);
  let nav = sidebar.querySelector('.sidebar-nav');
  if (!nav) { nav = document.createElement('nav'); nav.className = 'sidebar-nav'; sidebar.appendChild(nav); }
  nav.setAttribute('aria-label', 'Navigation de l’espace vendeur');
  // Retain existing anchors/badges where available; routes and application handlers stay intact.
  const anchors = new Map([...sidebar.querySelectorAll('a[href]')].map(a => [a.getAttribute('href'), a]));
  const activeHref = sidebar.querySelector('.sidebar-item.active')?.getAttribute('href');
  nav.replaceChildren();
  for (const group of groups) {
    const section = document.createElement('div'); section.className = 'sidebar-section'; section.textContent = group.title; nav.appendChild(section);
    for (const item of group.items) {
      const row = document.createElement('div'); row.className = 'vpm-nav-row';
      const a = anchors.get(item.href) || document.createElement('a');
      const badge = a.querySelector('.sidebar-badge');
      a.href = item.href; a.className = 'sidebar-item';
      const active = window.location.pathname.replace(/\/$/, '') === item.href || (activeHref === item.href && !items.some(i => i.href === window.location.pathname));
      if (active) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
      else a.removeAttribute('aria-current');
      a.innerHTML = item.icon;
      const copy = document.createElement('span'); copy.className = 'vpm-nav-copy';
      const title = document.createElement('span'); title.className = 'vpm-nav-title'; title.textContent = item.title;
      const sub = document.createElement('span'); sub.className = 'vpm-nav-sub'; sub.textContent = item.sub;
      copy.append(title, sub); a.appendChild(copy);
      if (badge) a.appendChild(badge);
      const arrow = document.createElement('span'); arrow.className = 'vpm-nav-arrow'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true'); a.appendChild(arrow);
      const help = document.createElement('button'); help.type = 'button'; help.className = 'vpm-nav-help'; help.textContent = '?'; help.setAttribute('aria-label', 'Aide : ' + item.title);
      help.addEventListener('click', () => showHelp(item, help));
      row.append(a, help); nav.appendChild(row);
    }
  }
  let footer = sidebar.querySelector('.sidebar-footer');
  if (!footer) { footer = document.createElement('div'); footer.className = 'sidebar-footer'; sidebar.appendChild(footer); }
  footer.replaceChildren();
  const label = document.createElement('div'); label.className = 'sidebar-section'; label.textContent = 'Mon compte'; footer.appendChild(label);
  for (const item of [{"href": "/cgv", "title": "CGV", "icon": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/></svg>"}, {"href": "/confidentialite", "title": "Confidentialité", "icon": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/></svg>"}, {"href": "/logout", "title": "Déconnexion", "icon": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><polyline points=\"16 17 21 12 16 7\"/><line x1=\"21\" y1=\"12\" x2=\"9\" y2=\"12\"/></svg>"}]) {
    const a = anchors.get(item.href) || document.createElement('a'); a.href = item.href; a.className = 'vpm-account-link';
    a.innerHTML = item.icon;
    const name = document.createElement('span'); name.textContent = item.title; a.appendChild(name); footer.appendChild(a);
  }
  const logo = sidebar.querySelector('.sidebar-logo img');
  if (logo) { logo.src = '/images/vendu-par-moi.svg'; logo.alt = 'Vendu Par Moi'; }
  let sellerKey = null, panel = null, returnFocus = null;
  const memoryKey = href => 'vpm:nav-help:v1:' + sellerKey + ':' + href;
  function validated(href) { try { return sellerKey && localStorage.getItem(memoryKey(href)) === 'understood'; } catch (_) { return true; } }
  function closeHelp(understood) {
    if (!panel) return;
    if (understood && sellerKey) { try { localStorage.setItem(memoryKey(panel.dataset.href), 'understood'); } catch (_) {} }
    panel.remove(); panel = null;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  function showHelp(item, trigger) {
    closeHelp(false); returnFocus = trigger || null;
    panel = document.createElement('section'); panel.className = 'vpm-context-help'; panel.dataset.href = item.href;
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','false'); panel.setAttribute('aria-labelledby','vpm-help-title'); panel.setAttribute('aria-describedby','vpm-help-description');
    const close = document.createElement('button'); close.type='button'; close.className='vpm-help-close'; close.textContent='×'; close.setAttribute('aria-label','Fermer l’aide'); close.addEventListener('click',()=>closeHelp(false));
    const heading = document.createElement('h2'); heading.id='vpm-help-title'; heading.innerHTML=item.icon;
    const title=document.createElement('span'); title.textContent=item.title; heading.appendChild(title);
    const text=document.createElement('p'); text.id='vpm-help-description'; text.textContent=item.help;
    const done=document.createElement('button'); done.type='button'; done.className='vpm-help-done'; done.textContent='Compris'; done.disabled=!sellerKey; done.addEventListener('click',()=>closeHelp(true));
    panel.append(close,heading,text,done); document.body.appendChild(panel);
    if (trigger) close.focus({preventScroll:true});
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel) { closeHelp(false); e.preventDefault(); } });
  // Preferences are local, account-scoped; no writes to seller data or new API route.
  fetch('/api/me', {credentials:'same-origin'}).then(r => r.ok ? r.json() : null).then(data => {
    const seller = data?.seller;
    const identity = seller?.uuid || seller?.id;
    if (identity === undefined || identity === null || identity === '') return;
    sellerKey = String(identity);
    if (panel) panel.querySelector('.vpm-help-done').disabled=false;
    const current=items.find(item => item.href === window.location.pathname.replace(/\/$/, ''));
    if (!panel && current && !validated(current.href)) showHelp(current);
  }).catch(()=>{});
})();

// Badges notifications dans la sidebar
(async function loadBadges() {
  try {
    const r = await fetch('/api/notifications/counts');
    if (!r.ok) return;
    const { pendingOffers, upcomingVisits, unreadNotifs } = await r.json();
    function badge(badgeId, fallbackHref, count) {
      if (!count) return;
      const existing = document.getElementById(badgeId);
      if (existing) { existing.textContent = count; existing.style.display = 'inline-flex'; return; }
      const el = document.querySelector('.sidebar')?.querySelector('a[href="' + fallbackHref + '"]');
      if (!el) return;
      const span = document.createElement('span');
      span.textContent = count;
      span.className = 'sidebar-badge';
      el.appendChild(span);
    }
    badge('offresBadge', '/mes-offres',      pendingOffers);
    badge('agendaBadge', '/mon-agenda',      upcomingVisits || undefined);
    badge('coachBadge',  '/coach-ia',        unreadNotifs   || undefined);
  } catch(e) {}
})();

// Menu hamburger mobile — injecté dynamiquement sur toutes les pages vendeur
(function injectMobileNav() {
  const sidebar = document.querySelector('aside.sidebar, .sidebar');
  if (!sidebar || document.querySelector('.mobile-menu-btn')) return;

  // ── Barre accent terracotta pleine largeur (mobile uniquement) ───
  const topAccentStyle = document.createElement('style');
  topAccentStyle.textContent = `
    @media (max-width: 768px) {
      body::before {
        content: '';
        display: block;
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 4px;
        background: #C4785A;
        z-index: 9999;
        pointer-events: none;
      }
    }
  `;
  document.head.appendChild(topAccentStyle);

  // CSS mobile
  const style = document.createElement('style');
  style.textContent = `
    .mobile-menu-btn {
      display: none;
      position: fixed;
      top: 16px;
      left: 12px;
      z-index: 300;
      width: 44px;
      height: 44px;
      background: var(--terracotta-dark);
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

  // ── Masquer le hamburger en scrollant vers le bas ─────────────
  let _lastScroll = 0;
  let _btnVisible = true;

  function setBtnVisible(visible) {
    if (_btnVisible === visible) return;
    _btnVisible = visible;
    btn.style.opacity = visible ? '1' : '0';
    btn.style.pointerEvents = visible ? '' : 'none';
    btn.style.transform = visible ? '' : 'translateY(-8px) scale(0.85)';
  }

  window.addEventListener('scroll', function () {
    if (sidebar.classList.contains('open')) return;
    const y = window.scrollY;
    if (y > _lastScroll && y > 80) {
      setBtnVisible(false);
    } else if (y < _lastScroll - 20 || y < 40) {
      setBtnVisible(true);
    }
    _lastScroll = y;
  }, { passive: true });

  // Fermer quand on clique sur un lien sidebar (navigation)
  sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
})();

// Reuse the existing hamburger/overlay handlers; add an accessible close action everywhere.
(function enhanceSellerMobileMenu() {
  const sidebar=document.querySelector('.vpm-navigation'); if (!sidebar) return;
  const trigger=document.querySelector('#mobileMenuBtn, .mobile-menu-btn');
  if (!sidebar.id) sidebar.id='sellerSidebar';
  const sync=()=> { if (trigger) { trigger.setAttribute('aria-controls',sidebar.id); trigger.setAttribute('aria-expanded',String(sidebar.classList.contains('open'))); trigger.setAttribute('aria-label',sidebar.classList.contains('open') ? 'Fermer le menu' : 'Ouvrir le menu'); } };
  new MutationObserver(sync).observe(sidebar,{attributes:true,attributeFilter:['class']}); sync();
  function closeMenu() {
    sidebar.classList.remove('open');
    document.querySelectorAll('.sidebar-overlay,.snav-overlay').forEach(el=>el.classList.remove('open'));
    if (trigger) { trigger.classList.remove('is-open'); trigger.setAttribute('aria-label','Ouvrir le menu'); trigger.style.opacity='1'; trigger.style.pointerEvents=''; trigger.style.transform=''; trigger.focus({preventScroll:true}); }
  }
  if (!sidebar.querySelector('.sidebar-close-btn')) {
    const close=document.createElement('button'); close.type='button'; close.className='sidebar-close-btn'; close.textContent='×'; close.setAttribute('aria-label','Fermer le menu');
    close.addEventListener('click',closeMenu); sidebar.querySelector('.sidebar-logo')?.appendChild(close);
  }
  document.addEventListener('keydown', e=> { if(e.key==='Escape' && sidebar.classList.contains('open')) closeMenu(); });
})();

// Make existing non-native action controls operable without changing their design.
(function(){
  const actionDocument=document;
  function semantics(){actionDocument.querySelectorAll('div[onclick],span[onclick]').forEach(el=>{
    if(el.querySelector('button,a,input,textarea,select')||el.hasAttribute('tabindex'))return;
    el.setAttribute('role','button');el.tabIndex=0;
  });}
  document.addEventListener('keydown',e=>{
    const target=e.target;
    if((e.key==='Enter'||e.key===' ')&&target?.matches?.('div[onclick][role="button"],span[onclick][role="button"]')){e.preventDefault();target.click();}
  });
  semantics();const observer=new MutationObserver(semantics);observer.observe(document.body,{childList:true,subtree:true});
})();
