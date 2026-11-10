/* Navigation publique : liens existants regroupés, menu mobile conservé. */
(function () {
  'use strict';
  const nav = document.querySelector('.nav');
  const list = nav && nav.querySelector('.nav-links');
  if (!list || list.dataset.grouped) return;
  const anchors = Array.from(list.querySelectorAll('a'));
  const buyer = anchors.find(a => a.getAttribute('href').includes('les-biens-des-particuliers'));
  const sellers = anchors.filter(a => a !== buyer);
  if (!buyer || sellers.length !== 4) return;
  const svg = path => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  const home = svg('<path d="m3 10 9-8 9 8M5 9v12h5v-7h4v7h5V9"/>');
  const search = svg('<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>');
  const login = nav.querySelector('.nav-login');
  if (login) {
    login.classList.add('vpm-login-link');
    login.insertAdjacentHTML('afterbegin', svg('<circle cx="12" cy="7" r="4"/><path d="M3 22v-2a9 9 0 0 1 18 0v2"/>'));
    login.dataset.vpmAction = 'text';
    login.style.setProperty('--vpm-rest-bg', 'transparent');
    login.style.setProperty('--vpm-rest-ink', 'var(--vpm-login-color)');
    login.style.setProperty('--vpm-link-hover', 'var(--vpm-login-color)');
  }

  const icons = [svg('<circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><path d="m11 13 10-10m-5 0v5h5"/>'),svg('<path d="m12 2 10 5-10 5L2 7Zm-10 10 10 5 10-5M2 17l10 5 10-5"/>'),svg('<path d="M20 3H11L2 12l10 10 9-9V4Z"/><circle cx="16" cy="8" r="1"/>'),svg('<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01"/>')];
  const sellerLi = document.createElement('li'); sellerLi.className = 'vpm-sell-entry';
  const sellLink = document.createElement('a'); sellLink.className = 'vpm-sell-home'; sellLink.href = '/'; sellLink.innerHTML = home + '<span>Vendre</span>';
  const details = document.createElement('details'); details.className = 'vpm-sell-menu';
  const summary = document.createElement('summary'); summary.setAttribute('aria-label', 'Afficher les rubriques pour vendre'); summary.innerHTML = svg('<path d="m6 9 6 6 6-6"/>');
  const dropdown = document.createElement('div'); dropdown.className = 'vpm-sell-dropdown';
  sellers.forEach((old, i) => { const link = document.createElement('a'); link.href = old.getAttribute('href'); link.innerHTML = icons[i]; const label = document.createElement('span'); label.textContent = old.textContent; link.append(label); link.addEventListener('click', () => { details.open = false; }); dropdown.append(link); });
  details.append(summary, dropdown); sellerLi.append(sellLink, details);
  const buyerLi = document.createElement('li'); buyerLi.className = 'vpm-buy-entry';
  const buyLink = document.createElement('a'); buyLink.className = 'vpm-buy-link'; buyLink.href = buyer.getAttribute('href'); buyLink.innerHTML = search + '<span>Acheter</span>';
  if (buyer.hasAttribute('aria-current')) { buyLink.setAttribute('aria-current', 'page'); nav.classList.add('vpm-buyer-page'); }
  buyerLi.append(buyLink); list.replaceChildren(sellerLi, buyerLi); list.dataset.grouped = 'true'; list.classList.add('vpm-grouped-nav');
  document.addEventListener('click', event => { if (!details.contains(event.target)) details.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && details.open) { details.open = false; summary.focus(); } });
  details.addEventListener('pointerleave', () => { if (!details.contains(document.activeElement)) details.open = false; });
  details.addEventListener('focusout', () => { setTimeout(() => { if (!details.contains(document.activeElement)) details.open = false; }, 0); });
})();
