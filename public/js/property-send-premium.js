/* Presentation and expressly approved additions for Mon bien > Prêt à envoyer.
   Existing messages, controls, URLs, copy handlers and permissions stay intact. */
(() => {
  'use strict';
  const tab = document.getElementById('tab-envoi');
  if (!tab) return;

  const advice = {
    pro: "Vos photos professionnelles sont destinées à mettre votre bien en valeur dans vos annonces immobilières. Comme expliqué dans votre formation, sélectionnez vos plus belles photos pour présenter votre logement sur les différents portails d'annonces. Retrouvez-les ici et copiez leur lien en un clic.",
    exterieur: "Votre bien présente un accès particulier, une servitude ou une autre spécificité extérieure ? Pensez à en informer l'acheteur avant la visite.",
    acheteur: "Après une visite, certains acheteurs souhaitent approfondir leur réflexion en consultant des documents complémentaires : factures d'entretien, taxe foncière, informations sur les équipements et autres pièces disponibles. Ce dossier vous permet de leur transmettre ces éléments au bon moment."
  };

  function addAdvice(key) {
    const panel = document.createElement('div');
    panel.className = 'send-pedagogy';
    const icon = document.createElement('span');
    icon.className = 'send-pedagogy-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/></svg>';
    const p = document.createElement('p');
    p.textContent = advice[key];
    panel.append(icon, p);
    return panel;
  }

  // Keep the preexisting professional and exterior SMS in their own rubric.
  // The kit did not include these messages in its screenshot; none is discarded.
  // Save the parent before moving the existing node into the disclosure.
  function retainMessage(key) {
    const message = tab.querySelector('#ev-body-' + key + ' > .ev-msg-wrap');
    const parent = message.parentElement;
    const details = document.createElement('details');
    details.className = 'send-existing-message';
    const summary = document.createElement('summary');
    summary.append(message.querySelector('.ev-msg-header'));
    parent.insertBefore(details, message);
    details.append(summary, message);
  }
  retainMessage('pro');
  retainMessage('exterieur');

  const proBody = document.getElementById('ev-body-pro');
  proBody.prepend(addAdvice('pro'));
  const buyerBody = document.getElementById('ev-body-acheteur');
  buyerBody.prepend(addAdvice('acheteur'));
  const formation = document.createElement('a');
  formation.className = 'send-formation-link';
  // Actual module 2, lesson 4: the three sharing dossiers, including the serious buyer.
  formation.href = '/ma-formation#formation/lecon/2/4';
  formation.textContent = 'Revoir cette étape dans ma formation';
  buyerBody.querySelector('.send-pedagogy').after(formation);

  const exteriorBody = document.getElementById('ev-body-exterieur');
  const approvedMessage = document.createElement('div');
  approvedMessage.className = 'ev-msg-wrap send-approved-exterior';
  const phone = document.createElement('div');
  phone.className = 'ev-msg-phone';
  const top = document.createElement('div');
  top.className = 'ev-msg-phone-handle';
  const bubble = document.createElement('div');
  bubble.className = 'ev-msg-bubble send-approved-bubble';
  bubble.id = 'send-exterior-approved-text';
  const bottom = document.createElement('div');
  bottom.className = 'ev-msg-phone-handle-bot';
  phone.append(top, bubble, bottom);
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'ev-msg-copy-btn';
  copy.textContent = 'Copier le message';
  approvedMessage.append(phone, copy);
  exteriorBody.querySelector('.send-existing-message').before(approvedMessage, addAdvice('exterieur'));

  function exteriorText() {
    const link = document.getElementById('ev-link-exterieur').value;
    const name = window._sellerFirstName || '[Votre prénom]';
    return "Bonjour,\n\nAfin de vous permettre de mieux vous projeter, je vous transmets des photos complémentaires des extérieurs, de la façade et de l'environnement de mon bien.\n\nVous pouvez les consulter ici :\n" + link + "\n\nN'hésitez pas à me contacter si vous souhaitez des précisions avant votre visite.\n\nCordialement,\n" + name;
  }
  function refreshExterior() {
    const text = exteriorText();
    if (bubble.textContent !== text) bubble.textContent = text;
    copy.disabled = !document.getElementById('ev-link-exterieur').value || !window._sellerFirstName;
  }
  copy.addEventListener('click', async () => {
    refreshExterior();
    if (copy.disabled) return;
    try {
      await navigator.clipboard.writeText(exteriorText());
      copy.textContent = 'Message copié ✓';
      copy.classList.add('copied');
      setTimeout(() => {copy.textContent = 'Copier le message'; copy.classList.remove('copied');}, 2000);
    } catch (_) {
      // Reuse the existing copy error guidance; the selectable preview stays available.
      showToast('Copie impossible. Sélectionnez le texte et copiez-le manuellement.', 'error');
    }
  });
  const observer = new MutationObserver(refreshExterior);
  observer.observe(document.getElementById('ev-sms-exterieur'), {childList:true,subtree:true});
  document.querySelectorAll('.fiche-seller-name').forEach(el => observer.observe(el, {childList:true,subtree:true}));
  tab.addEventListener('click', refreshExterior);
  refreshExterior();

  // Two independent desktop columns eliminate blank space under shorter cards.
  // CSS restores the existing row order in a single column on phones.
  const separate = tab.querySelector('.vpm-separate');
  const columns = document.createElement('div');
  columns.className = 'send-card-columns';
  const left = document.createElement('div'), right = document.createElement('div');
  left.className = right.className = 'send-card-column';
  columns.append(left, right);
  separate.append(columns);
  const keys = ['dpe','pro','decouverte','exterieur','details'];
  keys.forEach((key, index) => {
    const card = document.getElementById('ev-card-' + key);
    card.style.setProperty('--send-order', index);
    (['dpe','exterieur'].includes(key) ? left : right).append(card);
    card.classList.add('open');
    card.querySelector('.ev-card-btn').setAttribute('aria-expanded', 'true');
  });
  const buyerCard = document.getElementById('ev-card-acheteur');
  buyerCard.classList.add('open');
  buyerCard.querySelector('.ev-card-btn').setAttribute('aria-expanded','true');

  // Decorative house pictogram only; retain the real logo and all hero text.
  const hero = document.querySelector('.prop-hero');
  const house = document.createElement('div');
  house.className = 'send-hero-art';
  house.setAttribute('aria-hidden', 'true');
  house.innerHTML = '<svg viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M28 76 80 28l52 48M38 70v67h84V70M68 137v-38h24v38M108 51V30h14v34M22 137h116"/><path d="m35 80 45-42 45 42" opacity=".45"/><circle cx="80" cy="81" r="5"/></svg>';
  hero.append(house);
})();
