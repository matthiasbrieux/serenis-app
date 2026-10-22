/* Local home presentation. Existing lessons, tools, data and progress keys stay intact. */
(() => {
  'use strict';
  const models=window.VPMFormationHomeMessages;
  if(!models||models.length!==15)return;
  const main=document.querySelector('main'),originalHero=main.querySelector('.form-hero'),grid=document.getElementById('chaptersGrid');
  if(!originalHero||!grid)return;
  const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const paths={
    send:'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
    copy:'<rect x="8" y="3" width="12" height="15" rx="2"/><path d="M5 7H4v14h12v-1"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    expand:'<path d="M14 3h7v7m0-7-8 8M10 21H3v-7m0 7 8-8"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h1m3 0h1m3 0h1"/>',
    heart:'<path d="M20 4a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 4 12 8 16 4-4 13-11 8-16Z"/>',
    chat:'<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z"/>',
    file:'<path d="M14 2H5v20h14V7ZM14 2v5h5M8 12h8m-8 4h8"/>'
  };
  function icon(kind){const el=make('span','home-icon');el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[kind]+'</svg>';return el;}
  function button(label,cls,action){const b=make('button',cls,label);b.type='button';if(action)b.addEventListener('click',action);return b;}
  let selected=Number.isInteger(activeModule)?activeModule:0;
  const shell=make('section','formation-home-shell');shell.id='formationHome';shell.setAttribute('aria-label','Accueil de ma formation');
  originalHero.before(shell);originalHero.classList.add('home-original-intro');
  const top=make('div','home-top');top.append(originalHero,document.querySelector('.lib-progress-wrap'));shell.append(top);
  const hero=make('section','home-chapter-hero');hero.setAttribute('aria-labelledby','homeChapterTitle');
  const photo=make('img','home-chapter-photo');photo.alt='';photo.setAttribute('aria-hidden','true');
  const copy=make('div','home-chapter-copy'),kicker=make('span','home-chapter-kicker'),title=make('h2','home-chapter-title');title.id='homeChapterTitle';
  const description=make('p','home-chapter-description'),actions=make('div','home-chapter-actions');
  const open=button('Ouvrir le chapitre','home-open-chapter',()=>openModule(selected));open.append(icon('chevron'));
  const progress=make('div','home-chapter-progress'),percent=make('span','home-chapter-percent'),bar=make('progress'),count=make('span','home-chapter-count');bar.setAttribute('aria-label','Progression du chapitre sélectionné');
  progress.append(percent,bar,count);actions.append(open,progress);copy.append(kicker,title,description,actions);
  const syllabus=make('aside','home-chapter-syllabus'),syllabusTitle=make('h3','home-syllabus-title'),lessons=make('ul','home-syllabus-list');syllabus.append(syllabusTitle,lessons);
  const intro=make('details','home-chapter-introduction'),introSummary=make('summary',null,'Explication'),introBody=make('div');intro.append(introSummary,introBody);
  hero.append(photo,copy,syllabus,intro);shell.append(hero);
  shell.append(grid);grid.classList.add('home-carousel');
  const track=make('div','home-chapter-track');track.setAttribute('role','group');track.setAttribute('aria-label','Les six chapitres de la formation');track.tabIndex=0;
  const left=button('','home-carousel-arrow home-carousel-prev',()=>manualScroll(-1)),right=button('','home-carousel-arrow home-carousel-next',()=>manualScroll(1));
  left.setAttribute('aria-label','Chapitres précédents');right.setAttribute('aria-label','Chapitres suivants');left.append(icon('chevron'));right.append(icon('chevron'));
  const phases=make('div','home-phase-labels');phases.append(make('span',null,'Préparer votre vente'),make('span',null,'Avancer vers la signature'));
  grid.replaceChildren(phases,left,track,right);
  const cards=MODULES.map((mod,mi)=>{
    const card=button('','home-chapter-card',()=>select(mi));card.dataset.homeChapter=mi;card.setAttribute('aria-label',`Sélectionner le chapitre ${mi+1} : ${mod.title}`);
    const image=make('img','home-card-photo');image.src=mi===0?'/images/formation/chapitres/navigation-1.jpg':CH_PHOTOS[mi];image.alt='';
    const badges=make('div','home-card-badges'),symbol=make('span','home-card-symbol'),number=make('span','home-card-number',String(mi+1));symbol.setAttribute('aria-hidden','true');symbol.innerHTML=CH_ICONS[mi];badges.append(symbol,number);
    const name=make('strong','home-card-title',mod.title),n=make('span','home-card-count'),p=make('progress','home-card-progress');p.max=mod.steps.length;p.setAttribute('aria-label',`Progression du chapitre ${mi+1}`);
    card.append(image,badges,name,n,p);track.append(card);return {card,n,p};
  });
  function completion(mi){const mod=MODULES[mi];return mod.steps.filter((_,si)=>doneSteps[formationProgressKey(mi,si)]===true).length;}
  function refreshProgress(){
    cards.forEach(({n,p},mi)=>{const done=completion(mi),total=MODULES[mi].steps.length;n.textContent=`${total} leçons · ${Math.round(done/total*100)} %`;p.value=done;});
    const total=MODULES[selected].steps.length,done=completion(selected);percent.textContent=`${Math.round(done/total*100)} % complété`;bar.max=total;bar.value=done;count.textContent=`${done} / ${total} leçons`;
  }
  function select(mi){
    selected=mi;const mod=MODULES[mi];kicker.textContent=`Chapitre ${mi+1}`;
    const ending=['mon bien','ma vente','et mes photos','mes visites','visites','et je conclus'][mi],split=mod.title.indexOf(ending);
    if(split>0)title.replaceChildren(make('span',null,mod.title.slice(0,split)),make('em',null,mod.title.slice(split)));else title.textContent=mod.title;
    description.textContent=mod.subtitle;
    // Use the actual chapter images already present in the application.
    photo.src=CH_PHOTOS[mi];
    syllabusTitle.textContent='Leçons du chapitre';lessons.replaceChildren(...mod.steps.map(step=>{const li=make('li');li.append(icon('check'),make('span',null,step.title.replace(/^◆\s*/,'')));return li;}));
    introBody.innerHTML=mod.intro||'';intro.hidden=!mod.intro;intro.open=false;
    cards.forEach(({card},i)=>{card.classList.toggle('is-selected',i===mi);card.setAttribute('aria-pressed',String(i===mi));});
    hero.dataset.chapter=String(mi+1);refreshProgress();
  }
  const oldCards=renderChapterCards;renderChapterCards=function(){if(document.getElementById('formationHome'))refreshProgress();else oldCards();};
  const oldProgress=updateProgress;updateProgress=function(){oldProgress();refreshProgress();};
  const oldView=applyFormationView;applyFormationView=function(){oldView();setFormationVisibility(shell,formationView.level==='home');if(formationView.level!=='home'&&modal.open)modal.close();};
  const media=matchMedia('(min-width:901px) and (hover:hover) and (pointer:fine)'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let hover=false,focus=false,pauseUntil=0,last=0,position=0,direction=1,frame;
  function manualScroll(direction){pauseUntil=performance.now()+7000;track.scrollBy({left:direction*track.clientWidth*.7,behavior:motion.matches?'instant':'smooth'});}
  track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();manualScroll(e.key==='ArrowRight'?1:-1);}});
  grid.addEventListener('mouseenter',()=>hover=true);grid.addEventListener('mouseleave',()=>hover=false);
  grid.addEventListener('focusin',()=>focus=true);grid.addEventListener('focusout',()=>queueMicrotask(()=>focus=grid.contains(document.activeElement)));
  grid.addEventListener('pointerdown',()=>pauseUntil=performance.now()+7000);grid.addEventListener('wheel',()=>pauseUntil=performance.now()+7000,{passive:true});
  function tick(now){
    const elapsed=Math.min(50,now-(last||now));last=now;
    const max=track.scrollWidth-track.clientWidth;
    const running=media.matches&&!motion.matches&&!hover&&!focus&&!document.hidden&&!modal.open&&formationView.level==='home'&&now>pauseUntil&&max>1;
    grid.dataset.autoRunning=String(running);
    if(running){position=Math.max(0,Math.min(max,position+direction*elapsed*.018));track.scrollLeft=position;if(position>=max||position<=0){direction*=-1;pauseUntil=now+2000;}}
    else position=track.scrollLeft;
    frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));window.addEventListener('pageshow',event=>{if(event.persisted){last=0;frame=requestAnimationFrame(tick);}});
  select(selected);

  const library=make('section','home-message-library');library.setAttribute('aria-labelledby','homeMessagesTitle');
  const heading=make('header','home-library-heading'),headingCopy=make('div'),libraryTitle=make('h2',null,'Vos messages prêts à l’envoi');libraryTitle.id='homeMessagesTitle';
  headingCopy.append(make('span','home-library-kicker','BOÎTE À OUTILS'),libraryTitle,make('p',null,document.querySelector('#formationMails .section-sub').textContent));heading.append(icon('send'),headingCopy);
  const filters=make('div','home-message-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Filtrer les messages par situation');
  const categories=[['all','Tous les messages'],['contact','Premier contact'],['visites','Organisation des visites'],['apres','Après la visite'],['offres','Offres et négociation'],['notaire','Notaire et suivi']];
  const messageGrid=make('div','home-message-grid');messageGrid.id='homeMessageGrid';
  const filterCount=make('p','home-message-count');filterCount.setAttribute('role','status');filterCount.setAttribute('aria-live','polite');
  const filterButtons=categories.map(([key,label])=>{const b=button(label,'home-message-filter',()=>filter(key));b.dataset.messageFilter=key;b.setAttribute('aria-controls','homeMessageGrid');filters.append(b);return b;});
  const typeName=model=>model.type==='sms'?'SMS':model.type==='email'?'E-mail':'Message écrit';
  const typeIcon=model=>model.type==='email'?'mail':model.type==='sms'?'chat':'file';
  const drafts=new Map(); // In-memory only; authored models and customer data are never written.
  const modal=make('dialog','home-message-dialog');modal.setAttribute('aria-labelledby','homeMessageDialogTitle');
  const modalHead=make('header','home-message-dialog-toolbar'),brand=make('img','home-message-dialog-logo');brand.src='/images/email-logo.png';brand.alt='Vendu Par Moi';brand.width=1200;brand.height=347;
  const back=button('← Retour aux modèles','home-message-back',()=>modal.close());
  const close=button('','home-dialog-close',()=>modal.close());close.setAttribute('aria-label','Fermer le message');close.autofocus=true;close.append(icon('close'));modalHead.append(brand,back,close);
  const modalTitle=make('h2');modalTitle.id='homeMessageDialogTitle';
  const modalHeading=make('div','home-message-dialog-heading'),modalMeta=make('div','home-message-dialog-meta'),modalOrigin=make('p','home-message-origin');modalHeading.append(modalMeta,modalTitle,modalOrigin);
  const modalBody=make('div','home-message-dialog-body');modal.append(modalHead,modalHeading,modalBody);main.append(modal);
  let returnFocus;
  modal.addEventListener('close',()=>{
    document.body.classList.remove('home-message-dialog-open');
    if(formationView.level==='home'&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  });
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
  function messageText(value){
    const pre=make('pre','home-message-text');value.split(/(\[[^\]\n]+\])/).forEach(part=>{if(part.startsWith('[')&&part.endsWith(']'))pre.append(make('span','home-message-field',part));else pre.append(document.createTextNode(part));});return pre;
  }
  function letterParts(value){
    const subject=value.match(/^Objet[ \t]*:[^\r\n]*/);
    return subject?{subject:subject[0],body:value.slice(subject[0].length)}:{subject:'',body:value};
  }
  function letter(model,value,inPhone=false){
    const mail=make('div','home-message-letter'),bar=make('div','home-message-letter-bar');bar.append(icon(typeIcon(model)),make('span',null,typeName(model)));
    const parts=letterParts(value);mail.append(bar);
    if(parts.subject)mail.append(make('p','home-message-email-subject',parts.subject));
    const body=make('div',inPhone?'home-message-letter-body':'home-message-viewport');body.append(messageText(parts.body));mail.append(body);return mail;
  }
  function preview(model,value=model.text,inline=false){
    const holder=make('div','home-message-preview '+(inline?'home-message-inline-preview':'is-full'));
    if(model.type==='sms'||inline){
      const device=make('div','home-message-phone'),notch=make('div','home-message-notch');notch.setAttribute('aria-hidden','true');device.dataset.channel=model.type;
      const status=make('div','home-phone-status');status.setAttribute('aria-hidden','true');status.append(make('span',null,'9:41'),make('span','home-phone-indicators','▮▮▮  ▰'));
      const recipient=make('div','home-phone-recipient',model.type==='sms'?'Message':typeName(model));recipient.setAttribute('aria-hidden','true');
      const viewport=make('div','home-message-viewport');
      if(inline){viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',typeName(model)+' — '+model.title);}
      if(model.type==='sms'){
        const bubble=make('div','home-message-bubble');bubble.append(messageText(value));viewport.append(bubble);
      }else viewport.append(letter(model,value,true));
      const composer=make('div','home-phone-composer',model.type==='sms'?'Message':'Répondre');composer.setAttribute('aria-hidden','true');
      device.append(notch,status,recipient,viewport,composer);holder.append(device);
    }else holder.append(letter(model,value));
    return holder;
  }
  function copyControls(model,getText=()=>model.text){
    const wrap=make('div','home-message-copy-controls'),copy=button('','home-message-copy'),status=make('span','home-message-copy-status');copy.append(icon('copy'),make('span',null,'Copier le message'));status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    copy.addEventListener('click',async()=>{
      copy.disabled=true;status.textContent='';
      try{if(!navigator.clipboard?.writeText)throw Error('Presse-papiers indisponible');await navigator.clipboard.writeText(getText());status.textContent='Message copié';}
      catch{status.textContent='Copie impossible. Le texte reste disponible à consulter.';}
      finally{copy.disabled=false;}
    });wrap.append(copy,status);return wrap;
  }
  function notes(model){
    const wrap=make('div','home-message-notes');
    if(model.id==='offre-contre')wrap.append(make('p','home-message-adaptation','Adaptez les montants de cet exemple avant envoi.'));
    if(model.notes.length){const details=make('details'),summary=make('summary',null,'Conseils de la leçon');details.append(summary,...model.notes.map(t=>make('p',null,t)));wrap.append(details);}return wrap;
  }
  function sourceControl(model){
    return button('Voir la leçon d’origine','home-message-source',()=>{
      if(modal.open)modal.close();
      selectFormationLesson(model.mi,model.si);
      if(model.fiche)openFiche(model.fiche);
    });
  }
  function consult(model,event){
    returnFocus=event.currentTarget;modalTitle.textContent=model.title;modalOrigin.textContent=model.origin;modal.dataset.messageId=model.id;modal.dataset.messageType=model.type;
    const number=String(ordered.findIndex(item=>item.id===model.id)+1).padStart(2,'0');
    modalMeta.replaceChildren(make('span','home-message-number',number),make('span','home-message-type',typeName(model)));
    const tokens=[...new Set(model.text.match(/\[[^\]\n]+\]/g)||[])];
    if(!drafts.has(model.id))drafts.set(model.id,new Map());
    const values=drafts.get(model.id);
    // One replacement pass prevents user values containing [tokens] from being substituted again.
    const personalized=()=>model.text.replace(/\[[^\]\n]+\]/g,token=>values.get(token)?.trim()?values.get(token):token);
    const layout=make('div','home-message-detail-layout'),previewPanel=make('div','home-message-device-panel');previewPanel.append(preview(model,personalized()));
    const fullPanel=make('section','home-message-complete'),fullHeading=make('h3',null,'Message complet'),fullText=messageText(personalized());fullPanel.append(fullHeading,fullText,copyControls(model,personalized));
    const editor=make('section','home-message-personalization');editor.setAttribute('aria-labelledby','homePersonalizationTitle');const editorTitle=make('h3',null,'Personnaliser les champs');editorTitle.id='homePersonalizationTitle';editor.append(editorTitle);
    const form=make('form','home-message-fields');form.addEventListener('submit',e=>e.preventDefault());
    function refresh(){
      const current=previewPanel.querySelector('.home-message-viewport'),position=current?.scrollTop||0;
      previewPanel.replaceChildren(preview(model,personalized()));previewPanel.querySelector('.home-message-viewport').scrollTop=position;
      fullText.replaceChildren(...messageText(personalized()).childNodes);
      modalBody.querySelectorAll('.home-message-copy-status').forEach(status=>status.textContent='');
    }
    const inputs=[];
    tokens.forEach((token,index)=>{
      const field=make('div','home-message-input-field'),label=make('label',null,token.slice(1,-1)),input=make('input');
      input.id='homeMessageField-'+index;input.name='message-field-'+index;input.type='text';input.placeholder=token;input.value=values.get(token)||'';input.autocomplete='off';label.htmlFor=input.id;
      input.addEventListener('input',()=>{values.set(token,input.value);refresh();});field.append(label,input);form.append(field);inputs.push(input);
    });
    if(tokens.length)editor.append(make('p','home-message-editor-hint','Vos modifications apparaissent dans l’aperçu et dans la copie. Le modèle d’origine est conservé.'),form);
    else editor.append(make('p','home-message-editor-hint','Ce message ne contient aucun champ à personnaliser.'));
    const reset=button('Réinitialiser les champs','home-message-reset',()=>{values.clear();inputs.forEach(input=>input.value='');refresh();});
    if(tokens.length)editor.append(reset);
    editor.append(copyControls(model,personalized),notes(model),sourceControl(model));
    layout.append(previewPanel);
    if(model.type==='sms')layout.append(fullPanel);
    layout.append(editor);modalBody.replaceChildren(layout);modal.showModal();modal.scrollTop=0;document.body.classList.add('home-message-dialog-open');
  }
  // Same catalogue and order. Full messages are readable directly in scrollable devices.
  const first=['qualification','rappel','remerciement','offre-accepter'];
  const ordered=[...first.map(id=>models.find(m=>m.id===id)).filter(Boolean),...models.filter(m=>!first.includes(m.id))];
  const messageCards=ordered.map((model,index)=>{
    const card=make('article','home-message-card');card.dataset.messageId=model.id;card.dataset.category=model.category;
    const h=make('header','home-message-card-heading'),meta=make('div','home-message-card-meta'),number=make('span','home-message-number',String(index+1).padStart(2,'0')),type=make('span','home-message-type');type.append(icon(typeIcon(model)),make('span',null,typeName(model)));meta.append(number,type);
    const name=make('h3'),nameButton=button(model.title,'home-message-title-button',e=>consult(model,e)),origin=make('p','home-message-origin',model.origin);nameButton.setAttribute('aria-haspopup','dialog');name.append(nameButton);h.append(meta,name,origin);
    const inlinePreview=preview(model,model.text,true);
    const expand=button('','home-message-expand',e=>consult(model,e));expand.setAttribute('aria-label','Lire le message intégral : '+model.title);expand.setAttribute('aria-haspopup','dialog');expand.append(make('span',null,'Voir le message complet'),icon('chevron'));
    card.append(h,inlinePreview,copyControls(model),expand,sourceControl(model));messageGrid.append(card);return card;
  });
  // Supply the three missing source-lesson copy controls, without changing a source node.
  const offerSection=[...document.querySelectorAll('#step-5-1 .sst')].find(s=>s.dataset.tailTitle==='7 — COMMENT RÉPONDRE À UNE OFFRE ?');
  if(offerSection){
    for(const model of models.filter(m=>m.id.startsWith('offre-'))){
      const heading=[...offerSection.querySelectorAll('h4')].find(h=>h.textContent===model.title);
      if(!heading)continue;
      for(let node=heading.nextElementSibling;node&&node.tagName!=='H4';node=node.nextElementSibling){
        if(node.tagName==='P'&&node.textContent.includes('[Votre prénom]')){
          const controls=copyControls(model);controls.className='home-offer-source-copy';controls.dataset.presentationControl='true';controls.dataset.sourceMessage=model.id;
          const sourceButton=controls.querySelector('button');sourceButton.classList.add('tail-copy');sourceButton.replaceChildren(document.createTextNode('Copier le message'));controls.querySelector('[role="status"]').classList.add('tail-copy-status');
          node.after(controls);break;
        }
      }
    }
  }
  function filter(key){filterButtons.forEach(b=>{const active=b.dataset.messageFilter===key;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});messageCards.forEach(card=>card.hidden=key!=='all'&&card.dataset.category!==key);const total=messageCards.filter(card=>!card.hidden).length;filterCount.textContent=`${total} modèle${total>1?'s':''}`;}
  library.append(heading,filters,filterCount,messageGrid);shell.append(library);
  const documentLibrary=make('section','home-document-library');documentLibrary.setAttribute('aria-labelledby','homeDocumentsTitle');
  const documentTitle=make('h2',null,"Vos documents prêts à l'emploi");documentTitle.id='homeDocumentsTitle';
  documentLibrary.append(documentTitle,make('p',null,'Retrouvez vos documents pratiques à consulter, imprimer ou enregistrer en PDF pour chaque étape de votre vente.'));
  const documentGrid=make('div','home-document-grid');
  for(const [slug,title,description,kind] of [
    ['etat-civil',"Renseignements d'état civil",'Préparez votre dossier pour le notaire.','file'],
    ['etat-des-lieux',"Fiche d'état des lieux",'Préparez votre dernière visite et la remise des clés.','check']
  ]){
    const card=make('article','home-document-card'),symbol=icon(kind);symbol.className='home-document-icon';
    // A checklist symbol for the second practical document.
    if(kind==='check')symbol.querySelector('svg').innerHTML='<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m6 8 2 2 3-4m2 2h5M6 15h3m4 0h5"/>';
    const link=make('a',null,'Consulter la fiche');link.href='/ma-formation/documents/'+slug;
    card.append(symbol,make('h3',null,title),make('p',null,description),link);documentGrid.append(card);
  }
  documentLibrary.append(documentGrid);shell.append(documentLibrary);filter('all');applyFormationView();
})();
