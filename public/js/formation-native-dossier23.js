/* Lesson 2.4, dossiers 02 and 03; validated dossier 01 layout. Original dashboard card and sharing model.
 * No seller routes, permissions, automatic templates or dashboard code are modified.
 */
(() => {
  'use strict';
  const templates = ["<article class=\"formation-native-dossier-card\"><div class=\"five-photo-frame\"><img class=\"five-photo\" src=\"/images/ma-vente-5-clics/hd/03_dossier_acheteur_serieux.png\" alt=\"\" width=\"758\" height=\"347\"></div><div class=\"db-step-body\"><h3 class=\"db-step-label\">Dossier acheteur sérieux</h3><p class=\"db-step-sub\">Après la visite, partagez les documents complémentaires aux acheteurs réellement intéressés.</p><button type=\"button\" class=\"db-step-btn-link\" disabled=\"\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9\"></path></svg><span class=\"db-step-btn-lbl\">Copier pour partager</span></button><a class=\"db-step-preview-link\" data-step=\"3\" aria-disabled=\"true\" target=\"_blank\" rel=\"noopener noreferrer\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg><span>Voir ce que reçoit l’acheteur</span><span aria-hidden=\"true\">→</span></a></div></article>","<article class=\"formation-native-dossier-card\"><div class=\"five-photo-frame\"><img class=\"five-photo\" src=\"/images/ma-vente-5-clics/hd/05_dossier_notaire_suivi.png\" alt=\"\" width=\"1110\" height=\"367\"></div><div class=\"db-step-body\"><h3 class=\"db-step-label\">Dossier notaire et suivi</h3><p class=\"db-step-sub\">Transmettez les documents demandés au notaire et suivez les étapes jusqu'au compromis.</p><button type=\"button\" class=\"db-step-btn-link\" disabled=\"\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9\"></path></svg><span class=\"db-step-btn-lbl\">Copier pour partager</span></button><a class=\"db-step-preview-link\" data-step=\"5\" aria-disabled=\"true\" target=\"_blank\" rel=\"noopener noreferrer\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg><span>Voir ce que reçoit l’acheteur</span><span aria-hidden=\"true\">→</span></a></div></article>"];
  window.createFormationDossier23 = function (index) {
    const template = templates[index - 1];
    const holder = document.createElement('template'); holder.innerHTML = template;
    const card = holder.content.firstElementChild;
    const copy = card.querySelector('button');
    const preview = card.querySelector('a');
    const feedback = document.createElement('p');
    feedback.className = 'formation-native-feedback'; feedback.setAttribute('role', 'status');
    card.querySelector('.db-step-body').appendChild(feedback);
    const _stepCtx = {firstName: '', buyerUrl: '', documentsUrl: '', notaireUrl: '', address: ''};
    // Exact dashboard _stepMsgs[2] and _stepMsgs[4], preserving dynamic fields.
    const models = [
      () => `Bonjour,\n\nSuite à votre visite et afin de vous accompagner dans votre réflexion, je vous transmets mes documents complémentaires (entretien chaudière, ramonage, travaux réalisés...) :\n\n${_stepCtx.documentsUrl || _stepCtx.buyerUrl}\n\nN'hésitez pas à me contacter si vous avez des questions 🙂\n\nCordialement,\n${_stepCtx.firstName}`,
      () => `Bonjour Maître,\n\nSuite à notre accord sur la vente du bien situé au ${_stepCtx.address}, je vous transmets le dossier complet incluant le titre de propriété, les diagnostics, et l'ensemble des documents nécessaires à la rédaction du compromis.\n\nLien sécurisé : ${_stepCtx.notaireUrl}\n\nRestant à votre disposition,\n${_stepCtx.firstName}`
    ];
    const message = models[index - 1];
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
        _stepCtx.documentsUrl = _stepCtx.buyerUrl ? _stepCtx.buyerUrl + '#documents' : '';
        _stepCtx.notaireUrl = property.notaire_url || '';
        _stepCtx.address = [property.address, property.city].filter(Boolean).join(', ') || '';
        shareUrl = index === 1 ? (_stepCtx.documentsUrl || _stepCtx.buyerUrl) : _stepCtx.notaireUrl;
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
