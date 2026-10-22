'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const open=require('./fixtures/formation-messages-page.cjs');
const hashes=require('./fixtures/formation-message-text-hashes.json');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const card=(t,id)=>t.d.querySelector('.home-message-card[data-message-id="'+id+'"]');
const select=(t,category)=>t.d.querySelector('[data-message-filter="'+category+'"]').click();
const show=(t,model)=>{select(t,model.category);card(t,model.id).querySelector('.home-message-expand').click();return t.d.querySelector('.home-message-dialog');};
function completeText(dialog,model){
 if(model.type==='sms')return dialog.querySelector('.home-message-phone .home-message-text').textContent;
 const letter=dialog.querySelector('.home-message-letter');return (letter.querySelector('.home-message-email-subject')?.textContent||'')+letter.querySelector('.home-message-text').textContent;
}
function inlineText(article,model){
 const phone=article.querySelector('.home-message-inline-preview .home-message-phone');
 if(model.type==='sms')return phone.querySelector('.home-message-bubble .home-message-text').textContent;
 return (phone.querySelector('.home-message-email-subject')?.textContent||'')+phone.querySelector('.home-message-letter-body .home-message-text').textContent;
}
test('15 authored messages remain byte-for-byte identical, with six existing filters and no search',()=>{
 const t=open();try{
  assert.equal(t.models.length,15);assert(Object.isFrozen(t.models));
  for(const model of t.models){assert(Object.isFrozen(model));assert.equal(crypto.createHash('sha256').update(model.text).digest('hex'),hashes[model.id],model.id);assert.equal(card(t,model.id).querySelector('h3').textContent,model.title);assert.equal(inlineText(card(t,model.id),model),model.text);}
  assert.deepEqual([...t.d.querySelectorAll('[data-message-filter]')].map(b=>b.textContent),['Tous les messages','Premier contact','Organisation des visites','Après la visite','Offres et négociation','Notaire et suivi']);
  assert.equal(t.d.querySelectorAll('.home-message-library input').length,0);
  assert.equal(t.d.querySelectorAll('.home-message-library .home-message-phone').length,15);
  assert.equal(t.d.querySelectorAll('.home-message-card-excerpt').length,0);
 }finally{t.close();}
});
test('All six categories show their complete model set and correct active state/count',()=>{
 const t=open();try{
  for(const [key,count]of Object.entries({all:15,contact:3,visites:3,apres:2,offres:3,notaire:4})){
   select(t,key);const visible=[...t.d.querySelectorAll('.home-message-card')].filter(c=>!c.hidden);assert.equal(visible.length,count,key);
   assert.deepEqual(visible.map(c=>c.dataset.messageId).sort(),[...t.models].filter(m=>key==='all'||m.category===key).map(m=>m.id).sort());
   assert.equal(t.d.querySelector('[data-message-filter="'+key+'"]').getAttribute('aria-pressed'),'true');assert.equal(t.d.querySelectorAll('.home-message-filter[aria-pressed=true]').length,1);
   assert.equal(t.d.querySelector('.home-message-count').textContent,`${count} modèles`);
  }
 }finally{t.close();}
});
test('Every model opens complete in the overlay; closing restores category, focus and location',()=>{
 const t=open();try{
  for(const model of t.models){
   const modal=show(t,model),trigger=card(t,model.id).querySelector('.home-message-expand');assert(modal.open);assert.equal(modal.querySelector('h2').textContent,model.title);assert.equal(completeText(modal,model),model.text);
   assert.equal(modal.querySelectorAll('.home-message-phone').length,model.type==='sms'?1:0);
   if(model.type==='sms')assert.equal(modal.querySelector('.home-message-complete > .home-message-text').textContent,model.text);
   if(model.id==='acte-vente')assert.equal(modal.querySelector('.home-message-email-subject').textContent,'Objet : Demande de copie de mon acte de vente');
   modal.querySelector('.home-dialog-close').click();assert(!modal.open);assert.equal(t.d.activeElement,trigger);assert.equal(t.w.location.hash,'#formation');assert.equal(t.d.querySelector('.home-message-filter[aria-pressed=true]').dataset.messageFilter,model.category);assert(!t.d.body.classList.contains('home-message-dialog-open'));
  }
 }finally{t.close();}
});
test('Direct copy always uses the full original message, including content beyond the phone viewport',async()=>{
 const t=open();try{
  for(const model of t.models){select(t,model.category);card(t,model.id).querySelector('.home-message-copy').click();await flush();assert.equal(t.copied.at(-1),model.text);assert.equal(card(t,model.id).querySelector('[role=status]').textContent,'Message copié');}
 }finally{t.close();}
});
test('All actual placeholders personalize live preview/copy without mutating models; reset restores original',async()=>{
 const t=open();try{
  const baseline=JSON.stringify(t.models);
  for(const model of t.models){
   const modal=show(t,model),tokens=[...new Set(model.text.match(/\[[^\]\n]+\]/g)||[])];
   const inputs=[...modal.querySelectorAll('.home-message-fields input')];assert.equal(inputs.length,tokens.length);
   const replacements=new Map();inputs.forEach((input,index)=>{assert.equal(modal.querySelector('label[for="'+input.id+'"]').textContent,tokens[index].slice(1,-1));input.value='Valeur '+(index+1);replacements.set(tokens[index],input.value);input.dispatchEvent(new t.w.Event('input',{bubbles:true}));});
   const expected=model.text.replace(/\[[^\]\n]+\]/g,token=>replacements.get(token));
   assert.equal(completeText(modal,model),expected);
   for(const copy of modal.querySelectorAll('.home-message-copy')){copy.click();await flush();assert.equal(t.copied.at(-1),expected);}
   if(tokens.length){modal.querySelector('.home-message-reset').click();assert.equal(completeText(modal,model),model.text);assert([...modal.querySelectorAll('input')].every(input=>input.value===''));}
   modal.close();
  }
  assert.equal(JSON.stringify(t.models),baseline);
 }finally{t.close();}
});
test('Drafts are isolated per model, retained during consultation, and never change direct source copies',async()=>{
 const t=open();try{
  const model=t.models.find(m=>m.id==='suivi-j20');let modal=show(t,model);const input=modal.querySelector('input');input.value='Camille';input.dispatchEvent(new t.w.Event('input',{bubbles:true}));modal.close();
  const other=t.models.find(m=>m.id==='suivi-j45');modal=show(t,other);assert.equal(modal.querySelector('input').value,'');assert.equal(completeText(modal,other),other.text);modal.close();
  modal=show(t,model);assert.equal(modal.querySelector('input').value,'Camille');assert(completeText(modal,model).includes('Camille'));modal.close();
  card(t,model.id).querySelector('.home-message-copy').click();await flush();assert.equal(t.copied.at(-1),model.text);
  assert.equal(t.w.localStorage.length,0);
 }finally{t.close();}
});
test('Personalization treats HTML, dollar replacements and bracketed input literally in a single pass',async()=>{
 const t=open();try{
  const model=t.models.find(m=>m.id==='qualification'),modal=show(t,model),inputs=[...modal.querySelectorAll('input')];
  const value='<img src=x onerror=alert(1)> $& [Votre prénom]';inputs[0].value=value;inputs[0].dispatchEvent(new t.w.Event('input',{bubbles:true}));
  const signature=inputs.find(input=>input.placeholder==='[Votre prénom]');signature.value='Signature';signature.dispatchEvent(new t.w.Event('input',{bubbles:true}));
  const expected=model.text.replace(/\[[^\]\n]+\]/g,token=>token==='[Prénom]'?value:token==='[Votre prénom]'?'Signature':token);
  assert.equal(completeText(modal,model),expected);assert.equal(modal.querySelectorAll('img[src=x],script').length,0);
  modal.querySelector('.home-message-copy').click();await flush();assert.equal(t.copied.at(-1),expected);
 }finally{t.close();}
});
test('Clipboard refusal reports failure and restores usable controls',async()=>{
 const t=open({clipboardFails:true});try{
  const model=t.models[0];let controls=card(t,model.id).querySelector('.home-message-copy-controls');controls.querySelector('button').click();await flush();assert.equal(t.copied.length,0);assert(controls.querySelector('[role=status]').textContent.startsWith('Copie impossible'));assert.equal(controls.querySelector('button').disabled,false);
  const modal=show(t,model);controls=modal.querySelector('.home-message-copy-controls');controls.querySelector('button').click();await flush();assert(controls.querySelector('[role=status]').textContent.startsWith('Copie impossible'));assert.equal(controls.querySelector('button').disabled,false);
 }finally{t.close();}
});
test('Card and modal source actions preserve lesson destinations, including the title-deed fiche',()=>{
 const t=open();try{
  for(const model of t.models){t.w.eval("formationView.level='home';applyFormationView();");select(t,model.category);card(t,model.id).querySelector('.home-message-source').click();assert.deepEqual(t.destinations.at(-1),[model.mi,model.si]);if(model.fiche)assert.equal(t.fiches.at(-1),model.fiche);
   t.w.eval("formationView.level='home';applyFormationView();");const modal=show(t,model);modal.querySelector('.home-message-source').click();assert(!modal.open);assert.deepEqual(t.destinations.at(-1),[model.mi,model.si]);if(model.fiche)assert.equal(t.fiches.at(-1),model.fiche);
  }
 }finally{t.close();}
});
test('Back and backdrop close the modal; inside clicks keep it open; formation documents stay available',()=>{
 const t=open();try{
  select(t,t.models[0].category);card(t,t.models[0].id).querySelector('.home-message-title-button').click();assert(t.d.querySelector('.home-message-dialog').open);t.d.querySelector('.home-message-dialog').close();
  let modal=show(t,t.models[0]);modal.querySelector('.home-message-text').click();assert(modal.open);modal.querySelector('.home-message-back').click();assert(!modal.open);
  modal=show(t,t.models[0]);modal.dispatchEvent(new t.w.MouseEvent('click',{bubbles:true,clientX:-1,clientY:-1}));assert(!modal.open);
  assert.equal(t.d.querySelectorAll('.home-chapter-card').length,6);
  assert.deepEqual([...t.d.querySelectorAll('.home-document-card a')].map(a=>a.getAttribute('href')),['/ma-formation/documents/etat-civil','/ma-formation/documents/etat-des-lieux']);
 }finally{t.close();}
});
test('Scoped message stylesheet loads after home styles; source data is not duplicated in presentation',()=>{
 const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'views/seller/library.html'),'utf8');
 assert(source.indexOf('/css/formation-home-messages.css')>source.indexOf('/css/formation-home.css'));
 const css=fs.readFileSync(path.join(root,'public/css/formation-home-messages.css'),'utf8');
 const {JSDOM}=require('jsdom');const dom=new JSDOM('<style>'+css+'</style>');assert(dom.window.document.querySelector('style').sheet.cssRules.length>80);dom.window.close();
});

