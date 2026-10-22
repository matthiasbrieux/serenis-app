/* Presentation only. Move existing lesson nodes without rewriting their content. */
(() => {
  'use strict';
  // Training previews of dashboard.html _stepMsgs[0, 2, 4]; seller templates stay untouched.
  const messagePreviews = ["Bonjour,\n\nJe suis [Prénom], le propriétaire du bien.\n\nSuite à votre intérêt pour la maison, je vous transmets le dossier complet regroupant la fiche descriptive, les photos ainsi que les diagnostics obligatoires.\n\n[Lien du dossier]\n\nAfin de faciliter nos échanges et de pouvoir répondre au mieux à vos questions concernant le bien, j'ai choisi d'être accompagné par Vendu Par Moi. Cela m'aide à centraliser toutes les informations importantes et à mieux organiser les visites. Cette vente directe, sans intermédiaire, signifie aussi qu'aucune commission n'est intégrée dans le prix — tout en bénéficiant d'un accompagnement aussi rigoureux qu'un professionnel.\n\nVous retrouverez également en bas de la page mes disponibilités pour me rencontrer et visiter le bien.\n\nN'hésitez pas à me contacter si vous avez des questions complémentaires.\n\nÀ bientôt,\n[Prénom]", "Bonjour,\n\nSuite à votre visite et afin de vous accompagner dans votre réflexion, je vous transmets mes documents complémentaires (entretien chaudière, ramonage, travaux réalisés...) :\n\n[Lien du dossier acheteur sérieux]\n\nN'hésitez pas à me contacter si vous avez des questions 🙂\n\nCordialement,\n[Prénom]", "Bonjour Maître,\n\nSuite à notre accord sur la vente du bien situé au [Adresse du bien], je vous transmets le dossier complet incluant le titre de propriété, les diagnostics, et l'ensemble des documents nécessaires à la rédaction du compromis.\n\nLien sécurisé : [Lien du dossier notaire]\n\nRestant à votre disposition,\n[Prénom]"];
  function moduleTitle(text) {
    const title = document.createElement('h4');
    title.className = 'dossier-module-title'; title.textContent = text; return title;
  }
  function decorateMessage(message, index) {
    const title = message.querySelector('.dossier-module-title');
    const preview = message.querySelector('.dossier-message-text');
    const copy = message.querySelector('.dossier-message-copy');
    const feedback = message.querySelector('.dossier-copy-feedback');
    const intro = document.createElement('div');
    intro.className = 'dossier-message-introduction';
    const icon = document.createElement('span');
    icon.className = 'dossier-message-conversation'; icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h14a1 1 0 0 1 1 1v12H10l-5 4v-4H4V5a1 1 0 0 1 1-1Z"/><path d="M8 8h8M8 12h5"/></svg>';
    const explanation = document.createElement('p');
    explanation.className = 'dossier-message-explanation';
    explanation.textContent = 'Voici le message que vous pouvez envoyer à votre contact. Il est déjà rédigé, il vous suffit de le copier et de le coller dans votre e-mail ou votre messagerie.';
    copy.insertAdjacentHTML('afterbegin', '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="3" width="12" height="15" rx="2"/><path d="M5 7H4v14h12v-1"/></svg>');
    intro.append(icon, title, explanation, copy, feedback);
    const phone = document.createElement('div');
    phone.className = 'dossier-message-phone';
    const screen = document.createElement('div'); screen.className = 'dossier-message-screen';
    const status = document.createElement('div'); status.className = 'dossier-phone-status';
    status.setAttribute('aria-hidden', 'true'); status.innerHTML = '<span>9:41</span><span class="dossier-phone-island"></span><span class="dossier-phone-battery"></span>';
    const contact = document.createElement('div'); contact.className = 'dossier-phone-contact';
    const recipient = index === 2 ? 'Notaire' : 'Acheteur';
    contact.innerHTML = '<span class="dossier-phone-avatar" aria-hidden="true">' + recipient[0] + '</span>';
    const label = document.createElement('span'); label.textContent = recipient; contact.append(label);
    const composer = document.createElement('div'); composer.className = 'dossier-phone-composer';
    composer.setAttribute('aria-hidden', 'true'); composer.innerHTML = '<span>+</span><span>iMessage</span>';
    screen.append(status, contact, preview, composer); phone.append(screen);
    message.append(intro, phone);
  }
  function decorateNativeDiscovery(discovery, index) {
    const paths = {
      file: '<path d="M14 2H5v20h14V7l-5-5Z"/><path d="M14 2v5h5M8 12h8M8 16h6"/>',
      chart: '<path d="M4 14h3v7H4zM10 9h3v12h-3zM16 3h3v18h-3z"/>',
      wrench: '<path d="M14 7a5 5 0 0 0 6-6l-3 3-2-2 3-3a5 5 0 0 0-6 6L3 17a2 2 0 0 0 3 3L14 7Z"/>',
      gear: '<path d="m9 3 1-2h4l1 2 3 2 2 1v4l-2 1v3l2 1v4l-3 1-2 2h-4l-1-2-3-1-3-1v-4l2-1v-3L4 9V5l3-1Z"/><circle cx="12" cy="12" r="3"/>',
      home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
      camera: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
      surface: '<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M3 3l6 6M21 3l-6 6M21 21l-6-6M3 21l6-6"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      identity: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M4 17c0-4 8-4 8 0M15 9h4M15 13h4"/>',
      money: '<path d="M17 5a7 7 0 1 0 0 14M4 10h11M4 14h10"/>',
      building: '<path d="M5 21V3h10v18M15 9h4v12M3 21h18M8 7h4M8 11h4M8 15h4M9 21v-3"/>',
      target: '<circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><path d="m11 13 9-9M17 3l1 4 4 1"/>'
    };
    function icon(kind, className) {
      const element = document.createElement('span'); element.className = className;
      element.setAttribute('aria-hidden', 'true');
      element.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+paths[kind]+'</svg>';
      return element;
    }
    for (const [selector, kind] of [['.dossier-unified-contents > .dossier-guide-subtitle', 'file'], ['.dossier-unified-usage > .dossier-module-title', 'gear']]) {
      const heading = discovery.querySelector(selector);
      if (!heading) continue;
      const label = document.createElement('span'); label.className = 'dossier-reference-heading-label';
      while (heading.firstChild) label.appendChild(heading.firstChild);
      heading.append(icon(kind, 'dossier-reference-heading-icon'), label);
    }
    const listIcons = [['file','camera','surface','gear','chart','clock'], ['chart','wrench','gear','home','file'], ['home','identity','chart','wrench','money','building','file']][index];
    discovery.querySelectorAll('.dossier-unified-contents > ul > li').forEach((item, position) => {
      // One text item prevents inline brand spans from becoming separate flex columns.
      const text = document.createElement('span'); text.className = 'dossier-reference-list-text';
      while (item.firstChild) text.appendChild(item.firstChild);
      item.append(icon(listIcons[position] || 'file', 'dossier-reference-list-icon'), text);
    });
    const card = discovery.querySelector('.formation-native-dossier-card');
    const description = card?.querySelector('.db-step-sub');
    if (description) {
      const introduction = document.createElement('div'); introduction.className = 'dossier-native-tool-intro';
      introduction.append(icon('home', 'dossier-native-intro-icon'), description);
      card.before(introduction);
    }
    const notes = discovery.querySelector('.dossier-unified-notes');
    if (notes) {
      const copy = document.createElement('div'); copy.className = 'dossier-reference-objective-copy';
      while (notes.firstChild) copy.appendChild(notes.firstChild);
      notes.append(icon('target', 'dossier-reference-target'), copy);
    }
    // Visual copy icon, retaining the existing button and its event handler.
    const buttonIcon = discovery.querySelector('.formation-native-dossier-card button svg');
    const sourceIcon = discovery.querySelector('.dossier-tool-buttons dt svg');
    if (buttonIcon && sourceIcon) buttonIcon.replaceWith(sourceIcon.cloneNode(true));
  }
  function prepare(container) {
    const lesson = container.matches?.('#step-1-3') ? container : container.querySelector('#step-1-3');
    if (!lesson || lesson.dataset.dossierEditorial === 'ready') return;
    lesson.dataset.dossierEditorial = 'ready';
    const body = lesson.querySelector('.step-body');
    const sections = [...body.children].filter(el => el.classList.contains('sst'));
    const titleOf = section => section.querySelector('.sst-title')?.textContent.trim();
    const starts = sections.filter(section => /^(01|02|03) — /.test(titleOf(section)));
    const headingText = element => element.textContent.trim().toLowerCase();
    starts.forEach((section, index) => {
      const article = document.createElement('article');
      article.className = 'dossier-editorial';
      article.dataset.dossier = String(index + 1);
      section.before(article);
      const heading = section.querySelector(':scope > .sst-title');
      heading.classList.add('dossier-editorial-title');
      article.appendChild(heading);
      const content = section.querySelector(':scope > .sst-text');
      const stage = content.querySelector(':scope > .dossier-guide-subtitle');
      if (stage) { stage.classList.add('dossier-editorial-stage'); article.appendChild(stage); }
      const capture = content.querySelector('.dossier-guide-capture');
      if (capture) {
        const frame = document.createElement('div');
        frame.className = 'dossier-editorial-capture';
        frame.dataset.capture = String(index + 1);
        frame.appendChild(capture);
        article.appendChild(frame);
      }
      const intro = document.createElement('div');
      intro.className = 'sst-text dossier-editorial-intro';
      const panels = document.createElement('div');
      panels.className = 'dossier-editorial-panels';
      const actions = document.createElement('div');
      actions.className = 'sst-text dossier-editorial-actions';
      const documents = document.createElement('div');
      documents.className = 'dossier-editorial-documents';
      const extra = document.createElement('div');
      extra.className = 'dossier-editorial-extra';
      let destination = intro;
      let contentsPanel;
      let orderPanel;
      [...content.children].forEach(node => {
        if (node.matches('h4.dossier-guide-subtitle')) {
          if (headingText(node) === 'ce que contient ce dossier') {
            contentsPanel = document.createElement('section');
            contentsPanel.className = 'sst-text dossier-editorial-panel dossier-editorial-contents';
            panels.appendChild(contentsPanel);
            destination = contentsPanel;
          } else if (headingText(node) === 'le bon ordre') {
            orderPanel = document.createElement('section');
            orderPanel.className = 'sst-text dossier-editorial-panel dossier-editorial-order';
            panels.appendChild(orderPanel);
            destination = orderPanel;
          } else destination = actions;
        }
        destination.appendChild(node);
      });
      const start = sections.indexOf(section);
      for (let next = start + 1; next < sections.length; next++) {
        const sibling = sections[next];
        if (starts.includes(sibling) || titleOf(sibling) === 'POURQUOI PRÉPARER CES TROIS DOSSIERS ?') break;
        const title = titleOf(sibling);
        if (title === 'DOCUMENTS À DÉPOSER' || title === 'CE DOSSIER COMPREND NOTAMMENT') {
          documents.appendChild(sibling);
        } else if (title === 'LE MESSAGE À ENVOYER APRÈS LA VISITE') {
          sibling.classList.add('dossier-editorial-panel', 'dossier-editorial-message');
          extra.appendChild(sibling);
        } else if (title === 'POURQUOI ANTICIPER ?') {
          sibling.classList.add('dossier-editorial-panel', 'dossier-editorial-order');
          panels.appendChild(sibling);
        } else if (title.startsWith('VOTRE ACTION')) actions.appendChild(sibling);
        else if (title === 'POURQUOI PRÉPARER CE DOSSIER ?') {
          sibling.classList.add('dossier-editorial-panel', 'dossier-editorial-order'); panels.appendChild(sibling);
        } else extra.appendChild(sibling);
      }
      const footer = document.createElement('div');
      footer.className = 'dossier-editorial-footer';
      while (extra.firstChild) footer.appendChild(extra.firstChild);
      const actionCopy = document.createElement('div');
      actionCopy.className = 'sst-text dossier-editorial-action-description';
      [...actions.children].forEach(node => {
        if (node.classList.contains('sst') || node.classList.contains('dossier-guide-note')) footer.appendChild(node);
        else actionCopy.appendChild(node);
      });
      if (actionCopy.childNodes.length) footer.prepend(actionCopy);
      // The same five modules, retaining every original node and its handlers.
      const order = panels.querySelector('.dossier-editorial-order');
      if (order && index > 0) order.prepend(moduleTitle('Le bon ordre'));
      // Detailed documents follow the main two-column presentation.
      footer.prepend(moduleTitle('Votre action'));
      const message = document.createElement('section');
      message.className = 'sst-text dossier-editorial-panel dossier-message-preview';
      message.appendChild(moduleTitle('VOTRE MESSAGE PRÊT À ENVOYER'));
      const preview = document.createElement('div');
      preview.className = 'dossier-message-text'; preview.textContent = messagePreviews[index];
      const copy = document.createElement('button');
      copy.type = 'button'; copy.className = 'dossier-message-copy'; copy.textContent = 'Copier le message';
      const feedback = document.createElement('span');
      feedback.className = 'dossier-copy-feedback'; feedback.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(messagePreviews[index]);
          feedback.textContent = 'Message copié';
        } catch (_) {
          window.prompt('Copiez ce message :', messagePreviews[index]);
        }
      });
      message.append(preview, copy, feedback);
      decorateMessage(message, index);
      const tool = document.createElement('section');
      tool.className = 'dossier-editorial-tool';
      tool.appendChild(moduleTitle('Ma vente en 5 clics'));
      const locationHint = document.createElement('p');
      locationHint.className = 'dossier-tool-location-hint';
      locationHint.textContent = 'Retrouvez facilement ce dossier dans votre espace “Ma vente en 5 clics”, prêt à être partagé au bon moment.';
      tool.appendChild(locationHint);
      const frame = article.querySelector('.dossier-editorial-capture');
      if (frame) tool.appendChild(frame);
      const guidance = document.createElement('div');
      guidance.className = 'sst-text dossier-tool-guidance';
      const explanations = document.createElement('dl');
      explanations.className = 'dossier-tool-buttons';
      const labels = ['Copier pour partager', "Voir ce que reçoit l'acheteur"];
      const descriptions = [
        'Copie le message de partage contenant le lien du dossier à transmettre.',
        index === 2 ? "Ouvre l'aperçu du dossier destiné au notaire avant de le partager. Ce bouton conserve le libellé affiché dans l'application." : "Permet de visualiser le dossier avant de le partager."
      ];
      labels.forEach((label, position) => {
        const term = document.createElement('dt'); term.textContent = label;
        const description = document.createElement('dd'); description.textContent = descriptions[position];
        explanations.append(term, description);
      });
      guidance.appendChild(explanations);
      // Relocate the existing action explanation; retain its exact wording and controls.
      // Keep the existing action explanation at the end of its dossier.
      // Replace the old two wrappers with one pedagogical module, moving original nodes.
      const unified = document.createElement('section');
      unified.className = 'dossier-unified-module';
      const contents = document.createElement('div');
      contents.className = 'sst-text dossier-unified-contents';
      if (contentsPanel) {
        while (contentsPanel.firstChild) contents.appendChild(contentsPanel.firstChild);
        contentsPanel.remove();
      }
      const list = contents.querySelector(':scope > ul');
      if (list) {
        const notes = document.createElement('aside');
        notes.className = 'dossier-unified-notes';
        let node = list.nextSibling;
        while (node) { const next = node.nextSibling; notes.appendChild(node); node = next; }
        if (notes.textContent.trim()) contents.appendChild(notes);
      }
      guidance.className = 'sst-text dossier-unified-usage';
      guidance.prepend(moduleTitle('COMMENT UTILISER CE DOSSIER'));
      const terms = explanations.querySelectorAll('dt');
      const copyIcon = copy.querySelector('svg');
      if (copyIcon) terms[0].prepend(copyIcon.cloneNode(true));
      // Same preview icon as the real dashboard cards.
      terms[1].insertAdjacentHTML('afterbegin', '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>');
      const discovery = document.createElement('section');
      discovery.className = 'dossier-discovery';
      const captureColumn = document.createElement('div');
      captureColumn.className = 'dossier-discovery-capture';
      while (tool.firstChild) captureColumn.appendChild(tool.firstChild);
      if (index === 0 && window.createFormationDossier01) {
        discovery.classList.add('dossier-discovery-native');
        captureColumn.querySelector('.dossier-editorial-capture')?.remove();
        captureColumn.appendChild(window.createFormationDossier01());
      } else if (index > 0 && window.createFormationDossier23) {
        discovery.classList.add('dossier-discovery-native');
        captureColumn.querySelector('.dossier-editorial-capture')?.remove();
        captureColumn.appendChild(window.createFormationDossier23(index));
      }
      unified.append(contents, guidance);
      discovery.append(captureColumn, unified);
      const header = document.createElement('header');
      header.className = 'dossier-presentation-header';
      const marker = document.createElement('div');
      marker.className = 'dossier-presentation-marker';
      const number = document.createElement('span');
      number.className = 'dossier-header-number'; number.textContent = 'ÉTAPE ' + String(index + 1).padStart(2, '0');
      marker.appendChild(number);
      if (stage) {
        stage.textContent = ['— AVANT LA VISITE', '— APRÈS LA VISITE', '— POUR LE NOTAIRE'][index];
        marker.appendChild(stage);
      }
      // Move the existing number into its own marker; the title words remain unchanged.
      heading.querySelectorAll('svg').forEach(icon => icon.remove());
      const titleNodes = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      while (titleNodes.nextNode()) {
        const node = titleNodes.currentNode;
        if (/^\s*0[1-3] — /.test(node.data)) { const title = node.data.replace(/^\s*0[1-3] — /, ''); node.data = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase(); break; }
      }
      header.append(marker, heading, intro);
      if (index === 0 && discovery.classList.contains('dossier-discovery-native')) {
        const objective = [...intro.querySelectorAll('p')].find(paragraph => /^L['']objectif/.test(paragraph.textContent.trim()));
        const notes = contents.querySelector('.dossier-unified-notes');
        if (objective && notes) { objective.classList.add('dossier-native-objective'); notes.prepend(objective); }
      }
      decorateNativeDiscovery(discovery, index);
      // One shared reading sequence, without inventing missing sections or text.
      const information = document.createElement('div');
      information.className = 'dossier-information-module';
      if (documents.children.length) information.appendChild(documents);
      if (panels.children.length) information.appendChild(panels);
      const messages = document.createElement('div');
      messages.className = 'dossier-messages-module';
      messages.appendChild(message);
      const supplements = document.createElement('div');
      supplements.className = 'dossier-complementary-module';
      [...footer.children].forEach(node => {
        if (node.classList.contains('dossier-editorial-message')) messages.appendChild(node);
        else if (node.classList.contains('dossier-guide-note') ||
                 (node.classList.contains('sst') && !titleOf(node).startsWith('VOTRE ACTION'))) supplements.appendChild(node);
      });
      article.append(header, discovery, information, messages, footer);
      if (supplements.children.length) article.appendChild(supplements);
      section.remove();
      // Replace decorative category emoji with the project's existing fine-line icon.
      article.querySelectorAll('.dossier-document-category-title').forEach(title => {
        const text = title.firstChild;
        if (text?.nodeType !== Node.TEXT_NODE) return;
        const stripped = text.data.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '');
        if (stripped === text.data) return;
        text.data = stripped;
        title.insertAdjacentHTML('afterbegin', window.lessonIcon('resource'));
      });
    });
    const transitions = [
      ['UNE FOIS LA VISITE EFFECTUÉE', 'Les acheteurs intéressés peuvent avoir besoin de documents complémentaires pour avancer dans leur décision.'],
      ['LORSQUE LA VENTE SE CONCRÉTISE', "Le dossier notaire permet de préparer les formalités et d'anticiper les documents nécessaires au compromis."]
    ];
    const dossiers = [...body.querySelectorAll(':scope > .dossier-editorial')];
    transitions.forEach(([label, explanation], index) => {
      if (!dossiers[index + 1]) return;
      const transition = document.createElement('div');
      transition.className = 'dossier-journey-transition';
      const icon = document.createElement('span');
      icon.className = 'dossier-journey-arrow';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m-6-6 6 6 6-6"/></svg>';
      const heading = document.createElement('p');
      heading.className = 'dossier-journey-label'; heading.textContent = label;
      const paragraph = document.createElement('p');
      paragraph.className = 'dossier-journey-explanation'; paragraph.textContent = explanation;
      transition.append(icon, heading, paragraph);
      dossiers[index + 1].before(transition);
    });
    // Four document categories: visual treatment from the approved reference.
    const categoryPaths = [
      '<path d="M4 5v14M9 5v14M14 5v14M19 5v14M2 8h20M2 16h20"/>',
      '<path d="m4 3 17 18M3 4l3-1 3 3-3 3-3-3V4ZM14 8a5 5 0 0 0 6-6l-3 3-2-2 3-3a5 5 0 0 0-6 6L3 17a2 2 0 0 0 3 3L14 8Z"/>',
      '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
      '<path d="M3 6h7l2 3h9v12H3V6Z"/>'
    ];
    lesson.querySelectorAll('.dossier-editorial[data-dossier="2"] .dossier-document-category-title').forEach((title, index) => {
      const icon = title.querySelector('svg');
      if (icon) icon.innerHTML = categoryPaths[index];
    });
    const overview = sections.find(section => titleOf(section) === 'TROIS DOSSIERS, TROIS OBJECTIFS');
    if (overview) {
      overview.classList.add('dossier-editorial-overview', 'dossier-overview-cards');
      const overviewTitle = overview.querySelector('.sst-title');
      if (overviewTitle) {
        const walker = document.createTreeWalker(overviewTitle, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) if (walker.currentNode.data.trim() === 'TROIS DOSSIERS, TROIS OBJECTIFS') walker.currentNode.data = 'Trois dossiers, trois objectifs';
      }
      overview.querySelectorAll(':scope > .sst-text > p').forEach((paragraph, index) => {
        const title = paragraph.querySelector('strong');
        if (!title) return;
        const number = document.createElement('span');
        number.className = 'dossier-overview-number'; number.textContent = String(index + 1).padStart(2, '0');
        title.textContent = title.textContent.replace(/^0[1-3] — /, '');
        const remainder = [...paragraph.childNodes].filter(node => node !== title).map(node => node.textContent).join('');
        const separator = remainder.indexOf(':');
        const timing = document.createElement('span'); timing.className = 'dossier-overview-timing';
        timing.textContent = remainder.slice(0, separator + 1).replace(/^\s*—\s*/, '');
        const description = document.createElement('span'); description.className = 'dossier-overview-description';
        description.textContent = remainder.slice(separator + 1).trim();
        const icon = document.createElement('span'); icon.className = 'dossier-overview-icon'; icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = window.lessonIcon(index === 0 ? 'home' : index === 2 ? 'resource' : 'advice');
        paragraph.replaceChildren(number, icon, timing, title, description);
      });
    }
    const finalAction = sections.find(section => titleOf(section) === 'VOTRE ACTION — RETROUVER MES DOSSIERS');
    if (finalAction) finalAction.classList.add('dossier-editorial-final-action');
  }
  window.prepareDossierEditorial = prepare;
  const root = document.getElementById('modContainer');
  if (root) prepare(root);

  // Lesson 2.2 — same phone card as lesson 2.4 "VOTRE MESSAGE PRÊT À ENVOYER"
  function prepareDiagnosticsSms(container) {
    const lesson = container?.matches?.('#step-1-1') ? container : container?.querySelector?.('#step-1-1');
    if (!lesson || lesson.dataset.diagSmsDeco === 'ready') return;
    const preview = lesson.querySelector('.dossier-message-preview');
    if (!preview || preview.querySelector('.dossier-message-phone')) return;
    lesson.dataset.diagSmsDeco = 'ready';
    const text = preview.querySelector('.dossier-message-text');
    const copy = preview.querySelector('.dossier-message-copy');
    const feedback = preview.querySelector('.dossier-copy-feedback');
    if (copy && text) {
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text.textContent);
          if (feedback) feedback.textContent = 'Message copié';
        } catch (_) {
          window.prompt('Copiez ce message :', text.textContent);
        }
      });
    }
    decorateMessage(preview, 0);
  }
  window.prepareDiagnosticsSms = prepareDiagnosticsSms;
  if (root) prepareDiagnosticsSms(root);
})();
