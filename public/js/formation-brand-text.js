/* Colour the brand name only in lesson prose; leave controls and graphics intact. */
(() => {
  'use strict';
  if (!document.body.classList.contains('vpm-formation-page')) return;
  const container = document.getElementById('modContainer');
  if (!container) return;
  const prose = '.sst-text, .tip-text, .schema-step, .script-bubble';
  const excluded = [
    'a', 'button', 'input', 'textarea', 'select', 'option', 'label', 'summary',
    'script', 'style', 'svg', 'picture', 'nav', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    '[role]', '[onclick]', '[contenteditable]', '[tabindex]',
    '.sst-title', '.step-hdr', '.lesson-support', '.lesson-resources',
    '.formation-brand-name', '[class*="badge"]', '[class*="logo"]',
    '[class*="status"]', '[class*="warning"]', '[class*="source"]',
    '[class*="brand"]', '[class*="banner"]', '[class*="kicker"]'
  ].join(',');
  function apply() {
    observer.disconnect();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!node.data.includes('Vendu Par Moi') || !parent.closest('.step-body') ||
          !parent.closest(prose) || parent.closest(excluded)) continue;
      // Preserve deliberately coloured elements, including inherited inline colours.
      let styled = false;
      for (let el = parent; el && el !== container; el = el.parentElement) {
        const colour = el.style.color;
        const ordinaryText = /^(?:rgb\((?:48, 42, 38|48, 48, 48|51, 51, 51|85, 85, 85|0, 0, 0|107, 100, 91)\))$/.test(colour);
        if ((colour && !ordinaryText) || el.style.webkitTextFillColor) {
          styled = true;
          break;
        }
      }
      if (!styled) nodes.push(node);
    }
    nodes.forEach(node => {
      const parts = node.data.split('Vendu Par Moi');
      const fragment = document.createDocumentFragment();
      parts.forEach((part, index) => {
        if (index) {
          const name = document.createElement('span');
          name.className = 'formation-brand-name';
          name.textContent = 'Vendu Par Moi';
          fragment.appendChild(name);
        }
        fragment.appendChild(document.createTextNode(part));
      });
      node.replaceWith(fragment);
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });
  }
  const observer = new MutationObserver(apply);
  apply();
})();
