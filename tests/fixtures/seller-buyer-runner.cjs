'use strict';
const fs=require('fs'),path=require('path'),Module=require('module'),http=require('http'),net=require('net'),assert=require('assert/strict'),os=require('os');
const root=path.resolve(__dirname,'../..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-seller-buyer-'));process.on('exit',()=>fs.rmSync(out,{recursive:true,force:true}));process.chdir(root);
for(const k of ['CLOUDINARY_URL','RESEND_API_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','STRIPE_SECRET_KEY','ANTHROPIC_API_KEY'])delete process.env[k];
process.env.DATABASE_URL=path.join(out,'sb-test.db');
process.env.JWT_SECRET='sb-test-jwt-secret-32chars-min-!!';
process.env.BASE_URL='https://sb.example';
process.env.NODE_ENV='test';

const emailCalls=[];
const smsCalls=[];
const mail=new Proxy({},{get:(_,name)=>async(...args)=>{emailCalls.push({fn:name,args});return true;}});
mail.legalInfoReady=()=>true;
const sms={sendSmsNotification:async(...a)=>{smsCalls.push(a);},assignTwilioNumber:async()=>null};

const realLoad=Module._load;
Module._load=function(name,parent){
  const f=(()=>{try{return Module._resolveFilename(name,parent)}catch{return''}})();
  if(f===root+'/services/email.js')return mail;
  if(f===root+'/services/twilio.js')return sms;
  if(f===root+'/services/passwordCheck.js')return{isPasswordPwned:async()=>false};
  if(name==='stripe')return()=>({});
  if(['resend','cloudinary','@anthropic-ai/sdk','html-pdf-node'].includes(name))throw Error('External blocked: '+name);
  return realLoad.apply(this,arguments);
};
global.fetch=async()=>{throw Error('Network blocked')};

const db=require(root+'/database.js');
const express=require(root+'/node_modules/express');
const bcrypt=require(root+'/node_modules/bcryptjs');
const cookieParser=require(root+'/node_modules/cookie-parser');
const auth=require(root+'/routes/auth');
const seller=require(root+'/routes/seller');
const buyerModule=require(root+'/routes/buyer');
const dossier=require(root+'/routes/dossier');

const app=express();
app.set('trust proxy',1);
app.use(cookieParser());
app.use(require(root+'/middleware/csrf'));
app.use(express.json({limit:'5mb'}));
app.use(auth,seller,buyerModule.router,dossier);
app.use((err,req,res,next)=>{res.status(500).json({error:err.message});});

let visitorN=100;
function request(method,url,{body,headers={},cookie}={}){return new Promise(resolve=>{
  const sock=new net.Socket();Object.defineProperty(sock,'remoteAddress',{value:'10.0.0.'+(++visitorN%254||1)});
  const req=new http.IncomingMessage(sock);req.method=method;req.url=url;req.complete=true;
  req.headers={host:'sb.example',origin:'https://sb.example',...headers};
  if(cookie)req.headers.cookie=cookie;
  const payload=body!==undefined?Buffer.from(JSON.stringify(body)):null;
  if(payload){req.headers['content-type']='application/json';req.headers['content-length']=String(payload.length);}
  const res=new http.ServerResponse(req),chunks=[];let done=false;
  const to=setTimeout(()=>finish('timeout'),8000);
  function finish(e){if(done)return;done=true;clearTimeout(to);const text=Buffer.concat(chunks).toString();let json;try{json=JSON.parse(text)}catch{}resolve({status:res.statusCode,text,json});}
  res.write=d=>{if(d)chunks.push(Buffer.from(d));return true;};
  res.end=function(d){if(d)chunks.push(Buffer.from(d));finish();this.emit('finish');return this;};
  app.handle(req,res,e=>{res.statusCode=e?500:404;res.end(e?JSON.stringify({error:e.message}):'not found');});
  if(payload)req.push(payload);req.push(null);
});}

