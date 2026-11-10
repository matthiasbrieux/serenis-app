// Presentation only: preserve the existing estimation fields, values and handlers.
(function () {
  'use strict';
  var band = document.querySelector('.estim-band');
  var panel = document.getElementById('estim-panel');
  var toggle = document.getElementById('estim-toggle');
  var close = document.getElementById('estim-close');
  if (!band || !panel || !toggle || !close) return;
  var timer;
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  panel.hidden = true;
  toggle.hidden = false;
  close.hidden = false;
  band.classList.add('estim-disclosure-ready');
  function setOpen(open) {
    window.clearTimeout(timer);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.hidden = false;
      // Commit the collapsed layout so the grid transition can reveal its contents.
      panel.getBoundingClientRect();
      band.classList.add('estim-is-open');
      panel.inert = false;
    } else {
      toggle.focus({ preventScroll: true });
      panel.inert = true;
      band.classList.remove('estim-is-open');
      timer = window.setTimeout(function () { panel.hidden = true; }, motion.matches ? 0 : 320);
    }
  }
  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  close.addEventListener('click', function () { setOpen(false); });
})();
