'use strict';
const fs=require('fs'),path=require('path'),Module=require('module'),http=require('http'),net=require('net'),assert=require('assert/strict'),os=require('os'),crypto=require('crypto');

const root=path.resolve(__dirname,'../..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-invoice-'));
process.on('exit',()=>fs.rmSync(out,{recursive:true,force:true}));
process.chdir(root);

for(const k of ['CLOUDINARY_URL','RESEND_API_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'])delete process.env[k];
process.env.DATABASE_URL=path.join(out,'invoice-test.db');
process.env.JWT_SECRET='invoice-test-jwt-secret-32chars-min';
process.env.BASE_URL='https://test.example';
process.env.NODE_ENV='test';
process.env.STRIPE_SECRET_KEY='sk_test_MOCK';
process.env.STRIPE_WEBHOOK_SECRET='whsec_MOCK';
process.env.LEGAL_SIREN='123456789';
process.env.LEGAL_RAISON_SOCIALE='VPM SAS';
process.env.LEGAL_FORME_JURIDIQUE='SAS';
process.env.LEGAL_ADRESSE_SIEGE='1 rue de la Paix, 59000 Lille';
process.env.LEGAL_RCS='Lille B 123 456 789';
// TVA franchise par défaut (ne suppose pas 20%)
process.env.LEGAL_TVA_STATUS='franchise';

// ── Capteurs ──────────────────────────────────────────────────
const emailCalls=[];
let legalReadyFlag=true;
const mail=new Proxy({},{get:(_,name)=>{
  if(name==='legalInfoReady')return()=>legalReadyFlag;
  return async(...args)=>{emailCalls.push({fn:name,args});return true;};
}});
const sms={sendSmsNotification:async()=>{},assignTwilioNumber:async()=>null};

const realLoad=Module._load;
Module._load=function(name,parent){
  const f=(()=>{try{return Module._resolveFilename(name,parent)}catch{return''}})();
  if(f===root+'/services/email.js')return mail;
  if(f===root+'/services/twilio.js')return sms;
  if(f===root+'/services/passwordCheck.js')return{isPasswordPwned:async()=>false};
  if(name==='stripe')return()=>({
    checkout:{sessions:{create:async()=>({id:'cs_test_MOCK',url:'https://stripe.test/pay'}),retrieve:async()=>({payment_status:'paid',metadata:{}})}},
    webhooks:{constructEvent:(body)=>JSON.parse(body.toString())},
  });
  if(['resend','cloudinary','@anthropic-ai/sdk'].includes(name))throw Error('External blocked: '+name);
  return realLoad.apply(this,arguments);
};
global.fetch=async()=>{throw Error('Network blocked in invoice tests')};

// ── Bootstrap ────────────────────────────────────────────────
const db=require(root+'/database.js');
const express=require(root+'/node_modules/express');
const cookieParser=require(root+'/node_modules/cookie-parser');
const {issueInvoice,getArchivedInvoice,allocateInvoiceNumber,computeTax,generatePdf,initSequenceFromExisting}=require(root+'/services/invoice');
const {router:paymentRouter,stripeWebhook}=require(root+'/routes/payment');
const adminRouter=require(root+'/routes/admin');
const sellerRouter=require(root+'/routes/seller');

const app=express();
app.set('trust proxy',1);
app.use(cookieParser());
app.use('/webhook/stripe',express.raw({type:'application/json'}),stripeWebhook);
app.use(express.json());
app.use(require(root+'/middleware/csrf'));
app.use(paymentRouter);
app.use('/admin',adminRouter);
app.use(sellerRouter);
app.use((err,req,res,next)=>{res.status(500).json({error:err.message});});

