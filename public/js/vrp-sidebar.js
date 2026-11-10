(function () {
  var ICONS = {
    activity:    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    prospects:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    commissions: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    ressources:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    guides:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
    logout:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    house:       '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M16 2L3 13v17h8v-8h10v8h8V13L16 2z" fill="#C4603A"/></svg>',
  };

  var NAV = [
    { label: 'Mon activité',      href: '/vrp/dashboard',    icon: 'activity'    },
    { label: 'Mes prospects',     href: '/vrp/prospects',    icon: 'prospects'   },
    { label: 'Formation',         href: '/vrp/guides',       icon: 'guides'      },
    { label: 'Mes ressources',    href: '/vrp/ressources',   icon: 'ressources'  },
  ];

  function isActive(href) {
    var p = window.location.pathname;
    return p === href || p.startsWith(href + '/');
  }

  function navLink(item) {
    var cls = isActive(item.href) ? ' active' : '';
    return '<a href="' + item.href + '" class="' + cls + '">' + ICONS[item.icon] + item.label + '</a>';
  }

  function nameHtml(name, zone) {
    if (!name) return '<div class="vrp-logo-name" id="vrp-logo-name" style="display:none;"></div>';
    return '<div class="vrp-logo-name" id="vrp-logo-name">' + name
      + (zone ? '<br><span style="font-weight:400;font-style:normal;opacity:0.7;font-size:0.74rem;">' + zone + '</span>' : '')
      + '</div>';
  }

  function buildSidebar(vrpName, vrpZone) {
    var navHtml = NAV.map(navLink).join('');
    return ''
      + '<div class="vrp-sidebar-overlay" id="vrp-sidebar-overlay"></div>'
      + '<button class="vrp-mobile-nav-btn" id="vrp-mobile-nav-btn" title="Menu" aria-label="Ouvrir le menu">'
      + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
      + '</button>'
      + '<aside class="vrp-sidebar" id="vrp-sidebar">'
      + '  <div class="vrp-logo">'
      + '    <img src="/images/vendu-par-moi.svg" alt="Vendu Par Moi" class="vrp-logo-img">'
      + '    <span class="vrp-logo-sub">Espace commercial</span>'
      + nameHtml(vrpName, vrpZone)
      + '  </div>'
      + '  <nav class="vrp-nav">' + navHtml + '</nav>'
      + '  <div class="vrp-footer">'
      + '    <nav class="vrp-nav">'
      + '      <a href="/vrp/logout">' + ICONS.logout + 'Déconnexion</a>'
      + '    </nav>'
      + '  </div>'
      + '</aside>';
  }

  // Callable after sidebar is built (slot is already replaced when async data arrives)
  window.vrpSetName = function(name, zone) {
    var el = document.getElementById('vrp-logo-name');
    if (!el) return;
    if (!name) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = name + (zone ? '<br><span style="font-weight:400;font-style:normal;opacity:0.7;font-size:0.74rem;">' + zone + '</span>' : '');
  };

  function init() {
    var slot = document.getElementById('vrp-sidebar-slot');
    if (!slot) return;
    slot.outerHTML = buildSidebar('', '');

    // Mobile nav toggle
    var btn = document.getElementById('vrp-mobile-nav-btn');
    var sidebar = document.getElementById('vrp-sidebar');
    var overlay = document.getElementById('vrp-sidebar-overlay');
    if (btn && sidebar && overlay) {
      btn.addEventListener('click', function() {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('show');
      });
      overlay.addEventListener('click', function() {
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
