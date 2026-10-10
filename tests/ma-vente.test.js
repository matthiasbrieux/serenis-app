const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'views/seller/dashboard.html'),'utf8');
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function fixtures(){return {
 '/api/me':{seller:{id:991,uuid:'test-A',first_name:'Camille',last_name:'Test',email:'camille@example.test'},notifications:[{title:'Demande de visite',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-09 08:00:00',type:'visit_request'}]},
 '/api/property':{property:{type:'Maison',rooms:5,surface_habitable:120,surface_terrain:0,city:'Ville fictive',address:'Adresse fictive',price:220000,description:'Logement de test',year_built:2001,dpe_class:'C',acheteur_token:'buyer-test',acheteur_url:'https://vpm.example.test/dossier/acheteur/buyer-test',notaire_url:'https://vpm.example.test/dossier/notaire/notary-test',bien_url:'https://vpm.example.test/bien/test'},photos:[{id:1,url:'/uploads/photos/test.jpg',category:'pro'}],documents:[{folder:'diagnostics'}]},
 '/api/visits':{visits:[{id:11,status:'confirmed',visit_date:'2099-01-01',visit_time:'10:00',buyer_name:'Test'},{id:12,status:'confirmed',visit_date:'2000-01-01',visit_time:'10:00',buyer_name:'Test'},{id:13,status:'cancelled',visit_date:'2099-01-01'},{id:14,status:'confirmed',visit_date:today,visit_time:'23:59',buyer_name:'Test'}]},
 '/api/agenda':{slots:[{specific_date:'2099-01-01',start_time:'10:00',end_time:'12:00'}]},
 '/api/offers':{offers:[{id:21,status:'accepted'},{id:22,status:'refused'},{id:23,status:'pending',buyer_name:'<img src=x onerror=alert(1)>',amount:200000}]},
 '/api/publications':{publications:[{platform:'Portail réel renseigné',active:1,url:'https://example.test/annonce'},{platform:'Ancien lien invalide',active:0,url:'javascript:alert(1)'}]},
 '/api/progress':{vpm_done_steps:JSON.stringify({'0_0':true,'4_1':true,'5_2':true,'5_3':true,'99_99':true})},
 '/api/offre-link':{url:'https://vpm.example.test/soumettre-offre/buyer-test'},'/api/notifications/counts':{}
};}
async function open(data=fixtures(),options={}){
 const requests=[],copied=[],errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const html=source.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.join(root,'public',src.split('?')[0]),'utf8')+'</script>');
 const dom=new JSDOM(html,{url:'https://vpm.example.test/dashboard',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.fetch=async(url,init={})=>{requests.push({url,method:init.method||'GET'});const name=new URL(url,w.location.href).pathname;return{ok:!options.fail?.includes(name),json:async()=>data[name]||{}}};
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{if(options.copyFails)throw Error('Denied');copied.push(value)}}});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};
  w.localStorage.setItem('vpm_done_steps',JSON.stringify({'0_0':true,'0_1':true,'0_2':true}));
 }});
 await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));await new Promise(r=>setTimeout(r,40));
 return{dom,w:dom.window,d:dom.window.document,requests,copied,errors};
}
test('Ma vente: five own-message copies, destinations, counters, owned progress and XSS-safe output',async()=>{
 const t=await open();try{
  const {d,w}=t;assert.deepEqual(t.errors,[]);
  assert.equal(d.querySelectorAll('.db-process-step').length,5);assert.equal(d.querySelectorAll('.mv-track-card').length,4);
  assert.equal(d.querySelectorAll('.db-step-btn-link').length,5);assert.equal(d.querySelectorAll('.db-step-preview-link').length,5);
  assert.equal(d.querySelectorAll('.db-process-step details').length,0);
  assert.equal(d.querySelector('#dashboardGreeting').textContent,'Bonjour Camille,');
  assert.match(d.querySelector('#mvPropertyFacts').textContent,/Terrain 0 m²/);
  assert.equal(d.querySelector('#mvVisits0').textContent,'2');assert.equal(d.querySelector('#mvVisits1').textContent,'1');assert.equal(d.querySelector('#mvVisits2').textContent,'1');
  for(let i=0;i<3;i++)assert.equal(d.querySelector('#mvOffers'+i).textContent,'1');
  assert.equal(d.querySelector('#dbFormLabel').textContent,'3 étapes sur 19 complétées');assert.equal(d.querySelector('#dbFormPct').textContent,'16%');
  assert.equal(d.querySelectorAll('#mvNotifications img,#dbOffersBody img').length,0);assert.equal(d.querySelector('#mvPublications'),null);assert.deepEqual([...d.querySelectorAll('.mv-track-card h2')].map(e=>e.textContent),['Mes notifications','Mon dossier complet','Mes visites',"Mes offres d'achat"]);assert.equal(d.querySelectorAll('.mv-property img').length,0);
  const expected=w.eval('_stepMsgs.map(fn=>fn())');
  const urls=w.eval('[..._stepUrls]');
  for(let i=0;i<5;i++){const btn=d.querySelectorAll('.db-step-btn-link')[i];btn.click();await new Promise(r=>setTimeout(r,0));assert.equal(t.copied[i],expected[i]);assert.match(btn.textContent,/Copié !/);const previewUrl=new URL(urls[i]);assert.equal(d.querySelectorAll('.db-step-preview-link')[i].href,new URL(previewUrl.pathname+previewUrl.search+previewUrl.hash,t.w.location.origin).href);}
  assert(!t.copied[0].includes('notary-test'));assert(t.copied[4].includes('notary-test'));
  assert(t.requests.every(r=>r.method==='GET'));
  assert.equal(d.querySelectorAll('#dbPending,#dbVisits,#dbDispos,#dbOffersBody').length,4);
  const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
  d.querySelector('#mobileMenuBtn').click();assert(d.querySelector('#sidebar').classList.contains('open'));d.querySelector('#sidebarOverlay').click();assert(!d.querySelector('#sidebar').classList.contains('open'));
 }finally{t.dom.window.close();}
});
test('Ma vente: honest empty account and malformed progression without foreign local-cache fallback',async()=>{
 const data=fixtures();data['/api/property']={property:null};data['/api/visits']={visits:[]};data['/api/offers']={offers:[]};data['/api/agenda']={slots:[]};data['/api/me']={seller:{id:992,uuid:'test-B'},notifications:[]};data['/api/publications']={publications:[]};data['/api/progress']={vpm_done_steps:'broken JSON'};data['/api/offre-link']={};
 const t=await open(data);try{assert.deepEqual(t.errors,[]);assert.equal(t.d.querySelector('#dbFormPct').textContent,'0%');assert.equal(t.d.querySelector('#mvPropertyPhoto img'),null);assert.equal(t.d.querySelector('#mvPropertyPreview'),null);assert.equal(t.d.querySelector('#mvPublications'),null);assert.equal(t.d.querySelector('#mvActions'),null);assert.match(t.d.querySelector('#mvNotifications').textContent,/Aucune notification/);assert.equal(t.d.querySelectorAll('.db-step-preview-link[href]').length,0);t.d.querySelector('.db-step-btn-link').click();await Promise.resolve();assert.equal(t.copied.length,0);}finally{t.dom.window.close();}
});
test('Ma vente: HTTP errors and clipboard refusal do not produce fake success',async()=>{
 const failed=await open(fixtures(),{fail:['/api/property','/api/progress','/api/publications']});try{assert.match(failed.d.querySelector('#mvPropertySummary').textContent,/Impossible/);assert.match(failed.d.querySelector('#dbFormLabel').textContent,/indisponible/);assert.equal(failed.d.querySelector('#mvVisits0').textContent,'—');}finally{failed.dom.window.close();}
 const t=await open(fixtures(),{copyFails:true});try{t.d.querySelector('.db-step-btn-link').click();await new Promise(r=>setTimeout(r,0));assert.equal(t.copied.length,0);assert.equal(t.d.querySelector('#stepMsgModal').style.visibility,'visible');assert.match(t.d.querySelector('#stepMsgModalText').textContent,/buyer-test/);assert(!t.d.querySelector('.db-step-btn-link').textContent.includes('Copié !'));}finally{t.dom.window.close();}
});
test('Ma vente: actual lesson topology, syntax, local navigation and PDF reference',()=>{
 const library=fs.readFileSync(path.join(root,'views/seller/library.html'),'utf8');const sizes=vm.runInNewContext(library.slice(library.indexOf('const MODULES ='),library.indexOf('const MAIL_CATS ='))+';MODULES.map(m=>m.steps.length)');assert.equal(JSON.stringify(sizes),'[3,4,4,3,2,3]');
 const d=new JSDOM(source).window.document;for(const script of d.querySelectorAll('script:not([src])'))new vm.Script(script.textContent);
 for(const href of ['/dashboard','/mon-agenda','/mon-bien','/ma-formation','/mes-publications','/mes-offres','/mes-notifications'])assert(source.includes('href="'+href+'"'));
 assert(fs.existsSync(path.join(root,'public/toolbox/formation/guide-complet.pdf')));
});

test('Ma vente: preview stays on current environment when sharing BASE_URL points elsewhere',async()=>{
 const data=fixtures();data['/api/property'].property.acheteur_url='https://other-environment.example.test/dossier/acheteur/buyer-test';data['/api/property'].property.notaire_url='https://other-environment.example.test/dossier/notaire/notary-test';data['/api/offre-link'].url='https://other-environment.example.test/soumettre-offre/buyer-test';const t=await open(data);try{assert.deepEqual(t.errors,[]);for(const a of t.d.querySelectorAll('.db-step-preview-link'))assert.equal(new URL(a.href).origin,t.w.location.origin);assert.match(t.d.querySelectorAll('.db-step-preview-link')[2].hash,/documents/);assert.match(t.d.querySelectorAll('.db-step-preview-link')[4].pathname,/notaire\/notary-test/);const original=t.w.eval('_stepMsgs[0]()');t.d.querySelector('.db-step-btn-link').click();await new Promise(r=>setTimeout(r,0));assert.equal(t.copied[0],original);}finally{t.dom.window.close();}
});