let visitorId=100;
function request(method,url,{body,raw,contentType,headers={},cookie}={}){return new Promise(resolve=>{
  const socket=new net.Socket();Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.'+(++visitorId)});
  const req=new http.IncomingMessage(socket);req.method=method;req.url=url;req.complete=true;
  req.headers={host:'test.example',origin:'https://test.example',...headers};
  if(cookie)req.headers.cookie=cookie;
  const payload=raw||(body!==undefined?Buffer.from(JSON.stringify(body)):null);
  if(payload){req.headers['content-type']=contentType||'application/json';req.headers['content-length']=String(payload.length);}
  const res=new http.ServerResponse(req),chunks=[];let done=false;
  const to=setTimeout(()=>finish('timeout'),10000);
  function finish(err){if(done)return;done=true;clearTimeout(to);const text=Buffer.concat(chunks).toString();let json;try{json=JSON.parse(text)}catch{}resolve({status:res.statusCode,text,json,err,headers:res.getHeaders?.()??{}});}
  res.write=d=>{if(d)chunks.push(Buffer.from(d));return true;};
  res.end=function(d){if(d)chunks.push(Buffer.from(d));finish();this.emit('finish');return this;};
  app.handle(req,res,e=>{res.statusCode=e?500:404;res.end(e?JSON.stringify({error:e.message}):'not found');});
  if(payload)req.push(payload);req.push(null);
});}

function sellerCookie(id){return 'token='+require(root+'/services/session').sign(db.prepare('SELECT * FROM sellers WHERE id=?').get(id),'seller');}
function adminCookie(){
  // Créer un admin si nécessaire
  const bcrypt=require(root+'/node_modules/bcryptjs');
  let admin=db.prepare('SELECT * FROM admins WHERE email=?').get('admin@test.example');
  if(!admin){db.prepare('INSERT INTO admins(email,name,password) VALUES(?,?,?)').run('admin@test.example','Test Admin',bcrypt.hashSync('adminpass',10));admin=db.prepare('SELECT * FROM admins WHERE email=?').get('admin@test.example');}
  return 'admin_token='+require(root+'/services/session').sign(admin,'admin');
}

// ── Helpers ───────────────────────────────────────────────────
function createPaidSeller(email,pack='serenite',invoiceNum=null){
  const bcrypt=require(root+'/node_modules/bcryptjs');
  const {v4:uuidv4}=require('uuid');
  db.prepare('INSERT OR IGNORE INTO sellers(uuid,email,password,pack,paid_at,first_name,last_name,invoice_number,contrat_signe) VALUES(?,?,?,?,CURRENT_TIMESTAMP,?,?,?,1)')
    .run(uuidv4(),email,bcrypt.hashSync('pass',10),pack,'Prénom','Nom',invoiceNum);
  return db.prepare('SELECT * FROM sellers WHERE email=?').get(email);
}

let passes=0,failures=[];
async function test(id,fn){try{await fn();passes++;console.log('PASS '+id);}catch(e){failures.push({id,err:e.message});console.error('FAIL '+id+': '+e.message);}}

