(function () {
  'use strict';
  var section = document.querySelector('.catalogue-reviews');
  if (!section) return;
  var viewport = section.querySelector('.catalogue-reviews-viewport');
  var track = section.querySelector('.catalogue-reviews-track');
  var toggle = section.querySelector('.catalogue-reviews-pause');
  var cards = Array.from(track.children), animation, visible = false, held = false, userPaused = false, hovered = false;
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function sync() {
    if (!animation) return;
    if (!visible || held || hovered || userPaused || motion.matches || document.hidden || viewport.contains(document.activeElement)) animation.pause(); else animation.play();
  }
  function build() {
    if (animation) animation.cancel();
    track.querySelectorAll('[data-review-copy]').forEach(function (n) { n.remove(); });
    track.style.setProperty('--review-card-width', (innerWidth < 600 ? viewport.clientWidth : Math.max(280, (viewport.clientWidth - 36) / 2.7)) + 'px');
    if (motion.matches) { animation = null; toggle.hidden = true; return; }
    toggle.hidden = false;
    cards.forEach(function (card) { var copy = card.cloneNode(true); copy.dataset.reviewCopy = ''; copy.setAttribute('aria-hidden', 'true'); copy.inert = true; track.appendChild(copy); });
    var cycle = track.querySelector('[data-review-copy]').getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    animation = track.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-' + cycle + 'px,0,0)' }], { duration: cycle / .022, iterations: Infinity, easing: 'linear' });
    sync();
  }
  toggle.addEventListener('click', function () { userPaused = !userPaused; toggle.setAttribute('aria-pressed', String(userPaused)); toggle.textContent = userPaused ? 'Reprendre le défilement' : 'Mettre en pause'; sync(); });
  viewport.addEventListener('pointerdown', function () { held = true; sync(); }, { passive: true });
  viewport.addEventListener('touchstart', function () { held = true; sync(); }, { passive: true });
  window.addEventListener('pointerup', function () { held = false; sync(); }, { passive: true });
  viewport.addEventListener('touchend', function (event) { held = event.touches.length > 0; sync(); }, { passive: true });
  viewport.addEventListener('touchcancel', function () { held = false; sync(); }, { passive: true });
  viewport.addEventListener('pointerenter', function (event) { if (event.pointerType !== 'touch') { hovered = true; sync(); } });
  viewport.addEventListener('pointerleave', function () { hovered = false; sync(); });
  viewport.addEventListener('focusin', sync); viewport.addEventListener('focusout', function () { setTimeout(sync, 0); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }).observe(viewport);
  var width = 0;
  new ResizeObserver(function () { if (viewport.clientWidth !== width) { width = viewport.clientWidth; build(); } }).observe(viewport);
  if (motion.addEventListener) motion.addEventListener('change', build);
})();
