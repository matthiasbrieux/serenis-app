// =============================================
// SERENIS — Main JS (marketing + auth pages)
// =============================================

// ── Smooth scroll avec easing sur tous les liens ancres ──
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function smoothScrollTo(target, duration = 900) {
  const startY = window.scrollY;
  const el = document.querySelector(target);
  if (!el) return;
  const navH = document.getElementById('mainNav')?.offsetHeight || 72;
  const targetY = el.getBoundingClientRect().top + startY - navH - 16;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + (targetY - startY) * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href === '#') return;
  e.preventDefault();
  smoothScrollTo(href);
});

// ── Animations scroll — révélations variées ──
function initScrollAnimations() {
  // Chaque type d'élément a son propre effet
  const effects = {
    '.section-impact .impact-number': { from: 'translateY(20px)', opacity: 0, duration: 1400 },
    '.problem-card':     { from: 'translateY(28px)', opacity: 0, duration: 900, stagger: 110 },
    '.step-item':        { from: 'translateX(-18px)', opacity: 0, duration: 950, stagger: 130 },
    '.offre-card':       { from: 'translateY(24px)', opacity: 0, duration: 1000, stagger: 140 },
    '.section-header':   { from: 'translateY(18px)', opacity: 0, duration: 900 },
    '.impact-inner':     { from: 'translateY(30px)', opacity: 0, duration: 1100 },
    '.comparatif-table-wrapper': { from: 'translateY(20px)', opacity: 0, duration: 900 },
    '.legal-col':        { from: 'translateY(18px)', opacity: 0, duration: 900, stagger: 160 },
    '.faq-item':         { from: 'translateY(14px)', opacity: 0, duration: 800, stagger: 70 },
    '.contact-item':     { from: 'translateX(-14px)', opacity: 0, duration: 850, stagger: 130 },
    '.garantie-inner':   { from: 'translateY(20px)', opacity: 0, duration: 1000 },
  };

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseFloat(el.dataset.animDelay || 0);
      const dur = el.dataset.animDuration || 900;
      setTimeout(() => {
        el.style.transition = `opacity ${dur}ms cubic-bezier(0.16,1,0.3,1), transform ${dur}ms cubic-bezier(0.16,1,0.3,1)`;
        el.style.opacity = '1';
        el.style.transform = 'none';
      }, delay);
      obs.unobserve(el);
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });

  Object.entries(effects).forEach(([selector, cfg]) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.style.opacity = String(cfg.opacity ?? 0);
      el.style.transform = selector.includes('scale') || (cfg.from && cfg.from.includes('scale'))
        ? cfg.from : `${cfg.from || 'translateY(20px)'}`;
      el.dataset.animDelay = String((cfg.stagger || 0) * i);
      el.dataset.animDuration = String(cfg.duration || 600);
      obs.observe(el);
    });
  });

  // Compteur animé sur le chiffre impact
  const impactNum = document.querySelector('.impact-number');
  if (impactNum) {
    const numObs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      countUp(impactNum, 9001, '€', 1600);
      numObs.unobserve(impactNum);
    }, { threshold: 0.5 });
    numObs.observe(impactNum);
  }
}

function countUp(el, target, suffix, duration) {
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const start = performance.now();
  const originalHTML = el.innerHTML;
  const euroEl = el.querySelector('.impact-euro');

  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const val = Math.round(target * easeOut(p));
    const formatted = val.toLocaleString('fr-FR');
    el.innerHTML = `${formatted}<span class="impact-euro">${suffix}</span>`;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Parallax subtil sur le hero
function initHeroParallax() {
  const heroBg = document.querySelector('.hero-bg');
  const heroGrid = document.querySelector('.hero-grid');
  if (!heroBg) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    heroBg.style.transform = `translateY(${y * 0.3}px)`;
    if (heroGrid) heroGrid.style.transform = `translateY(${y * 0.15}px)`;
  }, { passive: true });
}

initScrollAnimations();
initHeroParallax();

// ── Nav scroll effect ──
const nav = document.getElementById('mainNav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

// Mobile menu
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navLinks.style.display = navLinks.classList.contains('open') ? 'flex' : '';
    if (navLinks.classList.contains('open')) {
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '70px';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'var(--blanc)';
      navLinks.style.padding = '16px 24px';
      navLinks.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
      navLinks.style.zIndex = '999';
    }
  });
}

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isOpen = answer.classList.contains('open');
    document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('.faq-question').forEach(b => b.classList.remove('active'));
    if (!isOpen) {
      answer.classList.add('open');
      btn.classList.add('active');
    }
  });
});