// ═══════════════════════════════════════════════════════════════════
(async()=>{

// I-01 — allocateInvoiceNumber : numéros uniques et séquentiels
await test('I-01',async()=>{
  const year=2026;
  const nums=[];
  for(let i=0;i<10;i++){const {number}=allocateInvoiceNumber(db,year);nums.push(number);}
  const unique=new Set(nums);
  assert.equal(unique.size,10,'Tous les numéros doivent être uniques');
  // Vérifier le format VPM-2026-NNNNN
  for(const n of nums)assert.match(n,/^VPM-2026-\d{5}$/,'Format numéro invalide : '+n);
  // Vérifier la continuité
  const seqs=nums.map(n=>parseInt(n.split('-')[2],10));
  for(let i=1;i<seqs.length;i++)assert.equal(seqs[i],seqs[i-1]+1,'Séquence non continue');
});

// I-02 — allocateInvoiceNumber : années indépendantes
await test('I-02',async()=>{
  const a=allocateInvoiceNumber(db,2025);
  const b=allocateInvoiceNumber(db,2027);
  assert.equal(a.number,'VPM-2025-00001','Premier de 2025');
  assert.equal(b.number,'VPM-2027-00001','Premier de 2027');
});

// I-03 — computeTax : franchise explicite (statut configuré)
await test('I-03',async()=>{
  const {htCents,tvaCents,tvaRate,mention}=computeTax(154700);
  assert.equal(htCents,154700,'HT = TTC en franchise');
  assert.equal(tvaCents,0,'Pas de TVA en franchise');
  assert.equal(tvaRate,null,'Taux TVA null en franchise');
  assert.match(mention,/293 B/,'Mention art. 293 B attendue');
});

// I-04 — computeTax : TVA 20%
await test('I-04',async()=>{
  process.env.LEGAL_TVA_STATUS='taux_20';
  const {htCents,tvaCents,tvaRate}=computeTax(154700);
  process.env.LEGAL_TVA_STATUS='franchise';
  assert.equal(tvaRate,20,'Taux 20%');
  assert.equal(htCents+tvaCents,154700,'HT+TVA=TTC');
  assert(Math.abs(htCents-128917)<=1,'HT ≈ 1289,17 €');
});

// I-05 — generatePdf : buffer non vide, magic bytes %PDF
await test('I-05',async()=>{
  const seller={id:999,email:'pdf@test.example',first_name:'Alice',last_name:'Test',pack:'serenite'};
  const buf=await generatePdf({invoiceNumber:'VPM-2026-00099',date:new Date(),seller,amountTTC:154700,pack:'serenite'});
  assert(Buffer.isBuffer(buf),'Doit être un Buffer');
  assert(buf.length>1000,'PDF non vide (>1KB)');
  assert.equal(buf.slice(0,4).toString(),'%PDF','Magic bytes PDF');
});

// I-06 — generatePdf : contient le numéro de facture dans le PDF
await test('I-06',async()=>{
  const seller={id:998,email:'pdfcontent@test.example',first_name:'Bob',last_name:'Martin',pack:'autonome'};
  const invoiceNumber='VPM-2026-00098';
  const buf=await generatePdf({invoiceNumber,date:new Date('2026-06-01'),seller,amountTTC:99900,pack:'autonome'});
  const text=buf.toString('latin1');
  assert(text.includes('VPM-2026-00098'),'Le numéro de facture doit apparaître dans le PDF');
});

// I-07 — issueInvoice : crée une facture, stocke PDF + hash
await test('I-07',async()=>{
  const seller=createPaidSeller('issue@test.example','serenite');
  const record=await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  assert(record,'Record facture attendu');
  assert(record.invoice_number,'invoice_number manquant');
  assert.match(record.invoice_number,/^VPM-\d{4}-\d{5}$/,'Format numéro');
  const pdf=Buffer.isBuffer(record.pdf_data)?record.pdf_data:Buffer.from(record.pdf_data);
  assert(pdf.length>0,'PDF archivé non vide');
  assert.equal(pdf.slice(0,4).toString(),'%PDF','Magic bytes dans archive');
  assert(record.pdf_hash,'Hash PDF attendu');
  assert.equal(record.pdf_hash.length,64,'SHA-256 = 64 caractères hex');
  // Vérifier la cohérence hash
  const expectedHash=crypto.createHash('sha256').update(pdf).digest('hex');
  assert.equal(record.pdf_hash,expectedHash,'Hash calculé correspond au PDF');
});

// I-08 — issueInvoice : idempotence (second appel retourne le même enregistrement)
await test('I-08',async()=>{
  const seller=createPaidSeller('idempotent@test.example','serenite');
  const r1=await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  const r2=await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  assert.equal(r1.invoice_number,r2.invoice_number,'Même numéro de facture');
  assert.equal(r1.pdf_hash,r2.pdf_hash,'Hash identique — PDF original préservé');
  const count=db.prepare('SELECT COUNT(*) as c FROM invoices WHERE seller_id=?').get(seller.id);
  assert.equal(count.c,1,'Une seule facture en base');
});

// I-09 — PDF original préservé après resend admin (hash stable)
await test('I-09',async()=>{
  const seller=createPaidSeller('hashstable@test.example','serenite');
  // Première émission
  const r1=await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  const hash1=r1.pdf_hash;
  // Récupération via getArchivedInvoice
  const archived=getArchivedInvoice(db,seller.id);
  const hash2=crypto.createHash('sha256').update(Buffer.from(archived.pdf_data)).digest('hex');
  assert.equal(hash1,hash2,'Hash stable après récupération');
  // Simuler un deuxième appel issueInvoice (ne regénère pas)
  const r3=await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  assert.equal(r3.pdf_hash,hash1,'Hash inchangé sur second appel');
});

// I-10 — Route admin GET invoice-status : retourne infos correctes
await test('I-10',async()=>{
  const seller=createPaidSeller('adminstatus@test.example','serenite');
  await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  const r=await request('GET',`/admin/api/crm/${seller.id}/invoice-status`,{cookie:adminCookie()});
  assert.equal(r.status,200,'Status 200');
  assert.equal(r.json?.paid,true,'paid=true');
  assert(r.json?.invoice_number,'invoice_number présent');
  assert.equal(r.json?.pdf_archived,true,'pdf_archived=true');
  assert(r.json?.pdf_hash,'pdf_hash présent');
  assert.equal(r.json?.legal_ready,true,'legal_ready=true');
});

// I-11 — Route admin GET invoice-status : non authentifié → 302
await test('I-11',async()=>{
  const seller=createPaidSeller('statusnoauth@test.example');
  const r=await request('GET',`/admin/api/crm/${seller.id}/invoice-status`);
  assert.equal(r.status,302,'Non authentifié → redirect 302');
});

// I-12 — Route admin GET invoice-pdf : retourne un PDF valide
await test('I-12',async()=>{
  const seller=createPaidSeller('pdfdownload@test.example','serenite');
  await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  const r=await request('GET',`/admin/api/crm/${seller.id}/invoice-pdf`,{cookie:adminCookie()});
  assert.equal(r.status,200,'Status 200');
  const buf=Buffer.from(r.text,'binary');
  assert.equal(buf.slice(0,4).toString(),'%PDF','Le PDF retourné commence par %PDF');
});

// I-13 — Route admin resend : envoie le PDF original, retourne invoice_number et pdf_hash
await test('I-13',async()=>{
  emailCalls.length=0;
  const seller=createPaidSeller('resend@test.example','serenite');
  const r=await request('POST',`/admin/api/crm/${seller.id}/resend-invoice`,{body:{force:true},cookie:adminCookie()});
  assert.equal(r.status,200,'Status 200');
  assert.equal(r.json?.ok,true,'ok=true');
  assert(r.json?.invoiceNumber,'invoiceNumber dans la réponse');
  assert(r.json?.pdf_hash,'pdf_hash dans la réponse');
  const invoiceCall=emailCalls.find(c=>c.fn==='sendInvoiceEmail');
  assert(invoiceCall,'sendInvoiceEmail appelé');
  // Vérifier que pdfBuffer est un Buffer non vide
  const pdfBuf=invoiceCall?.args?.[0]?.pdfBuffer;
  assert(Buffer.isBuffer(pdfBuf)||pdfBuf instanceof Uint8Array,'pdfBuffer transmis au sendInvoiceEmail');
  assert(pdfBuf.length>0,'pdfBuffer non vide');
});

// I-14 — Resend admin : garde 24h → 409 sans force
await test('I-14',async()=>{
  const seller=createPaidSeller('guard24h@test.example','autonome');
  await issueInvoice(db,seller,{amountTTC:99900,pack:'autonome',date:new Date()});
  // Injecter un envoi réussi récent
  db.prepare("INSERT INTO email_sends(to_email,subject,seller_id,success,sent_at) VALUES(?,?,?,1,datetime('now'))")
    .run(seller.email,'🧾 Facture Vendu Par Moi — 999,00 € TTC',seller.id);
  const r=await request('POST',`/admin/api/crm/${seller.id}/resend-invoice`,{body:{},cookie:adminCookie()});
  assert.equal(r.status,409,'409 dans la garde 24h sans force');
  // Avec force=true → passe
  const r2=await request('POST',`/admin/api/crm/${seller.id}/resend-invoice`,{body:{force:true},cookie:adminCookie()});
  assert.equal(r2.status,200,'force:true contourne la garde 24h');
});

// I-15 — Resend admin : vendeur non payé → 400
await test('I-15',async()=>{
  const {v4:uuidv4}=require('uuid');
  const bcrypt=require(root+'/node_modules/bcryptjs');
  db.prepare('INSERT INTO sellers(uuid,email,password,pack) VALUES(?,?,?,?)').run(uuidv4(),'unpaid2@test.example',bcrypt.hashSync('x',10),'serenite');
  const seller=db.prepare('SELECT * FROM sellers WHERE email=?').get('unpaid2@test.example');
  const r=await request('POST',`/admin/api/crm/${seller.id}/resend-invoice`,{body:{},cookie:adminCookie()});
  assert.equal(r.status,400,'Vendeur non payé → 400');
});

// I-16 — Resend admin : legalInfoReady=false → 503
await test('I-16',async()=>{
  legalReadyFlag=false;
  try{
    const seller=createPaidSeller('legalblock@test.example','serenite');
    const r=await request('POST',`/admin/api/crm/${seller.id}/resend-invoice`,{body:{force:true},cookie:adminCookie()});
    assert.equal(r.status,503,'Pas de mentions légales → 503');
  }finally{legalReadyFlag=true;}
});

// I-17 — Route vendeur /api/invoice-status : connecté → retourne infos
await test('I-17',async()=>{
  const seller=createPaidSeller('sellerstatus@test.example','serenite');
  await issueInvoice(db,seller,{amountTTC:154700,pack:'serenite',date:new Date()});
  const r=await request('GET','/api/invoice-status',{cookie:sellerCookie(seller.id)});
  assert.equal(r.status,200,'Status 200');
  assert.equal(r.json?.available,true,'available=true');
  assert(r.json?.invoice_number,'invoice_number dans la réponse');
});

// I-18 — Route vendeur /api/invoice : retourne PDF valide
await test('I-18',async()=>{
  const seller=createPaidSeller('sellerdownload@test.example','autonome');
  await issueInvoice(db,seller,{amountTTC:99900,pack:'autonome',date:new Date()});
  const r=await request('GET','/api/invoice',{cookie:sellerCookie(seller.id)});
  assert.equal(r.status,200,'Status 200');
  const buf=Buffer.from(r.text,'binary');
  assert.equal(buf.slice(0,4).toString(),'%PDF','PDF valide retourné');
});

// I-19 — Route vendeur /api/invoice : non authentifié → 401
await test('I-19',async()=>{
  const r=await request('GET','/api/invoice');
  // requireAuth sur les routes /api/* retourne 401 (pas de redirect)
  assert([401,302].includes(r.status),'Non authentifié → 401 ou 302, got '+r.status);
});

// I-20 — Route vendeur /api/invoice : vendeur sans facture → 404
await test('I-20',async()=>{
  const seller=createPaidSeller('noinvoice@test.example','serenite');
  const r=await request('GET','/api/invoice',{cookie:sellerCookie(seller.id)});
  assert.equal(r.status,404,'Pas de facture → 404');
});

// I-21 — Isolation : vendeur A ne peut pas accéder à la facture de vendeur B
// (l'endpoint retourne uniquement la facture du req.seller connecté)
await test('I-21',async()=>{
  const sellerA=createPaidSeller('isolation-a@test.example','serenite');
  const sellerB=createPaidSeller('isolation-b@test.example','autonome');
  await issueInvoice(db,sellerA,{amountTTC:154700,pack:'serenite',date:new Date()});
  await issueInvoice(db,sellerB,{amountTTC:99900,pack:'autonome',date:new Date()});
  // Connecté en tant que B, récupérer le statut : ne doit pas voir la facture de A
  const r=await request('GET','/api/invoice-status',{cookie:sellerCookie(sellerB.id)});
  assert.equal(r.status,200,'Status 200');
  const archivedB=getArchivedInvoice(db,sellerB.id);
  assert.equal(r.json?.invoice_number,archivedB.invoice_number,'Retourne la facture de B, pas de A');
});

// I-22 — Numéros uniques sur 50 allocations consécutives (concurrent dans le même process)
await test('I-22',async()=>{
  const year=2099;
  const promises=Array.from({length:50},()=>new Promise(resolve=>{
    // better-sqlite3 est synchrone, donc les appels sont sérialisés dans le même thread
    resolve(allocateInvoiceNumber(db,year));
  }));
  const results=await Promise.all(promises);
  const numbers=results.map(r=>r.number);
  const unique=new Set(numbers);
  assert.equal(unique.size,50,'50 numéros uniques');
  const seqs=results.map(r=>r.seq).sort((a,b)=>a-b);
  assert.equal(seqs[0],1,'Commence à 1');
  assert.equal(seqs[49],50,'Termine à 50');
});

// I-23 — initSequenceFromExisting : reprend à la suite des factures existantes
await test('I-23',async()=>{
  // Créer un vendeur avec un numéro legacy (ancien format ou nouveau)
  const {v4:uuidv4}=require('uuid');
  const bcrypt=require(root+'/node_modules/bcryptjs');
  db.prepare('INSERT INTO sellers(uuid,email,password,pack,paid_at,invoice_number) VALUES(?,?,?,?,CURRENT_TIMESTAMP,?)')
    .run(uuidv4(),'legacy@test.example',bcrypt.hashSync('x',10),'serenite','VPM-2024-00042');
  // Réinitialiser le compteur 2024
  db.prepare('DELETE FROM invoice_sequences WHERE year=2024').run();
  initSequenceFromExisting(db);
  const row=db.prepare('SELECT next_seq FROM invoice_sequences WHERE year=2024').get();
  assert(row,'Séquence 2024 créée');
  assert.equal(row.next_seq,43,'Reprend à 43 après le numéro 42 existant');
});

// I-24 — LEGAL_TVA_STATUS absent : computeTax lève une erreur
await test('I-24',async()=>{
  const saved=process.env.LEGAL_TVA_STATUS;
  delete process.env.LEGAL_TVA_STATUS;
  let threw=false;
  try{computeTax(154700);}catch(e){threw=true;assert(/LEGAL_TVA_STATUS/i.test(e.message),'Message doit mentionner LEGAL_TVA_STATUS');}
  process.env.LEGAL_TVA_STATUS=saved;
  assert(threw,'computeTax doit lever une erreur si LEGAL_TVA_STATUS absent');
});

// I-25 — LEGAL_TVA_STATUS invalide : computeTax lève une erreur
await test('I-25',async()=>{
  const saved=process.env.LEGAL_TVA_STATUS;
  process.env.LEGAL_TVA_STATUS='taux_inconnu';
  let threw=false;
  try{computeTax(154700);}catch(e){threw=true;}
  process.env.LEGAL_TVA_STATUS=saved;
  assert(threw,'computeTax doit lever une erreur si LEGAL_TVA_STATUS invalide');
});

// ── Résultats ─────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════');
console.log(`Système facturation : ${passes} réussis, ${failures.length} échecs`);
failures.forEach(f=>console.error('  FAIL '+f.id+': '+f.err));
if(failures.length>0)process.exit(1);
})().catch(e=>{console.error('Fatal:',e.stack);process.exit(2);});
