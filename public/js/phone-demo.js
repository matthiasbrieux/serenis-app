/* Démonstration locale dans la maquette : aucun accès aux données vendeur. */
(function () {
  'use strict';
  var phone = document.querySelector('.vpm-why-phone');
  if (!phone) return;
  var body = phone.querySelector('.vpm-why-phone-body');
  var cards = Array.from(document.querySelectorAll('.vpm-why-card2'));
  var mobile = window.matchMedia('(max-width: 600px)');
  var panel = document.createElement('section');
  panel.className = 'phone-demo-panel'; panel.hidden = true;
  panel.innerHTML = '<button type="button" class="phone-demo-back">‹ Mon espace</button><div class="phone-demo-icon" aria-hidden="true"></div><h3 class="phone-demo-title" tabindex="-1"></h3><div class="phone-demo-visual" aria-hidden="true"></div><p class="phone-demo-copy"></p>';
  body.appendChild(panel);
  var title = panel.querySelector('h3');
  var buttons = [];
  var view = -1;
  function close(focus) {
    panel.hidden = true; phone.classList.remove('phone-demo-open');
    Array.from(body.children).forEach(function (node) { if (node !== panel) node.inert = false; });
    if (focus && buttons[view]) buttons[view].focus({ preventScroll: true });
  }
  function renderVisual(index, formation) {
    var visual = panel.querySelector('.phone-demo-visual');
    visual.replaceChildren();
    if (index === 3) {
      var calendar = document.createElement('div'); calendar.className = 'phone-demo-calendar';
      'L M M J V S D'.split(' ').forEach(function (day) { var n = document.createElement('b'); n.textContent = day; calendar.appendChild(n); });
      for (var day = 1; day <= 28; day++) { var cell = document.createElement('span'); cell.textContent = day; if ([8, 12, 18].indexOf(day) >= 0) cell.className = 'has-slot'; calendar.appendChild(cell); }
      visual.appendChild(calendar);
    } else {
      var previews = [
        [['1', 'Évaluer mon bien', 'Le juste prix'], ['2', 'Préparer ma vente', 'Annonce et dossier'], ['3', 'Organiser mes visites', 'Agenda et disponibilités'], ['4', 'Comparer mes offres', 'Propositions reçues'], ['5', 'Préparer la signature', 'Les prochaines démarches']],
        [['⌂', 'Les données du marché', 'Situez votre bien'], ['↗', 'Votre positionnement', 'Préparez votre prix de vente']],
        [['⌂', 'Votre annonce', 'Mettez votre bien en valeur'], ['✓', 'Les informations utiles', 'Renseignez vos acheteurs']],
        [],
        [['↗', 'Propositions reçues', 'Retrouvez vos offres'], ['≡', 'Comparaison des offres', 'Les points à examiner'], ['✓', 'Votre décision', 'Avancez sereinement']],
        [['▧', 'Photos du bien', 'Présentez votre bien'], ['⌂', 'Informations du bien', 'Les caractéristiques essentielles'], ['≡', 'Documents de vente', 'Votre dossier réuni au même endroit']]
      ];
      var rows = formation ? [['1', 'Préparer votre vente', 'Les conseils essentiels'], ['2', 'Présenter votre bien', 'Annonce et dossier'], ['3', 'Avancer sereinement', 'Visites, offres et signature']] : (previews[index] || previews[0]);
      rows.forEach(function (data) {
        var row = document.createElement('div'); row.className = 'phone-demo-preview-row';
        var icon = document.createElement('span'); icon.className = 'phone-demo-row-icon';
        // Réutiliser les icônes SVG du site pour une présentation cohérente.
        var source = cards[index === 5 ? (data === rows[0] ? 2 : data === rows[1] ? 1 : 5) : index].querySelector('.vpm-why-card2-icon svg');
        if (index === 0 || formation) icon.textContent = data[0]; else icon.appendChild(source.cloneNode(true));
        var copy = document.createElement('div'); copy.className = 'phone-demo-row-copy';
        var name = document.createElement('strong'); name.textContent = data[1];
        var detail = document.createElement('span'); detail.textContent = data[2];
        copy.append(name, detail);
        row.append(icon, copy); visual.appendChild(row);
      });
      if (index === 5) {
        var footer = document.createElement('div'); footer.className = 'phone-demo-share';
        footer.textContent = 'Un seul dossier à partager'; visual.appendChild(footer);
      }

    }
  }
  function open(index, trigger, scroll) {
    if (!cards[index]) return;
    view = index;
    panel.querySelector('.phone-demo-icon').replaceChildren(cards[index].querySelector('.vpm-why-card2-icon svg').cloneNode(true));
    title.textContent = cards[index].querySelector('.vpm-why-card2-title').textContent;
    panel.querySelector('.phone-demo-copy').textContent = cards[index].querySelector('.vpm-why-card2-desc').textContent;
    renderVisual(index, trigger && trigger.classList.contains('phone-demo-menu-button') && index === 0);
    panel.hidden = false; panel.scrollTop = 0; phone.classList.add('phone-demo-open');
    Array.from(body.children).forEach(function (node) { if (node !== panel) node.inert = true; });
    panel._trigger = trigger;
    if (scroll && mobile.matches) phone.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    title.focus({ preventScroll: true });
  }
  panel.querySelector('.phone-demo-back').addEventListener('click', function () { var trigger = panel._trigger; close(false); if (trigger) trigger.focus({ preventScroll: true }); });
  phone.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !panel.hidden) { panel.querySelector('button').click(); } });
  [3, 5, 4, 0].forEach(function (index, i) {
    var item = phone.querySelectorAll('.vpm-why-phone-item')[i];
    var button = document.createElement('button'); button.type = 'button'; button.className = 'phone-demo-menu-button';
    while (item.firstChild) button.appendChild(item.firstChild);
    item.appendChild(button); buttons[index] = button;
    button.addEventListener('click', function () { open(index, button, false); });
  });
  cards.forEach(function (card, index) {
    card.addEventListener('click', function () { open(index, card, true); });
    card.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(index, card, true); } });
  });
  function update() {
    phone.setAttribute('role', 'group');
    phone.setAttribute('aria-label', 'Présentation interactive de votre espace vendeur');
    body.removeAttribute('aria-hidden');
    buttons.forEach(function (button) { button.disabled = false; button.tabIndex = 0; });
    cards.forEach(function (card) { card.setAttribute('role', 'button'); card.tabIndex = 0; });
  }
  update();
})();
