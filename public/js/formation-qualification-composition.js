/* Lesson 4.2 only: existing text nodes, accessible reading controls and local copying. */
(() => {
  'use strict';
  const container = document.getElementById('modContainer');
  if (!container) return;
  const asset = '/images/formation/qualification/conversation-sans-texte.png';
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const head = section => section.querySelector('.sst-title');
  const body = section => section.querySelector('.sst-text');
  const portrait = role => {
    const frame = make('div','qualifier-portrait qualifier-portrait-'+role);
    frame.setAttribute('aria-hidden','true');
    const img = make('img'); img.src = asset; img.alt = ''; frame.append(img);
    return frame;
  };
  function accordion(section, open) {
    const title = head(section);
    const heading = title.closest('.vpm-badge-heading') || title;
    const details = make('details','qualifier-disclosure');
    details.open = open;
    const summary = make('summary'); summary.append(heading);
    details.append(summary);
    [...section.children].forEach(el => {if (el !== heading) details.append(el);});
    section.append(details);
    section.classList.add('qualifier-accordion');
  }
  function markVariables(quote) {
    const walker = document.createTreeWalker(quote, NodeFilter.SHOW_TEXT);
    const nodes = []; let node;
    while ((node=walker.nextNode())) if (/\[lien du dossier\]|\[Votre prénom\]/.test(node.textContent)) nodes.push(node);
    for (const original of nodes) {
      const fragment = document.createDocumentFragment();
      original.textContent.split(/(\[lien du dossier\]|\[Votre prénom\])/).forEach(part => {
        if (part==='[lien du dossier]' || part==='[Votre prénom]') {
          const span=make('span','qualifier-variable',part);
          span.dataset.template=part; fragment.append(span);
        } else fragment.append(document.createTextNode(part));
      });
      original.replaceWith(fragment);
    }
  }
  function phone(section, {dynamic=false}={}) {
    const content = body(section), quote = content.querySelector('blockquote');
    if (!quote) return;
    if (dynamic) markVariables(quote);
    const layout = make('div','qualifier-message-layout');
    const copy = make('div','qualifier-message-copy');
    [...content.children].filter(el=>el!==quote).forEach(el=>copy.append(el));
    const preview = make('div','qualifier-message-preview');
    const device = make('div','qualifier-phone');
    const notch = make('div','qualifier-phone-notch');notch.setAttribute('aria-hidden','true');
    const handle = make('div','qualifier-phone-handle');handle.setAttribute('aria-hidden','true');
    quote.classList.add('qualifier-outgoing');
    device.append(notch,quote,handle);
    const button = make('button','qualifier-copy-button','Copier le message'); button.type='button';
    button.addEventListener('click',async()=>{
      try {await navigator.clipboard.writeText(quote.innerText.trim());button.textContent='Message copié';setTimeout(()=>button.textContent='Copier le message',1800);}
      catch (_) {button.textContent='Copie impossible';setTimeout(()=>button.textContent='Copier le message',1800);}
    });
    preview.append(device,button);layout.append(copy,preview);content.append(layout);
    section.classList.add('qualifier-message-section');
  }
  function compose() {
    const lesson=document.getElementById('step-3-1');
    if (!lesson || lesson.dataset.qualifierComposition) return;
    lesson.dataset.qualifierComposition='true';
    const sections=[...lesson.querySelectorAll('.step-body > .sst')];
    sections.forEach(section=>section.dataset.originalTitle=head(section)?.textContent.trim()||'');
    const hero=portrait('buyer');hero.classList.add('qualifier-hero-portrait');lesson.querySelector('.lesson-masthead').append(hero);
    const intro=sections[0];intro.classList.add('qualifier-intro');
    const introCopy=body(intro), path=introCopy.lastElementChild;path.classList.add('qualifier-path');
    const section=(needle)=>sections.find(el=>el.dataset.originalTitle.includes(needle));
    const platform=section('CONTACTE SUR LEBONCOIN'), platformMessage=section('MESSAGE PRÊT À ENVOYER SUR LEBONCOIN'), sms=section('ENVOYEZ LE LIEN DU DOSSIER'), link=section('OÙ RETROUVER'), calls=section('COMMENT RÉPONDRE'), first=section('EXEMPLE — PREMIER CONTACT'), questions=section('COMMENT QUALIFIER LE PROJET'), profiles=section('DIFFÉRENTS PROFILS'), immediate=section('VISITE IMMÉDIATEMENT'), price=section('BAISSER LE PRIX'), objections=section('OBJECTIONS LES PLUS'), agenda=section('OUTILS DE QUALIFICATION'), limit=section('QUAND PEUT-ON'), action=section('VOTRE ACTION'), takeaway=section('À RETENIR');
    phone(platformMessage); phone(sms,{dynamic:true}); phone(agenda,{dynamic:true});
    link.classList.add('qualifier-link-section');
    const dossier=make('a','qualifier-dossier-link','Retrouver mon dossier acheteur');dossier.href='/mon-bien?tab=envoi';body(link).append(dossier);
    questions.classList.add('qualifier-questions');
    const qBody=body(questions), qNodes=[...qBody.children], qGrid=make('div','qualifier-question-grid');
    for(let i=2;i<qNodes.length;i+=3){const group=make('div','qualifier-question');group.append(...qNodes.slice(i,i+3));qGrid.append(group);}
    qBody.append(qGrid);
    profiles.classList.add('qualifier-profiles');
    const pBody=body(profiles), pNodes=[...pBody.children];let profile;
    pNodes.slice(1).forEach(el=>{
      if(el.textContent.startsWith('CAS N°')){
        profile=make('details','qualifier-profile');const summary=make('summary');summary.append(el);profile.append(summary);pBody.append(profile);
      } else if(profile)profile.append(el);
    });
    const mobile=matchMedia('(max-width:700px)').matches;
    const firstProfile=pBody.querySelector('.qualifier-profile');if(firstProfile)firstProfile.open=!mobile;
    agenda.classList.add('qualifier-agenda');
    const capture=make('figure','qualifier-real-capture'), img=make('img');
    img.src='/images/formation/qualification/agenda-reel-qualification.png';img.alt='Capture réelle du panneau Message de qualification de l’agenda existant.';img.loading='lazy';const picture=make('picture'),source=make('source');source.media='(max-width:700px)';source.srcset='/images/formation/qualification/agenda-reel-qualification-iphone.png';picture.append(source,img);capture.append(picture);
    body(agenda).append(capture);
    limit.classList.add('qualifier-financial-limit');action.classList.add('qualifier-action');takeaway.classList.add('qualifier-takeaway');

    // Discover every telephone dialogue from the validated lesson, never from the mockup.
    const original=[...body(first).children];
    const carousel=make('div','qualifier-comic-carousel');carousel.tabIndex=0;carousel.setAttribute('role','region');carousel.setAttribute('aria-label','Scripts téléphoniques');
    const slides=[];
    function addSlide(title,buyerNodes,sellerNodes,{originalTitle=false,repeated=false}={}) {
      const slide=make('div','qualifier-comic-slide');slide.id='qualifier-script-'+slides.length;
      if(repeated)slide.dataset.repeatedScript='true';
      const heading=originalTitle?title:make('div','qualifier-comic-title',title);
      const panels=make('div','qualifier-comic-panels');
      for(const [role,nodes] of [['buyer',buyerNodes],['seller',sellerNodes]]){
        const panel=make('div','qualifier-comic-panel'), dialogue=make('div','qualifier-comic-dialogue');
        dialogue.append(...nodes);panel.append(dialogue,portrait(role));panels.append(panel);
      }
      slide.append(heading,panels);slides.push(slide);carousel.append(slide);
    }
    addSlide(head(first),original.slice(0,2),original.slice(2,4),{originalTitle:true});
    for(const context of [immediate,price]){
      const ps=[...body(context).children];
      addSlide(context.dataset.originalTitle,ps.slice(0,2).map(x=>x.cloneNode(true)),ps.slice(2,4).map(x=>x.cloneNode(true)),{repeated:true});
    }
    const objectionNodes=[...body(objections).children];
    let start=0;
    while(start<objectionNodes.length){
      const question=objectionNodes[start];
      if(!question.querySelector('strong') || !question.textContent.startsWith('«')){start++;continue;}
      let end=start+1;
      while(end<objectionNodes.length && !(objectionNodes[end].querySelector('strong') && objectionNodes[end].textContent.startsWith('«')))end++;
      const reply=objectionNodes.slice(start+1,end);
      // The final factual warning is contextual advice, retained in its original section.
      if(reply.at(-1)?.textContent.startsWith("N'inventez jamais"))reply.pop();
      addSlide(question.textContent,[question.cloneNode(true)],reply.map(x=>x.cloneNode(true)),{repeated:true});
      start=end;
    }
    const context=make('div','qualifier-comic-context');context.append(...original.slice(4));
    body(first).append(carousel,context);first.classList.add('qualifier-calls-example');calls.classList.add('qualifier-calls-intro');
    const controls=make('div','qualifier-comic-controls'), previous=make('button','qualifier-comic-arrow','←'), next=make('button','qualifier-comic-arrow','→'), counter=make('span','qualifier-comic-counter');
    previous.type=next.type='button';previous.setAttribute('aria-label','Voir le script précédent');next.setAttribute('aria-label','Voir le script suivant');counter.setAttribute('aria-live','polite');
    controls.append(previous,counter,next);carousel.append(controls);let index=0;
    function show(value){index=Math.max(0,Math.min(slides.length-1,value));slides.forEach((slide,i)=>slide.hidden=i!==index);counter.textContent=(index+1)+' / '+slides.length;previous.disabled=index===0;next.disabled=index===slides.length-1;carousel.dataset.activeScript=String(index);}
    previous.addEventListener('click',()=>show(index-1));next.addEventListener('click',()=>show(index+1));
    carousel.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();show(index-1)}if(e.key==='ArrowRight'){e.preventDefault();show(index+1)}});
    let touchX;
    carousel.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchX=e.clientX});
    carousel.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&touchX!==undefined){const delta=e.clientX-touchX;if(Math.abs(delta)>55)show(index+(delta<0?1:-1));touchX=undefined;}});
    show(0);
    // Objections stay in their original relative order and retain their full context.
    for(const s of [platform,sms,immediate,price,objections])accordion(s,false);
    accordion(questions,!mobile);accordion(agenda,false);accordion(link,!mobile);
    if(mobile)accordion(profiles,false);

    // Fill only the real template variables. Copying remains entirely local.
    Promise.allSettled([fetch('/api/me').then(r=>r.ok?r.json():{}),fetch('/api/property').then(r=>r.ok?r.json():{})]).then(results=>{
      const seller=results[0].status==='fulfilled'?results[0].value.seller:null;
      const property=results[1].status==='fulfilled'?results[1].value.property:null;
      const url=property?.acheteur_url;
      const safeUrl=url && /^https?:\/\//.test(url)?url:null;
      lesson.querySelectorAll('.qualifier-variable').forEach(span=>{
        if(span.dataset.template==='[lien du dossier]'&&safeUrl)span.textContent=safeUrl;
        if(span.dataset.template==='[Votre prénom]'&&seller?.first_name)span.textContent=seller.first_name;
      });
    });
  }
  compose();
  new MutationObserver(compose).observe(container,{childList:true,subtree:true});
})();
