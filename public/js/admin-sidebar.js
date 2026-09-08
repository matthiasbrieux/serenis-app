(function () {
  var ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    crm:       '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    camera:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    mail:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    user:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    message:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    marketing: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>',
    finance:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    gift:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>',
    phone:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
    target:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    key:       '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    logout:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    chevron:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    house:     '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M16 2L3 13v17h8v-8h10v8h8V13L16 2z" fill="#C4603A"/></svg>',
  };

  var NAV_ITEMS = [
    { label: 'Dashboard',        href: '/admin',              icon: 'dashboard', exact: true  },
    { label: 'CRM Vendeurs',     href: '/admin/crm',          icon: 'crm'    },
    { label: 'Photos pros',      href: '/admin/missions',     icon: 'camera' },
    { label: 'Emails',           href: '/admin/emails',       icon: 'mail'   },
    { label: 'Clients',          href: '/admin#clients',      icon: 'user'   },
    { label: 'Contacts',         href: '/admin#contacts',     icon: 'message'},
    { sep: true },
    { label: 'Marketing',        href: '/admin/marketing',    icon: 'marketing' },
    { label: 'Finance',          href: '/admin/finance',      icon: 'finance'   },
    { label: 'Parrainage',       href: '/admin/parrainage',   icon: 'gift'      },
    { label: 'Rappels',          href: '/admin/rappels',      icon: 'phone'     },
    { label: 'Prospection',      href: '/admin/prospection',  icon: 'target'    },
  ];

  var FOOTER_ITEMS = [
    { label: 'Mon compte',  href: '/admin/mon-compte', icon: 'key'    },
    { label: 'Déconnexion', href: '/admin/logout',     icon: 'logout' },
  ];

  function isActive(href) {
    // Les liens avec ancre (#) ne sont jamais "actifs" sur une autre page
    if (href.includes('#')) return false;
    var path = window.location.pathname;
    if (href === '/admin') return path === '/admin';
    return path === href || path.startsWith(href + '/');
  }

  function navLink(item) {
    var active = isActive(item.href) ? ' active' : '';
    return '<a href="' + item.href + '" class="' + active + '" data-label="' + item.label + '">'
      + ICONS[item.icon]
      + '<span class="adm-label">' + item.label + '</span>'
      + '</a>';
  }

  function buildSidebar() {
    var navHtml = NAV_ITEMS.map(function(item) {
      if (item.sep) return '<div class="adm-sep"></div>';
      return navLink(item);
    }).join('');

    var footerHtml = FOOTER_ITEMS.map(navLink).join('');

    return ''
      + '<aside class="admin-sidebar" id="admin-sidebar">'
      + '  <div class="adm-logo">'
      + '    <img src="/images/vendu-par-moi.svg" alt="Vendu Par Moi" class="adm-logo-img">'
      + '    <span class="adm-logo-sub">Espace admin</span>'
      + '  </div>'
      + '  <div class="adm-toggle">'
      + '    <button class="adm-toggle-btn" id="adm-toggle-btn" title="Réduire la sidebar">' + ICONS.chevron + '</button>'
      + '  </div>'
      + '  <nav class="adm-nav">' + navHtml + '</nav>'
      + '  <div class="adm-footer"><nav class="adm-nav">' + footerHtml + '</nav></div>'
      + '</aside>';
  }

  function init() {
    var slot = document.getElementById('admin-sidebar-slot');
    if (!slot) return;
    slot.outerHTML = buildSidebar();

    var sidebar = document.getElementById('admin-sidebar');
    var btn = document.getElementById('adm-toggle-btn');
    if (!sidebar || !btn) return;

    // Restore collapsed state
    if (localStorage.getItem('adm-sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }

    btn.addEventListener('click', function () {
      var collapsed = sidebar.classList.toggle('collapsed');
      localStorage.setItem('adm-sidebar-collapsed', collapsed ? '1' : '0');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
