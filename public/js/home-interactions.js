/* Présentation de la page publique uniquement : aucun calcul ni parcours métier. */
(function () {
  'use strict';
  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !motion || motion.matches; }

  // État visuel immédiat, sans empêcher ni retarder l'action d'achat existante.
  document.querySelectorAll('.pricing .btn-buy-primary, .pricing .btn-buy-secondary').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('.pricing-card').forEach(function (card) {
        var selected = card.contains(button);
        card.classList.toggle('is-selected', selected);
        card.querySelector('.pricing-selection').setAttribute('aria-hidden', String(!selected));
      });
    }, true);
  });

  // Le texte métier reste intact ; seul son affichage temporaire est interpolé.
  (function () {
    var amount = document.getElementById('simSavings');
    var slider = document.getElementById('simSlider');
    var banner = document.querySelector('.sim-savings-banner');
    var comparison = document.querySelector('.sim-results');
    var simulator = document.querySelector('.simulator');
    if (!amount || !slider || !banner || reduced() || !('IntersectionObserver' in window)) return;
    var observer, frame, overlay, startTimer, feesEnd = 0, seen = false, visible = false, pending = null;
    var current = actual();
    var format = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    function actual() { return Number(amount.firstChild.textContent.replace(/[^\d-]/g, '')); }
    function clearOverlay() {
      if (overlay) overlay.remove();
      overlay = null;
      amount.classList.remove('sim-counting');
    }
    function stop() {
      clearTimeout(startTimer);
      cancelAnimationFrame(frame);
      clearOverlay();
      current = actual();
    }
    function animate(from, target, duration) {
      cancelAnimationFrame(frame); clearOverlay();
      if (reduced() || !visible || from === target || !Number.isFinite(target)) { current = target; return; }
      var original = amount.firstChild;
      overlay = document.createElement('span');
      overlay.className = 'sim-savings-count';
      overlay.setAttribute('aria-hidden', 'true');
      current = from;
      overlay.textContent = format.format(Math.round(current)) + '\u00a0€';
      amount.appendChild(overlay);
      amount.classList.add('sim-counting');
      var started;
      function tick(now) {
        if (reduced() || !visible || !overlay || !overlay.isConnected || amount.firstChild !== original) { stop(); return; }
        if (started === undefined) started = now;
        var progress = Math.min(1, (now - started) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        current = from + (target - from) * eased;
        overlay.textContent = format.format(Math.round(current)) + '\u00a0€';
        if (progress < 1) frame = requestAnimationFrame(tick);
        else stop();
      }
      frame = requestAnimationFrame(tick);
    }
    try {
      var threshold = Math.min(.65, window.innerHeight * .65 / banner.getBoundingClientRect().height);
      var feesThreshold = comparison ? Math.min(.6, window.innerHeight * .65 / comparison.getBoundingClientRect().height) : .6;
      observer = new IntersectionObserver(function (entries) {
        var bannerChanged = false;
        entries.forEach(function (entry) {
          if (entry.target === comparison && entry.isIntersecting && entry.intersectionRatio >= feesThreshold) {
            simulator.classList.add('sim-fees-visible'); feesEnd = performance.now() + 600;
            observer.unobserve(comparison);
          }
          if (entry.target === banner) { bannerChanged = true; visible = entry.isIntersecting && entry.intersectionRatio >= threshold; }
        });
        if (!bannerChanged) return;
        if (!visible) { if (overlay) pending = current; stop(); return; }
        if (!seen) {
          clearTimeout(startTimer);
          startTimer = setTimeout(function () { if (visible && !seen && !reduced()) { seen = true; animate(0, actual(), 1100); } }, Math.max(0, feesEnd - performance.now()));
        } else if (pending !== null) { var from = pending; pending = null; animate(from, actual(), 900); }
      }, { threshold: [0, feesThreshold, threshold] });
      if (comparison) { simulator.classList.add('sim-effects-ready'); observer.observe(comparison); }
      observer.observe(banner);
      slider.addEventListener('input', function () {
        // L'oninput existant a déjà calculé et écrit la nouvelle valeur exacte.
        var target = actual();
        if (reduced()) { pending = null; stop(); return; }
        if (!seen && visible) { clearTimeout(startTimer); seen = true; animate(current, target, 700); return; }
        if (!seen) { stop(); return; }
        if (!visible) { if (pending === null) pending = current; stop(); return; }
        pending = null; animate(current, target, 700);
      }, { passive: true });
      if (motion.addEventListener) motion.addEventListener('change', function () { if (motion.matches) { pending = null; stop(); observer.disconnect(); if (simulator) simulator.classList.remove('sim-effects-ready'); } });
    } catch (error) { stop(); if (simulator) simulator.classList.remove('sim-effects-ready'); }
  })();

  // Résultat secondaire de présentation : le calcul principal et son animation restent intacts.
  (function () {
    var slider = document.getElementById('simSlider');
    var fees = document.getElementById('simAgency');
    var result = document.getElementById('simSavingsCoaching');
    if (!slider || !fees || !result) return;
    var format = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    function display() {
      var agency = Number(fees.textContent.replace(/[^\d-]/g, ''));
      if (Number.isFinite(agency)) result.textContent = format.format(agency - 1547) + '\u00a0€';
    }
    slider.addEventListener('input', display, { passive: true });
    display();
  })();

  // Ruban continu à 24 px/s. Les cartes originales restent les seules accessibles.
  (function () {
    var track = document.getElementById('temoignages-carousel');
    var viewport = document.querySelector('.testi-viewport');
    if (!track || !viewport) return;
    var cards = Array.from(track.children);
    var nativeLabel = track.getAttribute('aria-label');
    var frame, last, resumeAt, cycle = 0, stride = 0, position = 0;
    var looping = false, visible = false, hovered = false, focused = false, dragging = false;
    var dragX, dragY, dragOrigin, horizontal = false;
    function normalize(value) { return cycle ? ((value % cycle) + cycle) % cycle : 0; }
    function render() { position = normalize(position); track.style.transform = 'translate3d(' + (-position) + 'px,0,0)'; }
    function pause() { cancelAnimationFrame(frame); frame = null; last = null; }
    function canPlay() { return looping && visible && !hovered && !focused && !dragging && !document.hidden && !reduced(); }
    function play(gentle) {
      if (!canPlay() || frame) return;
      last = null; resumeAt = performance.now() - (gentle ? 0 : 300);
      function tick(now) {
        if (!canPlay()) { pause(); return; }
        if (last !== null) {
          var speed = 24 * Math.min(1, (now - resumeAt) / 300);
          position += speed * Math.min(64, now - last) / 1000;
          render();
        }
        last = now; frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }
    function measure() {
      if (!looping) return;
      var progress = cycle ? position / cycle : 0;
      var available = Math.max(0, viewport.clientWidth - 4);
      var width = window.innerWidth > 1000 ? (available - 36) / 2.7 : available;
      track.style.setProperty('--testi-width', width + 'px');
      stride = cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
      cycle = track.querySelector('[data-testimonial-clone]').getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
      position = progress * cycle;
      render();
    }
    function enable() {
      if (looping || reduced() || window.innerWidth <= 600) return;
      position = track.scrollLeft;
      track.scrollLeft = 0;
      cards.forEach(function (card) {
        card.classList.add('visible');
        var copy = card.cloneNode(true);
        copy.classList.remove('reveal', 'visible');
        copy.removeAttribute('id');
        copy.removeAttribute('style');
        copy.setAttribute('data-testimonial-clone', '');
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('inert', '');
        copy.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
        copy.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach(function (el) { el.setAttribute('tabindex', '-1'); });
        track.appendChild(copy);
      });
      looping = true;
      viewport.classList.add('is-looping');
      viewport.setAttribute('role', 'region');
      viewport.setAttribute('tabindex', '0');
      viewport.setAttribute('aria-label', 'Témoignages provisoires. Défilement automatique, en pause au survol et au focus. Utilisez les flèches du clavier pour parcourir les cartes.');
      track.removeAttribute('role'); track.removeAttribute('aria-label'); track.removeAttribute('tabindex');
      measure(); play(false);
    }
    function disable() {
      if (!looping) return;
      pause(); looping = false;
      track.querySelectorAll('[data-testimonial-clone]').forEach(function (el) { el.remove(); });
      viewport.classList.remove('is-looping');
      viewport.removeAttribute('role'); viewport.removeAttribute('tabindex'); viewport.removeAttribute('aria-label');
      track.style.removeProperty('transform'); track.style.removeProperty('--testi-width');
      track.setAttribute('role', 'region'); track.setAttribute('tabindex', '0'); track.setAttribute('aria-label', nativeLabel);
      track.scrollLeft = Math.min(position, track.scrollWidth - track.clientWidth);
      if (document.activeElement === viewport) track.focus({ preventScroll: true });
    }
    viewport.addEventListener('pointerenter', function (event) { if (event.pointerType !== 'touch') { hovered = true; pause(); } });
    viewport.addEventListener('pointerleave', function (event) { if (event.pointerType !== 'touch') { hovered = false; play(true); } });
    viewport.addEventListener('focusin', function () { focused = true; pause(); });
    viewport.addEventListener('focusout', function (event) { if (!viewport.contains(event.relatedTarget)) { focused = false; play(true); } });
    viewport.addEventListener('pointerdown', function (event) {
      if (!looping || event.button > 0 || event.pointerType === 'mouse') return;
      dragging = true; horizontal = false; dragX = event.clientX; dragY = event.clientY; dragOrigin = position; pause();
    });
    viewport.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      var dx = event.clientX - dragX, dy = event.clientY - dragY;
      if (!horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { horizontal = true; viewport.setPointerCapture(event.pointerId); }
      if (horizontal) { position = dragOrigin - dx; render(); }
    });
    function release(event) {
      if (!dragging) return;
      dragging = false;
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      play(true);
    }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    viewport.addEventListener('keydown', function (event) {
      if (event.target !== viewport && event.target !== track) return;
      var step = looping ? stride : cards[1].offsetLeft - cards[0].offsetLeft;
      var value = looping ? position : track.scrollLeft;
      if (event.key === 'ArrowRight') value += step;
      else if (event.key === 'ArrowLeft') value -= step;
      else if (event.key === 'Home') value = 0;
      else if (event.key === 'End') value = step * (cards.length - 1);
      else return;
      event.preventDefault();
      if (looping) { position = value; render(); } else track.scrollLeft = value;
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(true); });
    window.addEventListener('resize', function () {
      if (window.innerWidth <= 600) {
        if (looping) { disable(); track.scrollLeft = 0; }
      } else { enable(); measure(); }
    }, { passive: true });
    if (motion && motion.addEventListener) motion.addEventListener('change', function () { if (reduced()) disable(); else enable(); });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { visible = entry.isIntersecting && entry.intersectionRatio >= .1; });
        if (visible) play(false); else pause();
      }, { threshold: [0, .1] });
      observer.observe(viewport);
      enable();
    }
  })();
  // Mobile : Coaching Plus en premier, comparaison manuelle uniquement.
  (function () {
    var rail = document.querySelector('.stats-packs');
    if (!rail) return;
    var autonomy = rail.children[0], coaching = rail.children[1];
    var phone = window.matchMedia('(max-width: 600px)');
    function arrange() {
      if (phone.matches) rail.insertBefore(coaching, autonomy);
      else rail.insertBefore(autonomy, coaching);
      rail.scrollLeft = 0;
    }
    if (phone.addEventListener) phone.addEventListener('change', arrange);
    arrange();
  })();
  var offerNext = document.querySelector('.stats-packs-next');
  if (offerNext) offerNext.addEventListener('click', function () {
    var rail = document.querySelector('.stats-packs');
    var cards = rail.children;
    var last = rail.scrollLeft > rail.clientWidth / 2;
    var left = last ? 0 : cards[1].getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    rail.scrollTo({ left: left, behavior: reduced() ? 'auto' : 'smooth' });
  });
  // Téléphone : cartes entières, rotation automatique seulement à l’écran.
  (function () {
    var mobile = window.matchMedia('(max-width: 600px)');
    document.querySelectorAll('.fears-grid, .vpm-pillars--benefits .vpm-why-banner, #temoignages-carousel').forEach(function (rail) {
      var visible = false, touched = false, fingerDown = false, resumeAt = 0;
      var timer = null, frame = null, lastFrame = null;
      var continuous = true;
      var originals = Array.from(rail.children).filter(function (card) { return !card.hasAttribute('data-testimonial-clone'); }), cycleWidth = 0, position = 0;
      var glides = [], glideStart = 0;
      function stop() {
        clearTimeout(timer); cancelAnimationFrame(frame); timer = frame = null; lastFrame = null;
        if (glides.length) {
          var elapsed = Number(glides[0].currentTime || 0);
          position = cycleWidth ? (glideStart + elapsed * .022 + rail.scrollLeft) % cycleWidth : 0;
          glides.forEach(function (animation) { animation.cancel(); }); glides = [];
          rail.scrollLeft = position;
        }
      }
      function prepareContinuous() {
        var enabled = continuous && mobile.matches && !reduced();
        if (!enabled) {
          rail.querySelectorAll('[data-band-clone]').forEach(function (n) { n.remove(); });
          rail.classList.remove('band-continuous');
          cycleWidth = 0;
          return;
        }
        if (!rail.querySelector('[data-band-clone]')) {
          originals.forEach(function (card) {
            var copy = card.cloneNode(true);
            copy.setAttribute('data-band-clone', ''); copy.setAttribute('aria-hidden', 'true');
            copy.classList.remove('reveal'); copy.removeAttribute('id');
            copy.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
            if (copy.matches('a,button,[tabindex]')) copy.tabIndex = -1;
            copy.querySelectorAll('a,button,[tabindex]').forEach(function (n) { n.tabIndex = -1; });
            rail.appendChild(copy);
          });
        }
        rail.classList.add('band-continuous');
        cycleWidth = rail.querySelector('[data-band-clone]').getBoundingClientRect().left - originals[0].getBoundingClientRect().left;
        position = rail.scrollLeft;
      }
      function startContinuous() {
        if (touched || fingerDown || (rail.contains(document.activeElement) && document.activeElement.matches(':focus-visible'))) return;
        if (Date.now() < resumeAt) { timer = setTimeout(schedule, resumeAt - Date.now()); return; }
        if (!cycleWidth) return;
        glideStart = rail.scrollLeft % cycleWidth;
        rail.scrollLeft = 0;
        // Animation du compositeur : pas d’arrondi scrollLeft ni de calcul à chaque image.
        glides = Array.from(rail.children).map(function (card) {
          var animation = card.animate([
            { transform: 'translate3d(0,0,0)' },
            { transform: 'translate3d(' + (-cycleWidth) + 'px,0,0)' }
          ], { duration: cycleWidth / .022, iterations: Infinity, easing: 'linear' });
          animation.currentTime = glideStart / .022;
          return animation;
        });
        // currentTime contient déjà le décalage initial.
        glideStart = 0;
      }
      function schedule() {
        stop();
        prepareContinuous();
        if (!mobile.matches || reduced() || !visible || document.hidden) return;
        if (continuous) startContinuous();
        else timer = setTimeout(advance, 3200);
      }
      function advance() {
        timer = null;
        if (!mobile.matches || reduced() || !visible || document.hidden) return;
        if (touched || fingerDown || Date.now() < resumeAt || (rail.contains(document.activeElement) && document.activeElement.matches(':focus-visible'))) { schedule(); return; }
        var cards = Array.from(rail.children).filter(function (card) { return !card.hasAttribute('data-testimonial-clone'); });
        var origin = rail.getBoundingClientRect().left;
        var targets = cards.map(function (card) { return Math.max(0, card.getBoundingClientRect().left - origin + rail.scrollLeft); });
        var current = 0;
        targets.forEach(function (target, index) { if (Math.abs(target - rail.scrollLeft) < Math.abs(targets[current] - rail.scrollLeft)) current = index; });
        var next = (current + 1) % cards.length;
        rail.scrollTo({ left: targets[next], behavior: 'smooth' });
        schedule();
      }
      rail.addEventListener('pointerdown', function () { touched = true; stop(); }, { passive: true });
      rail.addEventListener('touchstart', function () { fingerDown = true; touched = true; stop(); }, { passive: true });
      function release() { if (!touched) return; touched = false; resumeAt = Date.now() + 7000; schedule(); }
      window.addEventListener('pointerup', release, { passive: true });
      window.addEventListener('pointercancel', release, { passive: true });
      function releaseFinger(event) { fingerDown = event.touches.length > 0; if (!fingerDown) { touched = true; release(); } }
      rail.addEventListener('touchend', releaseFinger, { passive: true });
      rail.addEventListener('touchcancel', releaseFinger, { passive: true });
      rail.addEventListener('focusin', function (event) { if (event.target.matches(':focus-visible')) stop(); else schedule(); });
      rail.addEventListener('focusout', schedule);
      document.addEventListener('visibilitychange', schedule);
      window.addEventListener('resize', schedule, { passive: true });
      if (mobile.addEventListener) mobile.addEventListener('change', schedule);
      if (motion && motion.addEventListener) motion.addEventListener('change', schedule);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; schedule(); }, { threshold: 0 }).observe(rail);
      }
    });
  })();
})();
