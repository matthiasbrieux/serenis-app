/* Lesson 2.4, dossier 01 prototype only. Original dashboard card and sharing model.
 * No seller routes, permissions, automatic templates or dashboard code are modified.
 */
(() => {
  'use strict';
  const template = "<article class=\"formation-native-dossier-card\"><div class=\"five-photo-frame\"><img class=\"five-photo\" src=\"/images/ma-vente-5-clics/hd/01_mon_dossier_complet.png\" alt=\"\" width=\"699\" height=\"347\"></div><div class=\"db-step-body\"><h3 class=\"db-step-label\">Mon dossier complet</h3><p class=\"five-note\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9\"></path></svg>Comprend également vos créneaux de visite.</p><p class=\"db-step-sub\">Envoyez avant la visite un dossier complet de votre bien à l'acheteur.</p><button type=\"button\" class=\"db-step-btn-link\" disabled=\"\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9\"></path></svg><span class=\"db-step-btn-lbl\">Copier pour partager</span></button><a class=\"db-step-preview-link\" data-step=\"1\" aria-disabled=\"true\" target=\"_blank\" rel=\"noopener noreferrer\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg><span>Voir ce que reçoit l’acheteur</span><span aria-hidden=\"true\">→</span></a></div></article>";
  window.createFormationDossier01 = function () {
    const holder = document.createElement('template'); holder.innerHTML = template;
    const card = holder.content.firstElementChild;
    const copy = card.querySelector('button');
    const preview = card.querySelector('a');
    const feedback = document.createElement('p');
    feedback.className = 'formation-native-feedback'; feedback.setAttribute('role', 'status');
    card.querySelector('.db-step-body').appendChild(feedback);
    const _stepCtx = {firstName: '', buyerUrl: ''};
    // Exact _stepMsgs[0] from views/seller/dashboard.html, with the same dynamic fields.
    const message = () => `Bonjour,\n\nJe suis ${_stepCtx.firstName}, le propriétaire du bien.\n\nSuite à votre intérêt pour la maison, je vous transmets le dossier complet regroupant la fiche descriptive, les photos ainsi que les diagnostics obligatoires.\n\n${_stepCtx.buyerUrl}\n\nAfin de faciliter nos échanges et de pouvoir répondre au mieux à vos questions concernant le bien, j'ai choisi d'être accompagné par Vendu Par Moi. Cela m'aide à centraliser toutes les informations importantes et à mieux organiser les visites. Cette vente directe, sans intermédiaire, signifie aussi qu'aucune commission n'est intégrée dans le prix — tout en bénéficiant d'un accompagnement aussi rigoureux qu'un professionnel.\n\nVous retrouverez également en bas de la page mes disponibilités pour me rencontrer et visiter le bien.\n\nN'hésitez pas à me contacter si vous avez des questions complémentaires.\n\nÀ bientôt,\n${_stepCtx.firstName}`;
    let shareUrl = '';
    function unavailable() { feedback.textContent = 'Lien non disponible — vérifiez votre espace Mon Bien.'; }
    preview.addEventListener('click', event => { if (!preview.hasAttribute('href')) event.preventDefault(); });
    copy.addEventListener('click', async () => {
      if (!shareUrl) { unavailable(); return; }
      try {
        await navigator.clipboard.writeText(message());
        feedback.textContent = 'Message et lien copiés !';
      } catch (_) {
        // Keep the complete dynamic text available if clipboard permission is denied.
        window.prompt('Copiez ce message :', message());
      }
    });
    // Same authenticated read endpoints and property fields as dashboard.loadData().
    Promise.all([fetch('/api/me'), fetch('/api/property', {cache: 'no-store'})])
      .then(async ([meResponse, propertyResponse]) => {
        if (!meResponse.ok || !propertyResponse.ok) throw Error('Données indisponibles');
        const [meData, propertyData] = await Promise.all([meResponse.json(), propertyResponse.json()]);
        const seller = meData.seller || {};
        const property = propertyData.property || {};
        _stepCtx.firstName = seller.first_name || '';
        _stepCtx.buyerUrl = property.acheteur_url || '';
        shareUrl = _stepCtx.buyerUrl;
        copy.disabled = !shareUrl;
        if (!shareUrl) { unavailable(); return; }
        // Same preview URL validation and environment rebasing as dashboard.initStepLinks().
        try {
          const parsed = new URL(shareUrl);
          if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password && /^\/(dossier\/(acheteur|notaire)|soumettre-offre)\/[^/]+$/.test(parsed.pathname)) {
            preview.href = new URL(parsed.pathname + parsed.search + parsed.hash, window.location.origin).href;
            preview.removeAttribute('aria-disabled');
          }
        } catch (_) {}
      }).catch(unavailable);
    return card;
  };
})();
