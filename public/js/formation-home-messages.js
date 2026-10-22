/* Only the 15 approved pedagogical models. No shared-mail/toolbox import. */
(() => {
  'use strict';
  const section = (mi,si,title) => {
    const step=MODULES[mi].steps[si];
    const found=(step.validatedFlow||step.sections).find(s=>s.title===title);
    if(!found)throw Error('Source pédagogique introuvable : '+title);
    return found;
  };
  const parse = html => {const container=document.createElement('div');container.innerHTML=html;return container;};
  const nodeText = node => {
    const copy=node.cloneNode(true);copy.querySelectorAll('br').forEach(br=>br.replaceWith(document.createTextNode('\n')));
    return copy.textContent.trim();
  };
  const paragraphs = nodes => [...nodes].map(nodeText).join('\n\n');
  const quoteText = html => paragraphs(parse(html).querySelector('blockquote').querySelectorAll('p'));
  const signatureText = html => {
    const nodes=[...parse(html).querySelectorAll(':scope > p')];
    const end=nodes.findIndex(p=>p.textContent.includes('[Votre prénom]'));
    if(end<0)throw Error('Signature du modèle introuvable');
    return paragraphs(nodes.slice(0,end+1));
  };
  const models=[];
  function add(id,mi,si,title,type,category,text,notes=[]){
    models.push(Object.freeze({id,mi,si,title,type,category,text,notes:Object.freeze(notes),origin:`${mi+1}.${si+1} — ${MODULES[mi].steps[si].title.replace(/^◆\s*/,'')}`}));
  }
  const diagnostics=section(1,1,'LE SMS DE QUALIFICATION');
  add('diagnostics',1,1,diagnostics.title,'sms','visites',parse(diagnostics.body).querySelector('.dossier-message-text').textContent);
  // Read the existing authored phone previews, rather than recreate their models.
  const dossierTexts=[...document.querySelectorAll('#step-1-3 .dossier-message-preview .dossier-message-text')].map(el=>el.textContent);
  if(dossierTexts.length!==3)throw Error('Les trois modèles documentaires doivent être disponibles');
  ['01 — MON DOSSIER COMPLET','02 — DOSSIER ACHETEUR SÉRIEUX','03 — DOSSIER NOTAIRE COMPLET'].forEach((title,i)=>{
    add(['dossier-complet','dossier-serieux','dossier-notaire'][i],1,3,title,i===2?'email':'written',['contact','apres','notaire'][i],dossierTexts[i]);
  });
  for(const [id,title,category]of [
    ['plateforme','VOTRE MESSAGE PRÊT À ENVOYER SUR LEBONCOIN','contact'],
    ['dossier-sms','2 — ENVOYEZ LE LIEN DU DOSSIER ACHETEUR PAR SMS','contact'],
    ['qualification','9 — UTILISEZ LES OUTILS DE QUALIFICATION DE VOTRE AGENDA','visites']
  ]){
    const source=section(3,1,title);
    add(id,3,1,title,id==='plateforme'?'written':'sms',category,quoteText(source.body));
  }
  const reminder=section(3,2,'EXEMPLE DE RAPPEL');
  add('rappel',3,2,reminder.title,'sms','visites',quoteText(reminder.body),[nodeText(parse(reminder.body).querySelector(':scope > p'))]);
  const thanks=section(4,0,'MESSAGE TYPE — REMERCIEMENT APRÈS VISITE');
  add('remerciement',4,0,thanks.title,'sms','apres',signatureText(thanks.body));
  const offers=parse(section(5,1,'7 — COMMENT RÉPONDRE À UNE OFFRE ?').body);
  const offerTitles=["ACCEPTER L'OFFRE",'FAIRE UNE CONTRE-PROPOSITION',"REFUSER L'OFFRE"];
  offerTitles.forEach((title,i)=>{
    const heading=[...offers.querySelectorAll('h4')].find(h=>h.textContent===title);
    const nodes=[];for(let node=heading.nextElementSibling;node&&node.tagName!=='H4';node=node.nextElementSibling)nodes.push(node);
    const begin=nodes.findIndex(p=>p.textContent.startsWith('« Bonjour [Prénom],'));
    const end=nodes.findIndex((p,j)=>j>=begin&&p.textContent.includes('[Votre prénom]'));
    const notes=nodes.filter((_,j)=>j<begin||j>end).map(nodeText);
    add(['offre-accepter','offre-contre','offre-refuser'][i],5,1,title,'written','offres',paragraphs(nodes.slice(begin,end+1)),notes);
  });
  for(const [id,title]of [['suivi-j20','EXEMPLE DE SUIVI — AUTOUR DE J+20'],['suivi-j45','EXEMPLE DE SUIVI — AUTOUR DE J+45']]){
    const source=section(5,3,title),nodes=[...parse(source.body).querySelectorAll(':scope > p')];
    const end=nodes.findIndex(p=>p.textContent.includes('[Votre prénom]'));
    add(id,5,3,title,'sms','notaire',signatureText(source.body),nodes.slice(end+1).map(nodeText));
  }
  add('acte-vente',1,0,FICHES['titre-propriete'].sections.find(s=>s.body.includes('fiche-mail-block')).title,'email','notaire',FICHE_MAILS['titre-propriete']);
  const last=models.pop();models.push(Object.freeze({...last,title:'Objet : Demande de copie de mon acte de vente',origin:'2.1 et 6.3 — Fiche « Titre de propriété »',fiche:'titre-propriete'}));
  if(models.length!==15||new Set(models.map(m=>m.text)).size!==15)throw Error('Le catalogue doit contenir exactement 15 textes distincts');
  window.VPMFormationHomeMessages=Object.freeze(models);
})();
