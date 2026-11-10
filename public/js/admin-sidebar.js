(function () {
  var ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    crm:       '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    camera:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    mail:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    marketing: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>',
    finance:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    gift:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>',
    phone:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
    target:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    key:       '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    vrp:       '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3"/><path d="M6 20v-1a6 6 0 0112 0v1"/><path d="M18 8h3M18 12h3"/></svg>',
    logout:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    chevron:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    settings:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    users2:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    external:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    menu:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    close:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  // ── 5 rubriques principales ──────────────────────────────────
  var SECTIONS = [
    {
      label: 'Tableau de bord',
      href: '/admin',
      icon: 'dashboard',
      exact: true,
    },
    {
      label: 'Suivi vendeurs',
      icon: 'crm',
      id: 'vendeurs',
      items: [
        { label: 'Dossiers vendeurs',  href: '/admin/crm',          icon: 'users2'  },
        { label: 'Photos & missions',  href: '/admin/photographers', icon: 'camera'  },
        { label: 'Rappels',            href: '/admin/rappels',       icon: 'phone'   },
      ]
    },
    {
      label: 'Emails & auto',
      icon: 'mail',
      id: 'emails',
      items: [
        { label: 'Emails',    href: '/admin/emails',    icon: 'mail'      },
        { label: 'Marketing', href: '/admin/marketing', icon: 'marketing' },
      ]
    },
    {
      label: 'Réseau VRP',
      icon: 'vrp',
      id: 'vrp',
      items: [
        { label: 'VRP & commissions', href: '/admin/vrp',         icon: 'vrp'      },
        { label: 'Prospection',       href: '/admin/prospection',  icon: 'target'   },
        { label: 'Espace VRP',        href: '/vrp',               icon: 'external' },
      ]
    },
    {
      label: 'Finances',
      icon: 'finance',
      id: 'finances',
      items: [
        { label: 'Finance',    href: '/admin/finance',    icon: 'finance' },
        { label: 'Parrainage', href: '/admin/parrainage', icon: 'gift'    },
      ]
    },
  ];

  var FOOTER_ITEMS = [
    { label: 'Paramètres',  href: '/admin/mon-compte', icon: 'settings' },
    { label: 'Déconnexion', href: '/admin/logout',     icon: 'logout'   },
  ];

  // ── Helpers ───────────────────────────────────────────────────
  function isActive(href, exact) {
    if (!href || href.includes('#') || href === '/vrp') return false;
    var path = window.location.pathname;
    if (exact || href === '/admin') return path === href;
    return path === href || path.startsWith(href + '/');
  }

  function isSectionActive(section) {
    if (section.href) return isActive(section.href, section.exact);
    return (section.items || []).some(function (item) { return isActive(item.href); });
  }

  // ── Build HTML ────────────────────────────────────────────────
  function buildSection(section) {
    // Direct link (Tableau de bord)
    if (!section.items) {
      var active = isActive(section.href, section.exact) ? ' active' : '';
      return '<a href="' + section.href + '" class="adm-section-link' + active + '" data-label="' + section.label + '">'
        + ICONS[section.icon]
        + '<span class="adm-label">' + section.label + '</span>'
        + '</a>';
    }

    var open = isSectionActive(section) ? ' open' : '';
    var subItems = section.items.map(function (item) {
      var active = isActive(item.href) ? ' active' : '';
      var ext = item.href === '/vrp' ? ' <span class="adm-ext">' + ICONS.external + '</span>' : '';
      return '<a href="' + item.href + '" class="adm-subitem' + active + '" data-label="' + item.label + '">'
        + ICONS[item.icon]
        + '<span class="adm-sublabel">' + item.label + ext + '</span>'
        + '</a>';
    }).join('');

    return '<div class="adm-section' + open + '" id="adm-sec-' + section.id + '">'
      + '<button class="adm-section-btn" data-label="' + section.label + '" onclick="admToggleSection(\'' + section.id + '\')">'
      + ICONS[section.icon]
      + '<span class="adm-label">' + section.label + '</span>'
      + '<span class="adm-chevron-wrap">' + ICONS.chevron + '</span>'
      + '</button>'
      + '<div class="adm-subnav">' + subItems + '</div>'
      + '</div>';
  }

  function buildSidebar() {
    var navHtml = SECTIONS.map(buildSection).join('');
    var footerHtml = FOOTER_ITEMS.map(function (item) {
      return '<a href="' + item.href + '" class="adm-section-link" data-label="' + item.label + '">'
        + ICONS[item.icon]
        + '<span class="adm-label">' + item.label + '</span>'
        + '</a>';
    }).join('');

    return ''
      + '<div class="adm-mobile-overlay" id="adm-mobile-overlay"></div>'
      + '<button class="adm-mobile-btn" id="adm-mobile-btn" aria-label="Menu">' + ICONS.menu + '</button>'
      + '<aside class="admin-sidebar" id="admin-sidebar">'
      + '  <div class="adm-logo">'
      + '    <img src="/images/vendu-par-moi.svg" alt="Vendu Par Moi" class="adm-logo-img">'
      + '    <span class="adm-logo-sub">Administration</span>'
      + '  </div>'
      + '  <div class="adm-toggle">'
      + '    <button class="adm-toggle-btn" id="adm-toggle-btn" title="Réduire">' + ICONS.chevron + '</button>'
      + '  </div>'
      + '  <nav class="adm-nav" id="adm-main-nav">' + navHtml + '</nav>'
      + '  <div class="adm-footer"><nav class="adm-nav">' + footerHtml + '</nav></div>'
      + '</aside>';
  }

  // ── Toggle section ────────────────────────────────────────────
  window.admToggleSection = function (id) {
    var sidebar = document.getElementById('admin-sidebar');
    // If collapsed → expand first
    if (sidebar && sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      localStorage.setItem('adm-sidebar-collapsed', '0');
    }
    var el = document.getElementById('adm-sec-' + id);
    if (!el) return;
    var isOpen = el.classList.contains('open');
    // Close all sections
    document.querySelectorAll('.adm-section').forEach(function (s) { s.classList.remove('open'); });
    if (!isOpen) el.classList.add('open');
  };

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    var slot = document.getElementById('admin-sidebar-slot');
    if (!slot) return;
    slot.outerHTML = buildSidebar();

    var sidebar  = document.getElementById('admin-sidebar');
    var toggleBtn = document.getElementById('adm-toggle-btn');
    var mobileBtn = document.getElementById('adm-mobile-btn');
    var overlay   = document.getElementById('adm-mobile-overlay');

    // Persist collapsed state
    if (localStorage.getItem('adm-sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }

    // Desktop collapse toggle
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var collapsed = sidebar.classList.toggle('collapsed');
        localStorage.setItem('adm-sidebar-collapsed', collapsed ? '1' : '0');
        // On re-expand: re-open the active section
        if (!collapsed) {
          document.querySelectorAll('.adm-section').forEach(function (s) {
            if (s.querySelector('.adm-subitem.active')) s.classList.add('open');
          });
        }
      });
    }

    // Mobile toggle
    if (mobileBtn && overlay) {
      mobileBtn.addEventListener('click', function () {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('show');
      });
      overlay.addEventListener('click', function () {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