// ── Seed helpers ───────────────────────────────────────────────────────────
function seedSeller(email,opts={}){
  const hashed=bcrypt.hashSync('TestPass!2026',4);
  const id=Number(db.prepare('INSERT INTO sellers(uuid,email,password,pack,first_name,last_name,phone,contrat_signe,paid_at) VALUES(?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP)').run('uuid-'+email,email,hashed,'serenite',opts.first||'Alice',opts.last||'Test','0600000000').lastInsertRowid);
  return id;
}
function seedProperty(sellerId,opts={}){
  const slug='test-'+sellerId+'-'+Date.now();
  const token='tok-'+sellerId;
  const {v4:uuidv4}=require(root+'/node_modules/uuid');
  const id=Number(db.prepare('INSERT INTO properties(uuid,seller_id,type,address,city,postal_code,price,surface_habitable,rooms,slug,published,acheteur_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(uuidv4(),sellerId,opts.type||'Maison','12 rue du Test',opts.city||'Testville','59000',opts.price||250000,100,4,slug,opts.published?1:0,token).lastInsertRowid);
  return{id,slug,token};
}
function sellerCookie(id){return 'token='+require(root+'/services/session').sign(db.prepare('SELECT * FROM sellers WHERE id=?').get(id),'seller');}

let passes=0,failures=[];
async function test(id,fn){try{await fn();passes++;console.log('PASS '+id);}catch(e){failures.push({id,err:e.message});console.error('FAIL '+id+': '+e.message);}}

// ═══════════════════════════════════════════════════════════════════════════
(async()=>{

// Setup
const sellerIdA=seedSeller('alice@sb.example');
const sellerIdB=seedSeller('bob@sb.example');
const propA=seedProperty(sellerIdA,{published:true,price:300000,city:'Lille'});
const cookieA=sellerCookie(sellerIdA);
const propB=seedProperty(sellerIdB,{published:false});
const cookieB=sellerCookie(sellerIdB);

// ── Agenda ─────────────────────────────────────────────────────────────────

// SB-01 — Vendeur crée des créneaux d'agenda
await test('SB-01',async()=>{
  const r=await request('POST','/api/agenda',{body:{slots:[
    {date:'2099-06-10',start:'10:00',end:'12:00'},
    {date:'2099-06-10',start:'14:00',end:'16:00'},
    {date:'2099-06-11',start:'09:00',end:'11:00'},
  ]},cookie:cookieA});
  assert.equal(r.status,200);assert.ok(r.json?.success);
  const slots=db.prepare('SELECT * FROM agenda_slots WHERE seller_id=? AND active=1').all(sellerIdA);
  assert.equal(slots.length,3,'3 slots should be saved');
});

// SB-02 — Acheteur voit les créneaux disponibles (public)
await test('SB-02',async()=>{
  const r=await request('GET',`/api/bien/${propA.slug}/creneaux`);
  assert.equal(r.status,200);
  assert(Array.isArray(r.json?.slots),'slots array required');
  assert(r.json.slots.length>0,'Should have available slots');
});

// SB-03 — Acheteur réserve une visite (parcours public)
await test('SB-03',async()=>{
  emailCalls.length=0;smsCalls.length=0;
  const r=await request('POST',`/api/bien/${propA.slug}/reserver`,{body:{
    buyer_name:'Jean Dupont',buyer_email:'jean@acheteur.test',buyer_phone:'0611223344',
    visit_date:'2099-06-10',visit_time:'10:00',buyer_budget:'280000',buyer_financing:'financement',
  }});
  assert.equal(r.status,200);assert.ok(r.json?.success,'Visit booking should succeed');
  const visit=db.prepare('SELECT * FROM visits WHERE seller_id=? AND buyer_email=?').get(sellerIdA,'jean@acheteur.test');
  assert(visit,'Visit should be created in DB');
  assert.equal(visit.status,'confirmed','Visit should be confirmed immediately');
  assert.equal(visit.visit_date,'2099-06-10');
  const notif=db.prepare("SELECT * FROM notifications WHERE seller_id=? AND type='visit_confirmed' AND visit_id=?").get(sellerIdA,visit.id);
  assert(notif,'Seller notification should be created');
  const confirmEmail=emailCalls.find(c=>c.fn==='sendVisitConfirmation');
  assert(confirmEmail,'Confirmation email to buyer should be attempted');
  const sellerEmail=emailCalls.find(c=>c.fn==='sendNewVisitRequest');
  assert(sellerEmail,'Notification email to seller should be attempted');
});

// SB-04 — Double réservation même créneau : conflit 409
await test('SB-04',async()=>{
  const r=await request('POST',`/api/bien/${propA.slug}/reserver`,{body:{
    buyer_name:'Marie Autre',buyer_email:'marie@acheteur.test',buyer_phone:'',
    visit_date:'2099-06-10',visit_time:'10:00',
  }});
  assert.equal(r.status,409,'Duplicate slot must return 409 conflict');
});

// SB-05 — Vendeur crée une visite manuellement (côté vendeur)
await test('SB-05',async()=>{
  emailCalls.length=0;
  const r=await request('POST','/api/visits',{body:{
    buyer_name:'Pierre Manuel',buyer_email:'pierre@acheteur.test',buyer_phone:'0699887766',
    visit_date:'2099-06-11',visit_time:'09:00',notes:'Acheteur très sérieux',
  },cookie:cookieA});
  assert.equal(r.status,200);assert.ok(r.json?.id);
  const visit=db.prepare('SELECT * FROM visits WHERE id=?').get(r.json.id);
  assert.equal(visit.status,'confirmed');
  const notif=db.prepare("SELECT * FROM notifications WHERE seller_id=? AND type='visit_request' AND visit_id=?").get(sellerIdA,r.json.id);
  assert(notif,'Seller notified of manually added visit');
  const sellerEmail=emailCalls.find(c=>c.fn==='sendNewVisitRequest');
  assert(sellerEmail,'New visit request email attempted');
  const confirmEmail=emailCalls.find(c=>c.fn==='sendVisitConfirmation');
  assert(confirmEmail,'Confirmation email to buyer attempted');
});

// SB-06 — Vendeur passe visite en "done"
await test('SB-06',async()=>{
  const visit=db.prepare('SELECT id FROM visits WHERE seller_id=? AND buyer_email=?').get(sellerIdA,'jean@acheteur.test');
  const r=await request('PUT',`/api/visits/${visit.id}/status`,{body:{status:'done'},cookie:cookieA});
  assert.equal(r.status,200);
  const updated=db.prepare('SELECT status FROM visits WHERE id=?').get(visit.id);
  assert.equal(updated.status,'done');
});

// SB-07 — Vendeur annule une autre visite, notification mise à jour
await test('SB-07',async()=>{
  emailCalls.length=0;
  const visit=db.prepare("SELECT id FROM visits WHERE seller_id=? AND buyer_email='pierre@acheteur.test'").get(sellerIdA);
  const r=await request('PUT',`/api/visits/${visit.id}/status`,{body:{status:'cancelled'},cookie:cookieA});
  assert.equal(r.status,200);
  const updated=db.prepare('SELECT status FROM visits WHERE id=?').get(visit.id);
  assert.equal(updated.status,'cancelled');
  const cancelEmail=emailCalls.find(c=>c.fn==='sendVisitCancellation');
  assert(cancelEmail,'Cancellation email to buyer must be attempted');
  const openNotifs=db.prepare("SELECT * FROM notifications WHERE seller_id=? AND visit_id=? AND type='visit_request' AND read_at IS NULL").get(sellerIdA,visit.id);
  assert(!openNotifs,'Open visit_request notification must be marked read on cancellation');
});

// SB-08 — Visite d'un autre vendeur : permission refusée
await test('SB-08',async()=>{
  const visit=db.prepare("SELECT id FROM visits WHERE seller_id=?").get(sellerIdA);
  const r=await request('PUT',`/api/visits/${visit.id}/status`,{body:{status:'cancelled'},cookie:cookieB});
  assert.equal(r.status,404,'Other seller must not access visit');
});

// SB-09 — Dossier acheteur : réservation visite depuis la page dossier
// Route : POST /api/dossier/acheteur/:token/reserver (requiert budget+financement+délai)
await test('SB-09',async()=>{
  emailCalls.length=0;
  const r=await request('POST',`/api/dossier/acheteur/${propA.token}/reserver`,{body:{
    buyer_name:'Lise Dossier',buyer_email:'lise@acheteur.test',buyer_phone:'0677554433',
    visit_date:'2099-06-10',visit_time:'14:00',
    buyer_budget:'270000',buyer_financing:'financement',buyer_timeline:'3 mois',
  }});
  assert.equal(r.status,200,JSON.stringify(r.json));assert.ok(r.json?.success,'Dossier booking should succeed');
  const visit=db.prepare('SELECT * FROM visits WHERE seller_id=? AND buyer_email=?').get(sellerIdA,'lise@acheteur.test');
  assert(visit,'Visit should be created');
  assert.equal(visit.status,'confirmed');
  const notif=db.prepare("SELECT * FROM notifications WHERE seller_id=? AND type='visit_confirmed' AND visit_id=?").get(sellerIdA,visit.id);
  assert(notif,'Seller notified via dossier booking');
});

// SB-10 — Soumission d'offre via /api/soumettre-offre/:token
// Requiert firstName, lastName, email, amount
await test('SB-10',async()=>{
  emailCalls.length=0;smsCalls.length=0;
  const r=await request('POST',`/api/soumettre-offre/${propA.token}`,{body:{
    firstName:'Jean',lastName:'Dupont',email:'jean@acheteur.test',phone:'0611223344',
    amount:'285000',validity_days:7,conditions:'Sous réserve de financement',message:'Offre ferme',
  }});
  assert.equal(r.status,200,JSON.stringify(r.json));assert.ok(r.json?.success,'Offer should be created');
  const offer=db.prepare('SELECT * FROM offers WHERE seller_id=? AND buyer_email=?').get(sellerIdA,'jean@acheteur.test');
  assert(offer,'Offer must be in DB');
  assert.equal(offer.amount,285000);
  assert.equal(offer.status,'pending');
  const notif=db.prepare("SELECT * FROM notifications WHERE seller_id=? AND type='offer'").get(sellerIdA);
  assert(notif,'Seller offer notification must be created');
  const sellerOfferEmail=emailCalls.find(c=>c.fn==='sendNewOfferEmail');
  assert(sellerOfferEmail,'Seller offer notification email must be attempted');
  const buyerReceiptEmail=emailCalls.find(c=>c.fn==='sendOfferReceiptBuyer');
  assert(buyerReceiptEmail,'Buyer offer receipt email must be attempted');
});

// SB-11 — Dédoublonnage d'offre identique dans les 10 minutes
await test('SB-11',async()=>{
  const r=await request('POST',`/api/soumettre-offre/${propA.token}`,{body:{
    firstName:'Jean',lastName:'Dupont',email:'jean@acheteur.test',phone:'0611223344',
    amount:'285000',validity_days:7,conditions:'Sous réserve de financement',message:'Offre ferme',
  }});
  assert.equal(r.status,200,JSON.stringify(r.json));
  assert.ok(r.json?.duplicate,'Duplicate offer within 10min must be detected');
});

// SB-12 — Vendeur accepte une offre (/api/offers/:id/status)
await test('SB-12',async()=>{
  const offer=db.prepare("SELECT id FROM offers WHERE seller_id=? AND status='pending'").get(sellerIdA);
  assert(offer,'An offer should exist from SB-10');
  const r=await request('PUT',`/api/offers/${offer.id}/status`,{body:{status:'accepted',buyer_name:'Jean Dupont',buyer_phone:'0611223344'},cookie:cookieA});
  assert.equal(r.status,200,JSON.stringify(r.json));
  const updated=db.prepare('SELECT status FROM offers WHERE id=?').get(offer.id);
  assert.equal(updated.status,'accepted');
});

// SB-13 — Bien non publié : réservation publique impossible
// La route retourne 200 avec un error body quand le bien n'est pas publié
await test('SB-13',async()=>{
  const r=await request('POST',`/api/bien/${propB.slug}/reserver`,{body:{
    buyer_name:'Test',buyer_email:'t@t.test',visit_date:'2099-07-01',visit_time:'10:00',
  }});
  const rejected=(r.status!==200)||r.json?.error;
  assert(rejected,'Unpublished property must reject booking (error body or non-200)');
  const noVisit=db.prepare('SELECT id FROM visits WHERE seller_id=? AND buyer_email=?').get(sellerIdB,'t@t.test');
  assert(!noVisit,'No visit must be created for unpublished property');
});

// SB-14 — Notifications cohérentes : comptage
await test('SB-14',async()=>{
  const unread=db.prepare("SELECT COUNT(*) n FROM notifications WHERE seller_id=? AND read_at IS NULL").get(sellerIdA);
  assert(unread.n>0,'Seller should have unread notifications');
  const r=await request('GET','/api/me',{cookie:cookieA});
  assert.equal(r.status,200);
  assert(Array.isArray(r.json?.notifications),'Notifications should be in /api/me');
});

// SB-15 — Créneau libéré après annulation : re-réservation possible
await test('SB-15',async()=>{
  const r=await request('POST',`/api/bien/${propA.slug}/reserver`,{body:{
    buyer_name:'Nouveau Acheteur',buyer_email:'nouveau@acheteur.test',buyer_phone:'',
    visit_date:'2099-06-11',visit_time:'09:00',
  }});
  assert.equal(r.status,200,'Cancelled slot should be re-bookable');
  assert.ok(r.json?.success);
});

// ── Résultats ─────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════');
console.log(`Seller/Buyer flow: ${passes} réussis, ${failures.length} échecs`);
failures.forEach(f=>console.error('  FAIL '+f.id+': '+f.err));
if(failures.length>0)process.exit(1);
})().catch(e=>{console.error('Fatal:',e.stack);process.exit(2);});
