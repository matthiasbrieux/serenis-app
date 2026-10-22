/* Presentation only. Original lesson nodes, text and navigation remain intact. */
(() => {
  'use strict';
  const container = document.getElementById('modContainer');
  if (!container) return;
  const targets = ['step-3-2','step-4-0','step-4-1','step-5-0','step-5-1','step-5-2','step-5-3'];
  const make = (tag, name) => { const el=document.createElement(tag); if(name)el.className=name; return el; };
  const paths = {
    home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    sofa:'<path d="M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M5 17v3m14-3v3M3 11v6h18v-6M3 11h3v3h12v-3h3"/>',
    lamp:'<path d="m8 3-3 10h14L16 3ZM12 13v7m-5 1h10"/>',
    file:'<path d="M14 2H5v20h14V7ZM14 2v5h5M8 12h8m-8 4h8"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h1m3 0h1m3 0h1m-9 3h1m3 0h1"/>',
    chat:'<path d="M21 14a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3ZM7 7h10m-10 5h7"/>',
    route:'<path d="M5 17a3 3 0 1 0 0 .1Zm14-12a3 3 0 1 0 0 .1ZM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    hourglass:'<path d="M6 2h12M6 22h12M7 2v4c0 3 5 6 5 6s5-3 5-6V2M7 22v-4c0-3 5-6 5-6s5 3 5 6v4"/>',
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
    handshake:'<path d="m2 9 4-4 5 2 3-2 8 5-3 7-5 4-9-6ZM8 10l4-3m-5 8 5 4m-3-7 6 5m-3-7 6 5"/>',
    table:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M10 3v18M3 15h18"/>',
    bulb:'<path d="M9 18v-2a7 7 0 1 1 6 0v2ZM9 21h6m-3-20v1M1 10h2m18 0h2M4 3l2 2m12 0 2-2"/>',
    book:'<path d="M12 5C8 2 4 3 2 4v16c3-1 6-1 10 1 4-2 7-2 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
    money:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 8h1m12 8h1"/>',
    key:'<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-1 5 3-3"/>',
    question:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3m0 3h.01"/>',
    check:'<path d="m4 12 5 5L20 5"/><rect x="2" y="2" width="20" height="20" rx="4"/>',
    tools:'<path d="m14.7 6.3 3 3M3 21l9.6-9.6M14 4a5 5 0 0 0 6 6l-4 4-6-6 4-4ZM4 14l6 6-3 3-6-6 3-3Z"/>',
    search:'<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.2 16.2 5 5"/>',
    questionBubble:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1 1-1.7 1.2-1.7 2.7m0 3h.01"/>',
    reply:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    arrow:'<path d="M5 12h13m-5-5 5 5-5 5"/>'
  };
  function icon(kind,cls='tail-icon') {
    const box=make('span',cls);box.setAttribute('aria-hidden','true');
    box.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">'+(paths[kind]||paths.file)+'</svg>';return box;
  }
  function kind(title){
    if(/TABLEAU/.test(title))return 'table';if(/RETENIR/.test(title))return 'bulb';if(/FIN DU CHAPITRE/.test(title))return 'book';
    if(/PIÈCES/.test(title))return 'sofa';if(/AMBIANCE/.test(title))return 'lamp';if(/EXTÉRIEURS|ATOUTS/.test(title))return 'home';
    if(/ACCUEILLEZ/.test(title))return 'handshake';if(/PARCOURS/.test(title))return 'route';if(/DÉCOUVRIR/.test(title))return 'eye';if(/SILENCES/.test(title))return 'hourglass';
    if(/DISCOURS|POSTURE/.test(title))return 'people';if(/CLÉS/.test(title))return 'key';if(/PRIX|FINANC|OFFRE|COMPARER/.test(title))return 'money';
    if(/MESSAGE|RAPPEL|SUIVI|CONTACT|RÉPONDRE|NÉGOCIER/.test(title))return 'chat';if(/DATE|DÉLAI|RENDEZ|AGENDA|JOUR/.test(title))return 'calendar';
    if(/CHECKLIST/.test(title))return 'check';if(/«/.test(title))return 'question';return 'file';
  }
  function disclosure(section,heading,content,open){
    const details=make('details','tail-disclosure'),summary=make('summary','tail-section-heading');details.open=open;
    summary.append(...heading.childNodes);heading.replaceWith(details);details.append(summary,content);
    const chevron=make('span','tail-chevron');chevron.setAttribute('aria-hidden','true');chevron.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg>';summary.append(chevron);
    section.classList.add('tail-collapsible');
  }
  function phone(section,content,title){
    let quote=content.querySelector('blockquote');
    if(!quote){
      const paragraphs=[...content.children];const last=paragraphs.findIndex(p=>p.textContent.includes('[Votre prénom]'));
      if(last<0)return;
      quote=make('div','tail-message');paragraphs[0].before(quote);quote.append(...paragraphs.slice(0,last+1));
    }
    quote.classList.add('tail-message');
    const preview=make('div','tail-message-preview'),device=make('div','tail-phone'),notch=make('div','tail-notch');notch.setAttribute('aria-hidden','true');
    quote.before(preview);device.append(notch,quote);preview.append(device);
    const button=make('button','tail-copy');button.type='button';button.textContent='Copier le message';button.dataset.presentationControl='true';
    const status=make('span','tail-copy-status');status.setAttribute('role','status');status.dataset.presentationControl='true';
    button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(quote.innerText.trim());status.textContent='Message copié';}catch{status.textContent='Copie impossible';}setTimeout(()=>status.textContent='',2000);});
    preview.append(button,status);section.classList.add('tail-message-section');
    if(title.includes('J+'))section.classList.add('tail-followup');
  }
  function comic(content){
    content.querySelectorAll('.nc-dial').forEach(scene=>{
      scene.classList.add('tail-comic','tail-negotiation-comic');
      const nodes=[...scene.children];
      for(let i=0;i<nodes.length;i+=2){const panel=make('div','tail-comic-panel');panel.append(icon('people','tail-character'),...nodes.slice(i,i+2));scene.append(panel);}
    });
    const ps=[...content.querySelectorAll(':scope > p')];
    for(let i=0;i<ps.length-1;i++){
      if(!/^L'acheteur\s*:/.test(ps[i].textContent)||!/^Vous\s*:/.test(ps[i+1].textContent))continue;
      const dialogueSeparator=ps[i].nextSibling?.nodeType===Node.TEXT_NODE?ps[i].nextSibling:null;
      const scene=make('div','tail-comic');ps[i].before(scene);
      for(const [panelIndex,[p,role]]of [[ps[i],'Acheteur'],[ps[i+1],'Vendeur']].entries()){
        const panel=make('div','tail-comic-panel');panel.setAttribute('aria-label',role);
        panel.append(icon('people','tail-character'),p);scene.append(panel);
        if(panelIndex===0&&dialogueSeparator)scene.append(dialogueSeparator);
      }i++;
    }
  }
  function composeFaqTable(section,titleEl,content){
    if(!section.closest('#step-4-1')||titleEl.textContent.trim()!=='TABLEAU — LES QUESTIONS FRÉQUENTES')return;
    section.classList.add('faq-table-section');
    const heading=section.querySelector(':scope > .tail-section-heading');
    if(heading){
      const marker=titleEl.querySelector('.sst-title')||titleEl;
      marker.replaceChildren();
      const lead=make('span','faq-title-lead');lead.textContent='TABLEAU —';
      const name=make('span','faq-title-name');name.textContent='LES QUESTIONS FRÉQUENTES';
      marker.append(lead,document.createTextNode(' '),name);
      const iconNode=heading.querySelector('.tail-icon');
      if(iconNode){iconNode.classList.add('faq-title-icon');iconNode.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">'+paths.questionBubble+'</svg>';}
      const subtitle=make('p','faq-table-subtitle');subtitle.textContent='Voici des exemples de questions que les acheteurs peuvent vous poser, avec les réponses recommandées.';heading.after(subtitle);
    }
    const table=content.querySelector('table');if(!table)return;table.classList.add('faq-table');
    const headerIcons=['questionBubble','reply'];
    table.querySelectorAll('thead th').forEach((th,index)=>{const badge=icon(headerIcons[index]||'reply','faq-column-icon');th.prepend(badge);});
    const rowIcons=['home','tools','calendar','file','search'];
    table.querySelectorAll('tbody tr').forEach((row,index)=>{
      const question=row.querySelector('td:first-child .lesson-cell-content');
      if(question){const svg=question.querySelector('.lesson-pictogram');if(svg){svg.innerHTML=paths[rowIcons[index]||'question'];svg.classList.add('faq-question-icon');}}
      const answer=row.querySelector('td:nth-child(2)');if(answer)answer.prepend(icon('arrow','faq-answer-arrow'));
      row.classList.add('faq-row');
    });
  }
  function addEditorialPhoto(section, content, imageName, altText){
    section.classList.add('tail-end-feature');
    const heading=section.querySelector(':scope > .tail-section-heading');
    if(!heading||!content||section.querySelector(':scope > .tail-end-feature-grid'))return;
    const grid=make('div','tail-end-feature-grid');
    const image=make('img','tail-end-feature-photo');
    image.src=`/images/formation/chapitre5/${imageName}`;
    image.alt=altText;
    image.loading='lazy';
    image.decoding='async';
    image.width=1448;image.height=1086;
    heading.after(grid);grid.append(content,image);
  }
  function composeChapterFiveEnding(section,title,content){
    if(title.startsWith('11 —')){
      addEditorialPhoto(section,content,'section-11-carnet.jpg','Carnet, stylo et documents immobiliers sur un bureau.');
      const answer=[...content.querySelectorAll(':scope > p')].find(p=>p.textContent.includes('C\'est une bonne question.'));
      if(answer){answer.classList.add('tail-type-answer');answer.prepend(icon('chat','tail-type-answer-icon'));}
      const last=content.querySelector(':scope > p:last-child');if(last)last.classList.add('tail-end-emphasis');
    }else if(title.startsWith('12 —')){
      addEditorialPhoto(section,content,'section-12-salon.jpg','Salon chaleureux d’un appartement.');
      const conversation=content.querySelector('.tail-comic');
      if(conversation&&conversation.children.length===2){
        conversation.classList.add('tail-dialogue-exchange');
        const arrow=make('span','tail-dialogue-arrow');arrow.setAttribute('aria-hidden','true');
        arrow.innerHTML='<svg viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h24m-8-8 8 8-8 8"/></svg>';
        conversation.children[0].after(arrow);
      }
    }else if(title.startsWith('13 —')){
      addEditorialPhoto(section,content,'section-13-checklist.jpg','Carnet de visite et stylo posés près de documents immobiliers.');
      const list=content.querySelector(':scope > ul');if(list)list.classList.add('tail-visit-checklist');
    }else if(title==='À RETENIR'){
      const list=content.querySelector(':scope > ul');if(list)list.classList.add('tail-takeaway-points');
    }else if(title==='FIN DU CHAPITRE 5'){
      const paragraphs=[...content.querySelectorAll(':scope > p')];
      const next=paragraphs.find(p=>p.textContent.startsWith('La prochaine étape :'));
      if(next)next.classList.add('tail-next-step');
    }
  }
  function compose(){
    const mobile=matchMedia('(max-width:700px)').matches;
    for(const id of targets){
      const lesson=document.getElementById(id);if(!lesson||lesson.dataset.tailComposed)continue;
      lesson.dataset.tailComposed='true';lesson.classList.add('tail-lesson');
      lesson.querySelector('.lesson-masthead').append(icon(id==='step-3-2'?'check':id==='step-4-0'?'home':id==='step-4-1'?'question':id==='step-5-0'?'money':id==='step-5-1'?'chat':id==='step-5-2'?'file':'key','tail-hero-icon'));
      for(const section of lesson.querySelectorAll('.step-body > .sst')){
        const titleEl=section.querySelector('.sst-title'),content=section.querySelector('.sst-text');if(!titleEl||!content)continue;
        const title=titleEl.textContent.trim();section.dataset.tailTitle=title;
        const oldHeading=titleEl.closest('.vpm-badge-heading')||titleEl;
        // Existing collapsible inline handlers are presentation only; use native details.
        if(titleEl.hasAttribute('onclick'))['onclick','role','tabindex','aria-expanded'].forEach(attr=>titleEl.removeAttribute(attr));
        titleEl.querySelector('.sst-chev')?.remove();content.style.removeProperty('display');
        const heading=make('div','tail-section-heading');oldHeading.before(heading);heading.append(icon(kind(title)),oldHeading);
        if(/EXPLICATION/i.test(title)){section.classList.add('tail-intro');continue;}
        if(/RETENIR/.test(title))section.classList.add('tail-takeaway');
        if(/FIN DU CHAPITRE/.test(title))section.classList.add('tail-conclusion');
        if(/DATE N°/.test(title))section.classList.add('tail-milestone');
        if(/CAS N°/.test(title))section.classList.add('tail-case');
        const message=/EXEMPLE DE RAPPEL|MESSAGE TYPE|EXEMPLE DE SUIVI/.test(title);
        if(message)phone(section,content,title);
        comic(content);
        const tables=content.querySelectorAll('table');
        tables.forEach(table=>{table.classList.add('tail-table');const headers=[...table.querySelectorAll('thead th')].map(x=>x.textContent);table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,i)=>cell.dataset.columnLabel=headers[i]||''));section.classList.add('tail-table-section');});
        composeFaqTable(section,titleEl,content);
        if(id==='step-4-1')composeChapterFiveEnding(section,title,content);
        content.querySelectorAll(':scope > p').forEach(p=>{if(/^(Attention|Important|Notre conseil)/.test(p.textContent))p.classList.add('tail-note');});
        const question=id==='step-4-1'&&/^\d+ — «/.test(title);
        const finance=(id==='step-5-0'||id==='step-5-1')&&(/CAS N°|^4 —|^7 —|^9 —/.test(title));
        const notary=id==='step-5-2'&&/^([2-4]|[7-9]|10|11) —/.test(title);
        const final=id==='step-5-3'&&/^\d+ —/.test(title)&&!/^7 —/.test(title);
        const faqTable=id==='step-4-1'&&/^TABLEAU — LES QUESTIONS FRÉQUENTES$/.test(title);
        const chapterFiveEnd=id==='step-4-1'&&/^(11 —|12 —|13 —|À RETENIR|FIN DU CHAPITRE)/.test(title);
        const offerVisualSection=id==='step-5-0'&&(/^(6 — LES CINQ POINTS À EXAMINER|TABLEAU — COMPRENDRE L'AVANCEMENT D'UNE VENTE EN CASCADE)/.test(title));
        const phoneCollapse=mobile&&!faqTable&&!message&&!chapterFiveEnd&&!offerVisualSection&&!/EXPLICATION|RETENIR|FIN DU CHAPITRE|DATE N°/.test(title);
        if(question||finance||notary||final||phoneCollapse)disclosure(section,heading,content,false);
        else if((id==='step-3-2'||id==='step-4-0')&&!/RETENIR|FIN DU CHAPITRE/.test(title))disclosure(section,heading,content,true);
      }
      // In lesson 5.2, place the existing FAQ table directly after the introduction,
      // whose last sentence is “Votre objectif est donc simple…”. Keep the original
      // section and table markup intact; this only changes its position in the DOM.
      if(id==='step-4-1'){
        const intro=lesson.querySelector('.step-body > .sst.tail-intro');
        const faq=[...lesson.querySelectorAll('.step-body > .sst')]
          .find(section=>section.dataset.tailTitle==='TABLEAU — LES QUESTIONS FRÉQUENTES');
        if(intro&&faq)intro.after(faq);
      }
    }
  }
  compose();new MutationObserver(compose).observe(container,{childList:true,subtree:true});
})();
