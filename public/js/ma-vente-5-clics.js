/* Presentation only. No storage, API calls or modifications to sharing actions. */
(() => {
  const root = document.querySelector('.five-clicks');
  if (!root) return;
  const track = root.querySelector('.db-process-steps');
  const cards = [...track.children];
  const dots = [...root.querySelectorAll('[data-five-index]')];
  const prev = root.querySelector('[data-five-prev]');
  const next = root.querySelector('[data-five-next]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  function update() {
    // Clamp the terminal position: tablets show two cards at once.
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    if (max > 0 && track.scrollLeft >= max - 2) current = cards.length - 1;
    else current = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - cards[0].offsetLeft - track.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - track.scrollLeft) ? i : best, 0);
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  }
  function go(i) {
    track.scrollTo({ left: cards[Math.max(0, Math.min(cards.length - 1, i))].offsetLeft - cards[0].offsetLeft, behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  prev.addEventListener('click', () => {
    const stride = cards[1].offsetLeft - cards[0].offsetLeft;
    track.scrollTo({ left: Math.max(0, track.scrollLeft - stride), behavior: reduce.matches ? 'auto' : 'smooth' });
  });
  next.addEventListener('click', () => go(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
  track.addEventListener('scroll', update, { passive: true });
  track.tabIndex = 0;
  track.setAttribute('aria-label', 'Les cinq liens de votre vente');
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    go(event.key === 'Home' ? 0 : event.key === 'End' ? 4 : current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  window.addEventListener('resize', update);
  window.addEventListener('pageshow', () => { track.scrollTo({ left: 0, behavior: 'instant' }); update(); });
  update();
})();
