// =============================================
// SERENIS — Main JS (marketing + auth pages)
// =============================================

// Nav scroll effect
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
