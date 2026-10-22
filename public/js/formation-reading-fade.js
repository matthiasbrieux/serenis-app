(() => {
  'use strict';
  const container = document.getElementById('modContainer');
  if (!container) return;
  const veil = document.createElement('div');
  veil.className = 'formation-reading-fade';
  veil.setAttribute('aria-hidden', 'true');
  document.body.append(veil);
  // Plain decorative SVGs do not suppress reading; actionable elements and
  // meaningful labelled diagrams remain protected, including SVG controls.
  const protectedSelector = 'a,button,input,select,textarea,label,table,img,video,audio,iframe,canvas,[onclick],[role="button"],[role="checkbox"],[role="slider"],[role="switch"],[contenteditable="true"],[tabindex]:not([tabindex="-1"]),svg:not([aria-hidden="true"])[role="img"],svg:not([aria-hidden="true"])[aria-label],.schema-flow,.lesson-pagination,.formation-reading-nav,.ck-card';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, alpha = 0, last = 0, revealAfter = 0;
  let currentLesson = null, protectedNodes = [], paragraphs = [];
  function invalidate() { currentLesson = null; schedule(); }
  function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
  function draw(now) {
    frame = 0;
    const elapsed = Math.min(50, last ? now - last : 16);
    last = now;
    const lesson = container.querySelector('.lesson-selected .step-body');
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const viewportLeft = viewport ? viewport.offsetLeft : 0;
    const viewportRight = viewportLeft + (viewport ? viewport.width : window.innerWidth);
    const height = window.matchMedia('(max-width: 767px)').matches ? 65 : 100;
    const top = bottom - height;
    let target = 0;
    if (lesson && document.body.dataset.formationView === 'lesson'
      && !document.body.classList.contains('formation-fiche-open')
      && !document.querySelector('.fiche-overlay.open')) {
      if (currentLesson !== lesson) {
        currentLesson = lesson;
        protectedNodes = [...lesson.querySelectorAll(protectedSelector)];
        paragraphs = [...lesson.querySelectorAll('.sst-text p,.sst-text li,.tip-text')];
      }
      const bounds = lesson.getBoundingClientRect();
      const left = Math.max(viewportLeft, bounds.left);
      const right = Math.min(viewportRight, bounds.right);
      veil.style.left = `${left}px`;
      veil.style.width = `${Math.max(0, right - left)}px`;
      veil.style.top = `${top}px`;
      // Fade out before reaching the lesson end or any protected content.
      target = Math.max(0, Math.min(1, (bounds.bottom - bottom - 32) / 112));
      if (bounds.top > top || right <= left) target = 0;
      let textInBand = false;
      for (const node of paragraphs) {
        const r = node.getBoundingClientRect();
        if (r.width && r.height && r.bottom > top && r.top < bottom) { textInBand = true; break; }
      }
      if (!textInBand) target = 0;
      if (target) for (const node of protectedNodes) {
        const r = node.getBoundingClientRect();
        if (!r.width || !r.height || r.right <= left || r.left >= right) continue;
        const distance = r.top >= bottom ? r.top - bottom : r.bottom <= top ? top - r.bottom : 0;
        target = Math.min(target, Math.max(0, Math.min(1, (distance - 8) / 48)));
        if (!target) break;
      }
    }
    // Briefly hold reappearance to avoid flicker near protected boundaries.
    const waitingForReveal = target > 0 && now < revealAfter && !reduced.matches;
    if (!target) revealAfter = now + 120;
    if (waitingForReveal) target = 0;
    // Proximity controls fade-out; a gradual fade-in prevents flicker on re-entry.
    // Never delay hiding when a protected element actually enters the band.
    alpha = target < alpha || reduced.matches ? target : alpha + (target - alpha) * (1 - Math.exp(-elapsed / 160));
    if (Math.abs(alpha - target) < .002) alpha = target;
    veil.style.opacity = String(alpha);
    if (waitingForReveal || alpha !== target) schedule();
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
  reduced.addEventListener('change', schedule);
  new MutationObserver(invalidate).observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-formation-view'] });
  const overlay = document.getElementById('ficheOverlay');
  if (overlay) new MutationObserver(schedule).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(container);
  schedule();
})();
