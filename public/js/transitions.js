// =============================================
// SERENIS — Système d'animation & transitions
// =============================================

(function () {
  'use strict';

  // Ordre des pages dans la sidebar (détermine la direction)
  const PAGE_ORDER = ['/dashboard', '/mon-bien', '/ma-formation', '/mon-agenda'];

  // ── Barre de progression en haut ──────────────────────────
  const loader = document.createElement('div');
  loader.id = 'page-loader';
  document.body.appendChild(loader);

  function loaderComplete() {
    loader.classList.add('done');
    setTimeout(() => loader.classList.remove('done'), 600);
  }

  // ── Lecture page courante ──────────────────────────────────
  const currentPath = window.location.pathname;
  const currentIndex = PAGE_ORDER.indexOf(currentPath);

  // ── Entrée de page ────────────────────────────────────────
  function pageEnter(direction) {
    const main = document.querySelector('.main-content');
    if (!main) return;

    // Main content : fondu directionnel, plus lent
    const fromY = direction === 'down' ? 22 : direction === 'up' ? -22 : 14;
    main.style.cssText = `opacity:0;transform:translateY(${fromY}px);`;
    setTimeout(() => {
      main.style.cssText = 'transition:opacity 0.85s cubic-bezier(0.16,1,0.3,1),transform 0.85s cubic-bezier(0.16,1,0.3,1);opacity:1;transform:translateY(0);';
      revealPageSections();
    }, 80);

    loaderComplete();
  }

  // ── Sortie de page ────────────────────────────────────────
  function pageExit(href, direction) {
    const main = document.querySelector('.main-content');
    loader.classList.remove('done');
    loader.style.cssText = '';

    if (main) {
      const toY = direction === 'down' ? -16 : direction === 'up' ? 16 : -12;
      main.style.cssText = `transition:opacity 0.28s ease-in,transform 0.28s ease-in;opacity:0;transform:translateY(${toY}px);`;
    }
    setTimeout(() => { window.location.href = href; }, 290);
  }

  // ── Révélation cascade des sections ──────────────────────
  function revealPageSections() {
    const sections = document.querySelectorAll('.form-section, .stats-grid > *, .page-header');
    sections.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 160 + i * 80);
    });
  }

  // ── Transitions d'onglets (tabs) ───────────────────────────
  const TAB_ORDER = ['infos', 'photos', 'documents', 'publication'];
  let currentTabIndex = 0;

  function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    if (!tabs.length) return;

    // Trouver l'onglet actif courant
    tabs.forEach((btn, i) => {
      if (btn.classList.contains('active')) currentTabIndex = i;
    });

    tabs.forEach((btn, nextIndex) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;

        const direction = nextIndex > currentTabIndex ? 1 : -1;
        const currentTab = document.querySelector('.tab-content:not(.hidden)');
        const nextTab = document.getElementById('tab-' + btn.dataset.tab);

        // Retirer actif des boutons
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (currentTab && nextTab) {
          // Sortie douce de l'onglet courant
          currentTab.style.cssText = `transition:opacity 0.25s ease,transform 0.25s ease;opacity:0;transform:translateX(${direction * -28}px);`;

          setTimeout(() => {
            currentTab.classList.add('hidden');
            currentTab.style.cssText = '';

            // Entrée lente du nouvel onglet
            nextTab.classList.remove('hidden');
            nextTab.style.cssText = `opacity:0;transform:translateX(${direction * 28}px);`;
            requestAnimationFrame(() => {
              nextTab.style.cssText = 'transition:opacity 0.65s cubic-bezier(0.16,1,0.3,1),transform 0.65s cubic-bezier(0.16,1,0.3,1);opacity:1;transform:translateX(0);';
            });

            // Enfants en cascade lente
            nextTab.querySelectorAll('.form-section').forEach((section, i) => {
              section.style.opacity = '0';
              section.style.transform = 'translateY(10px)';
              setTimeout(() => {
                section.style.transition = 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
              }, i * 90);
            });
          }, 260);
        }

        currentTabIndex = nextIndex;
      });
    });
  }

  // ── Compteurs animés ───────────────────────────────────────
  function animateCounter(el) {
    const text = el.textContent.trim();
    const match = text.match(/^([\d\s]+)/);
    if (!match) return;
    const target = parseInt(match[1].replace(/\s/g, ''));
    if (isNaN(target) || target === 0) return;

    const suffix = text.replace(match[0], '');
    const duration = 1200;
    const start = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.round(target * easeOut(progress));
      el.textContent = value.toLocaleString('fr-FR') + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    const counters = document.querySelectorAll('.stat-value, .hero-trust-num');
    if (!counters.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => obs.observe(el));
  }

  // ── Interception des liens sidebar ────────────────────────
  function initNavLinks() {
    document.querySelectorAll('.sidebar-item').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || link.classList.contains('active')) return;
        e.preventDefault();

        const targetIndex = PAGE_ORDER.indexOf(href);
        let direction = 'none';
        if (currentIndex !== -1 && targetIndex !== -1) {
          direction = targetIndex > currentIndex ? 'down' : 'up';
        }
        pageExit(href, direction);
      });
    });
  }

  // ── Micro-animations sur les cartes ───────────────────────
  function initCardHovers() {
    document.querySelectorAll('.form-section').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'box-shadow 0.25s ease, transform 0.25s ease';
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Lire la direction de navigation depuis sessionStorage
    const savedDirection = sessionStorage.getItem('navDirection') || 'none';
    sessionStorage.removeItem('navDirection');

    pageEnter(savedDirection);
    initTabs();
    initCounters();
    initNavLinks();
    initCardHovers();
  });

  // Sauvegarder la direction avant navigation
  const _pageExit = pageExit;
  window._navigateTo = function(href, direction) {
    sessionStorage.setItem('navDirection', direction);
    _pageExit(href, direction);
  };

})();