test('All messages are readable in primary devices without opening a dialog; secondary actions remain aligned in DOM order',()=>{
 const t=open();try{
  assert.equal(t.d.querySelector('.home-message-dialog').open,false);
  const expectedOrder=['qualification','rappel','remerciement','offre-accepter','diagnostics','dossier-complet','dossier-serieux','dossier-notaire','plateforme','dossier-sms','offre-contre','offre-refuser','suivi-j20','suivi-j45','acte-vente'];
  assert.deepEqual([...t.d.querySelectorAll('.home-message-card')].map(el=>el.dataset.messageId),expectedOrder);
  for(const model of t.models){
   const article=card(t,model.id),preview=article.querySelector('.home-message-inline-preview'),phone=preview.querySelector('.home-message-phone'),viewport=phone.querySelector('.home-message-viewport');
   assert.equal(phone.dataset.channel,model.type);assert.equal(viewport.tabIndex,0);assert.equal(viewport.getAttribute('role'),'region');assert.equal(viewport.closest('[aria-hidden=true]'),null);
   assert.equal(inlineText(article,model),model.text);
   assert.equal(preview.nextElementSibling.className,'home-message-copy-controls');
   assert.equal(preview.nextElementSibling.nextElementSibling.className,'home-message-expand');
   assert.equal(article.querySelector('.home-message-expand').textContent,'Voir le message complet');
   assert.equal(article.querySelectorAll('.home-message-viewport').length,1);
   assert.equal(article.querySelector('.home-message-copy').textContent,'Copier le message');
  }
 }finally{t.close();}
});
