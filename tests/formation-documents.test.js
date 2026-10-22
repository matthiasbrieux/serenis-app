'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { renderDocument } = require('../services/formation-documents');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'views/seller/library.html'), 'utf8');
const modules = JSON.parse(source.slice(source.indexOf('const MODULES = ') + 16, source.indexOf('\n];', source.indexOf('const MODULES = ')) + 2));
const content = slug => new JSDOM(renderDocument(slug)).window.document.querySelector('.document-content');
const normalized = text => text.replace(/\s+/g, ' ').trim();

test('Page 53: two complete identity frames, original options, marriage, divorce, PACS and notices', () => {
  const article = content('etat-civil');
  const people = article.querySelectorAll('.civil-person');
  assert.equal(people.length, 2);
  const fields = ['Premier prénom :','Autres prénoms :','Date de naissance :','Lieu de naissance :','Nationalité :','Profession :','Domicile :','Téléphone domicile :','Portable :','Téléphone bureau :','Mail :'];
  people.forEach((person, index) => {
    assert.deepEqual([...person.querySelectorAll('.write-field')].map(el => el.textContent.trim()), [index === 0 ? 'Nom :' : 'Nom (nom de naissance) :', ...fields]);
    for (const label of ['□ MONSIEUR,','□ MADAME,','□ MADEMOISELLE','Situation :','□ CELIBATAIRE','□ MARIE(E)','□ PACS','□ VEUF(VE)','□ DIVORCE(E)','Titulaire d’une carte d’invalidité :','□ NON','□ OUI']) assert(person.textContent.includes(label), label);
    assert.equal((person.textContent.match(/□/g) || []).length, 10);
    assert.equal((person.textContent.match(/\(1\)/g) || []).length, 2);
  });
  assert.deepEqual([...article.querySelectorAll('.marriage .write-field')].map(el => el.textContent.trim()), ['Date de mariage :','Lieu de mariage :','Nom du notaire rédacteur :','Adresse du notaire :','Date du contrat :','Régime adopté :']);
  assert.equal(article.querySelector('.marriage h4').textContent,'Contrat de mariage (merci de joindre une photocopie du contrat)');
  assert.equal(normalized(article.querySelector('.divorce h3').textContent),'Si divorce □ ou changement de régime matrimonial □ (1)');
  assert.deepEqual([...article.querySelectorAll('.divorce .write-field')].map(el => el.textContent.trim()), ['Date du jugement ou de l’arrêt d’appel :','Tribunal :','Date d’assignation :']);
  assert.equal(normalized(article.querySelector('.pacs').textContent), 'P.A.C.S. : Date : Lieu :');
  assert.equal(normalized(article.querySelector('.document-original-intro').textContent), 'Si vous êtes marié, lié par un PACS, veuf ou divorcé, indiquez également dans le deuxième cadre l’état civil du conjoint, du partenaire ou de l’ex-conjoint svp');
  assert.equal(article.querySelector('.document-original-notice h3').textContent,'PROTECTION DES INFORMATIONS A CARACTERE NOMINATIF');
  assert.equal(article.querySelector('.document-original-notice p').textContent,'Conformément à la loi "Informatique et Libertés" du 6 janvier 1978 modifiée, l’office notarial dispose d’un traitement informatique pour l’accomplissement des activités notariales. A cette fin, l’office est amené à enregistrer des données vous concernant et à les transmettre à certaines administrations. Vous pouvez exercer vos droits d’accès et de rectification aux données vous concernant auprès de l’office notarial');
  assert.equal(article.querySelector('.document-footnote').textContent,'(1) cocher la case correspondante');
  assert.equal(normalized(article.querySelector('.document-original-footer').textContent),'CHAPITRE 10 Signer le compromis de vente 53');
});
test('Page 57: complete original checklist, counters, observation lines, access, signatures and final notice', () => {
  const article = content('etat-des-lieux');
  assert.equal(article.querySelector('h2').textContent,'Fiche d’état des lieux');
  assert.equal(article.querySelector('.document-original-subtitle').textContent,'Vérifications du bien et relevés des compteurs avant la signature');
  assert.equal(article.querySelectorAll(':scope > p')[1].textContent,'Modèle pratique à compléter ensemble. Toute différence avec les engagements de vente doit être signalée au notaire avant la signature.');
  assert.deepEqual([...article.querySelectorAll('.write-field')].map(el => el.textContent.trim()), ['Adresse du bien :','Vendeur(s) :','Acheteur(s) :','Date et heure de la visite :','Date prévue de signature :','Compteur eau :','Compteur gaz :','Compteur élec :','Clés :','Badges / télécommandes :','Autres accès :']);
  assert.deepEqual([...article.querySelectorAll('tbody th')].map(el => el.textContent), ['Logement libéré conformément à l’accord','État apparent des pièces et des extérieurs','Équipements et meubles inclus dans la vente présents','Clés, badges, télécommandes et codes préparés','Documents et notices disponibles']);
  assert.deepEqual([...article.querySelectorAll('thead th')].slice(1).map(el => el.textContent),['Vérifié','Observations']);
  assert.equal(article.querySelectorAll('tbody tr').length,5);
  assert.equal((article.textContent.match(/□/g) || []).length,5);
  assert.equal(article.querySelector('.meters p').textContent,'Photographiez les compteurs. Actualisez les relevés à la remise des clés si nécessaire.');
  assert.equal(article.querySelector('.observations h3').textContent,'Observations à transmettre au notaire');
  assert.equal(article.querySelectorAll('.writing-lines span').length,4);
  assert.equal(article.querySelector('.access h3').textContent,'Accès à remettre lors de la vente');
  assert.deepEqual([...article.querySelectorAll('.document-signatures strong')].map(el => el.textContent),['Signature du vendeur','Signature de l’acheteur']);
  assert.equal(article.querySelector('.document-original-notice').textContent,'Cette fiche constate les vérifications et les relevés. Elle ne remplace pas l’acte de vente et ne constitue pas une renonciation aux droits des parties.');
  assert.equal(normalized(article.querySelector('.document-original-footer').textContent),'CHAPITRE 11 Finaliser la vente chez le notaire 57');
});
test('Both HTML pages use the application logo, complete HTML, shared PDF content and working print command', () => {
  for (const slug of ['etat-civil','etat-des-lieux']) {
    const dom = new JSDOM(renderDocument(slug),{runScripts:'outside-only'}), document=dom.window.document;
    assert.equal(document.querySelector('.document-site-header img').getAttribute('src'),'/images/email-logo.png');
    assert.equal(document.querySelectorAll('iframe,embed,object,canvas,input').length,0);
    assert.equal(document.querySelectorAll('.document-content img').length,0);
    assert.equal(document.querySelector('.primary').getAttribute('href'),`/ma-formation/documents/${slug}/pdf`);
    const printContent = new JSDOM(renderDocument(slug,{pdf:true})).window.document;
    assert.equal(document.querySelector('.document-content').innerHTML,printContent.querySelector('.document-content').innerHTML);
    assert.match(printContent.querySelector('style').textContent, /@page\s*\{\s*size:\s*A4/);
    assert.equal(document.querySelectorAll('.document-benefits').length,0);
    assert.equal(document.querySelector('.document-breadcrumb').getAttribute('aria-label'),'Fil d’Ariane');
    assert.equal(document.querySelector('.document-breadcrumb [aria-current]').textContent,document.querySelector('h1').textContent);
    const originalLogo=fs.readFileSync(path.join(root,'public/images/email-logo.png'));
    for (const img of document.querySelectorAll('.document-site-header img, .document-paper-brand img')) {
      assert.equal(img.getAttribute('src'),'/images/email-logo.png');
      assert.equal(img.getAttribute('width'),'1200');assert.equal(img.getAttribute('height'),'347');
    }
    for (const img of printContent.querySelectorAll('.document-site-header img, .document-paper-brand img')) {
      assert.equal(img.getAttribute('src'),'data:image/png;base64,'+originalLogo.toString('base64'));
    }
    let prints=0;dom.window.print=()=>prints++;
    dom.window.eval(fs.readFileSync(path.join(root,'public/js/formation-documents.js'),'utf8'));
    document.querySelector('[data-print]').click();assert.equal(prints,1);
    dom.window.close();
  }
  assert.throws(()=>renderDocument('../etat-civil'));
  assert.throws(()=>renderDocument('toString'));
});
test('Six original chapters: callouts appear once in the right lessons and after the original explanations', () => {
  assert.equal(modules.length,6);
  const additions=[];
  modules.forEach((mod,mi)=>mod.steps.forEach((step,si)=>(step.validatedFlow||step.sections||[]).forEach(section=>{
    if(section.body?.includes('formation-document-callout'))additions.push({mi,si,section});
  })));
  assert.deepEqual(additions.map(x=>[x.mi,x.si,x.section.title]),[[5,2,'3 — QUELLES INFORMATIONS TRANSMETTRE AU NOTAIRE ?'],[5,3,'3 — RELEVEZ LES COMPTEURS']]);
  for(const {section} of additions){const d=new JSDOM(section.body).window.document;assert.equal(d.querySelectorAll('.formation-document-callout').length,1);assert(d.querySelector('.formation-document-callout').previousElementSibling);assert(d.querySelector('a').href.includes('/ma-formation/documents/'));}
  const dom=new JSDOM(source);for(const script of dom.window.document.querySelectorAll('script:not([src])'))new vm.Script(script.textContent);
  assert(source.includes('const LESSON_RESOURCES = ['));
  assert(source.includes('const files = [...new Set((LESSON_RESOURCES[activeModule] || []).flat())]'));
  assert(!source.includes('Ressources complémentaires'));
});
test('PDF download handles binary response, click and failure honestly', async () => {
  const dom=new JSDOM(renderDocument('etat-civil'),{runScripts:'outside-only',url:'https://vpm.example/ma-formation/documents/etat-civil'}),w=dom.window;
  let calls=0,clicks=0,revoked=0;
  w.setTimeout=fn=>fn();w.URL.createObjectURL=()=> 'blob:pdf';w.URL.revokeObjectURL=()=>revoked++;
  w.HTMLAnchorElement.prototype.click=function(){if(this.download)clicks++;};
  w.fetch=async()=>{calls++;return {ok:true,headers:{get:()=> 'application/pdf'},blob:async()=>new w.Blob(['%PDF-test'])};};
  w.eval(fs.readFileSync(path.join(root,'public/js/formation-documents.js'),'utf8'));
  const link=w.document.querySelector('.primary');
  link.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1);assert.equal(clicks,1);assert.equal(revoked,1);assert(w.document.querySelector('[role=status]').textContent.includes('Votre PDF est prêt'));
  w.fetch=async()=>({ok:false,headers:{get:()=> 'text/html'}});
  link.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(clicks,1);assert(w.document.querySelector('[role=status]').textContent.includes('n’a pas pu'));assert.equal(link.hasAttribute('aria-disabled'),false);
  dom.window.close();
});
test('Home: two document cards after messages, correct destinations and visibility through the existing view mechanism', () => {
  const dom=new JSDOM(source,{runScripts:'outside-only',url:'https://vpm.example/ma-formation'}),w=dom.window;
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
  w.VPMFormationHomeMessages=Array.from({length:15},(_,i)=>({id:['qualification','rappel','remerciement','offre-accepter'][i]||'model-'+i,title:'Modèle '+i,text:'Message existant',type:'sms',category:'contact',origin:'Formation',notes:[],mi:0,si:0}));
  w.eval(`var MODULES=${JSON.stringify(modules)};var CH_PHOTOS=Array(6).fill('/images/formation-hero.png');var CH_ICONS=Array(6).fill('');var activeModule=0;var doneSteps={};var formationView={level:'home'};function formationProgressKey(mi,si){return mi+'-'+si;}function openModule(){}function renderChapterCards(){}function updateProgress(){}function applyFormationView(){}function setFormationVisibility(el,visible){el.hidden=!visible;}function selectFormationLesson(){}function openFiche(){}`);
  w.eval(fs.readFileSync(path.join(root,'public/js/formation-home.js'),'utf8'));
  const library=w.document.querySelector('.home-document-library');assert(library);
  assert.equal(library.previousElementSibling.className,'home-message-library');
  assert.equal(library.querySelector('h2').textContent,"Vos documents prêts à l'emploi");
  assert.deepEqual([...library.querySelectorAll('a')].map(a=>a.getAttribute('href')),['/ma-formation/documents/etat-civil','/ma-formation/documents/etat-des-lieux']);
  assert.equal(library.querySelectorAll('.home-document-card').length,2);
  assert.equal(w.document.querySelectorAll('.home-message-card').length,15);
  w.eval("formationView.level='lesson';applyFormationView();");assert.equal(w.document.querySelector('#formationHome').hidden,true);
  w.eval("formationView.level='home';applyFormationView();");assert.equal(w.document.querySelector('#formationHome').hidden,false);
  dom.window.close();
});
test('Document router: real HTML responses and unknown document 404 without database access', async () => {
  const express=require('express'),http=require('node:http'),net=require('node:net');
  const app=express();app.use((req,res,next)=>{req.seller={id:123};next();});app.use('/ma-formation/documents',require('../routes/formation-documents'));
  const request=url=>new Promise((resolve,reject)=>{
    const req=new http.IncomingMessage(new net.Socket());req.method='GET';req.url=url;req.headers={host:'vpm.example'};
    const res=new http.ServerResponse(req);const chunks=[];
    res.write=chunk=>{chunks.push(Buffer.from(chunk));return true;};res.end=chunk=>{if(chunk)chunks.push(Buffer.from(chunk));resolve({status:res.statusCode,headers:res.getHeaders(),body:Buffer.concat(chunks).toString()});res.emit('finish');return res;};
    app.handle(req,res,error=>error?reject(error):res.status(404).end());req.push(null);
  });
  for(const slug of ['etat-civil','etat-des-lieux']){const response=await request('/ma-formation/documents/'+slug);assert.equal(response.status,200);assert(response.headers['content-type'].includes('text/html'));assert(response.body.includes('document-content'));}
  assert.equal((await request('/ma-formation/documents/inconnu')).status,404);
  assert.equal((await request('/ma-formation/documents/toString')).status,404);
  const sellerSource=fs.readFileSync(path.join(root,'routes/seller.js'),'utf8');assert(sellerSource.includes("router.use('/ma-formation/documents', requireAuth, require('./formation-documents'))"));
});
test('Full server.js: actual seller login, authentication, HTML routes, static assets and real PDF attempt with isolated database', () => {
  const result=require('node:child_process').spawnSync(process.execPath,[path.join(__dirname,'fixtures/formation-documents-app-runner.cjs')],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert(result.stdout.includes('PASS real POST /login -> 200'));
  assert(result.stdout.includes('PASS full server.js startup/middleware/routing/login integration'));
  console.log(result.stdout.trim());
});