// Payment modal
const paymentModal = document.getElementById('paymentModal');
const modalClose = document.getElementById('modalClose');
const paymentForm = document.getElementById('paymentForm');
let selectedPack = null;

document.querySelectorAll('[data-pack]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    selectedPack = btn.dataset.pack;
    const labels = { autonome: 'Pack Autonome — 99 € TTC', serenite: 'Pack Sérénité — 999 € TTC' };
    const descs = {
      autonome: 'Guide vendeur, mails types, checklists, méthode complète.',
      serenite: 'Photos pro, visite virtuelle, numéro 09, dossier automatique, agenda. Tout inclus.'
    };
    document.getElementById('modalTitle').textContent = labels[selectedPack];
    document.getElementById('modalPackInfo').textContent = descs[selectedPack];
    paymentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
});

if (modalClose) {
  modalClose.addEventListener('click', closeModal);
}
if (paymentModal) {
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) closeModal();
  });
}

function closeModal() {
  paymentModal.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && paymentModal?.classList.contains('active')) closeModal();
});

if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('paymentEmail').value.trim();
    const btn = document.getElementById('payBtn');
    const errDiv = document.getElementById('payError');
    if (!email) return;

    btn.textContent = 'Redirection...';
    btn.disabled = true;
    errDiv.classList.add('hidden');

    try {
      const res = await fetch('/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: selectedPack, email })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        errDiv.textContent = data.error || 'Erreur. Réessayez.';
        errDiv.classList.remove('hidden');
        btn.textContent = 'Procéder au paiement sécurisé →';
        btn.disabled = false;
      }
    } catch {
      errDiv.textContent = 'Erreur réseau. Réessayez.';
      errDiv.classList.remove('hidden');
      btn.textContent = 'Procéder au paiement sécurisé →';
      btn.disabled = false;
    }
  });
}

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    const successDiv = document.getElementById('contactSuccess');
    const errorDiv = document.getElementById('contactError');
    const btn = contactForm.querySelector('button[type="submit"]');

    btn.textContent = 'Envoi...';
    btn.disabled = true;
    successDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        successDiv.classList.remove('hidden');
        contactForm.reset();
      } else {
        errorDiv.textContent = result.error || 'Erreur. Réessayez.';
        errorDiv.classList.remove('hidden');
      }
    } catch {
      errorDiv.textContent = 'Erreur réseau. Réessayez.';
      errorDiv.classList.remove('hidden');
    }
    btn.textContent = 'Envoyer ma demande';
    btn.disabled = false;
  });
}

// Toast utility
window.showToast = function(msg, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
};

// ── Calculateur d'économies interactif ──────────────────────────
function fmt(n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; }
function fmtTaux(t) { return t.toFixed(1).replace('.', ',') + ' %'; }

function updateCalc() {
  const price = parseInt(document.getElementById('calcPrice')?.value) || 250000;
  const taux = parseFloat(document.getElementById('calcTaux')?.value) || 5;
  const agence = price * (taux / 100);
  const eco = agence - 999;

  const agenceEl = document.getElementById('calcAgence');
  const agenceLabelEl = document.getElementById('calcAgenceLabel');
  const tauxLabelEl = document.getElementById('calcTauxLabel');
  const ecoEl = document.getElementById('calcEco');
  const ecoPctEl = document.getElementById('calcEcoPct');

  if (agenceEl) agenceEl.textContent = fmt(agence);
  if (agenceLabelEl) agenceLabelEl.textContent = 'Agence (' + fmtTaux(taux) + ')';
  if (tauxLabelEl) tauxLabelEl.textContent = fmtTaux(taux);

  if (ecoEl) {
    const ecoVal = Math.max(eco, 0);
    ecoEl.style.opacity = '0';
    setTimeout(() => { ecoEl.textContent = fmt(ecoVal); ecoEl.style.opacity = '1'; }, 100);
    if (ecoPctEl) ecoPctEl.textContent = ecoVal > 0 ? 'soit ' + fmtTaux((ecoVal / price) * 100) + ' du prix de vente conservés' : '';
  }
}

const calcPrice = document.getElementById('calcPrice');
const calcSlider = document.getElementById('calcSlider');
const calcTaux = document.getElementById('calcTaux');
if (calcPrice) {
  calcPrice.addEventListener('input', () => { if (calcSlider) calcSlider.value = calcPrice.value; updateCalc(); });
  calcSlider?.addEventListener('input', () => { calcPrice.value = calcSlider.value; updateCalc(); });
  calcTaux?.addEventListener('input', () => updateCalc());
  updateCalc();
}
