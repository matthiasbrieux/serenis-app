/* Adaptateur de présentation du rappel : aucun changement de sélection ou d'envoi. */
(function () {
  'use strict';
  var modal = document.getElementById('callbackModal');
  if (!modal || !('MutationObserver' in window)) return;

  // Les fonctions existantes restent la source de vérité via leurs styles inline.
  var slots = Array.from(modal.querySelectorAll('.cb-slot'));
  function syncSlots() {
    slots.forEach(function (slot) {
      slot.setAttribute('aria-pressed', String(slot.style.borderColor.indexOf('--terracotta') !== -1));
    });
  }
  var selection = new MutationObserver(syncSlots);
  slots.forEach(function (slot) { selection.observe(slot, { attributes: true, attributeFilter: ['style'] }); });
  syncSlots();
  modal.classList.add('callback-ui-ready');

  // openCallback/submitCallback réécrivent textContent. Restituer seulement le SVG décoratif.
  var button = document.getElementById('cbBtn');
  var content = new MutationObserver(renderButton);
  function renderButton() {
    var text = button.textContent;
    var hasArrow = /\s*→\s*$/.test(text);
    content.disconnect();
    var label = document.createElement('span');
    label.textContent = hasArrow ? text.replace(/\s*→\s*$/, '') : text;
    button.textContent = '';
    button.appendChild(label);
    if (hasArrow) {
      var ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      [['width', '20'], ['height', '20'], ['viewBox', '0 0 24 24'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.7'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']].forEach(function (a) { svg.setAttribute(a[0], a[1]); });
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M5 12h14m-6-6 6 6-6 6');
      svg.appendChild(path);
      button.appendChild(svg);
    }
    content.observe(button, { childList: true, subtree: true, characterData: true });
  }
  // Le premier rendu contient déjà le SVG dans le HTML ; observer les réécritures suivantes.
  content.observe(button, { childList: true, subtree: true, characterData: true });
})();
