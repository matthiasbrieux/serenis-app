// Navigation de la page d'accueil uniquement : état clair en haut, terracotta au scroll.
(function () {
  'use strict';
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var frame = null;
  function update() {
    frame = null;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  function schedule() {
    if (frame === null) frame = requestAnimationFrame(update);
  }
  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('pageshow', update);
})();
