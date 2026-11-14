'use strict';
const fs=require('fs'),path=require('path'),Module=require('module'),http=require('http'),net=require('net'),assert=require('assert/strict'),os=require('os'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-invoice-'));process.on('exit',()=>fs.rmSync(out,{recursive:true,force:true}));process.chdir(root);
for(const k of ['CLOUDINARY_URL','RESEND_API_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'])delete process.env[k];
process.env.DATABASE_URL=path.join(out,'invoice-test.db');
process.env.JWT_SECRET='invoice-test-jwt-secret-32chars!!';
process.env.BASE_URL='https://test.example';
process.env.NODE_ENV='test';
process.env.STRIPE_SECRET_KEY='sk_test_MOCK';
process.env.LEGAL_SIREN='123456789';
process.env.LEGAL_RAISON_SOCIALE='VPM SAS';
process.env.LEGAL_FORME_JURIDIQUE='SAS';
process.env.LEGAL_ADRESSE_SIEGE='1 rue de la Paix, 59000 Lille';
process.env.LEGAL_RCS='Lille B 123 456 789';
process.env.LEGAL_TVA_STATUS='franchise';

// ── Mock externes ──────────────────────────────────────────────────────────
const emailCalls=[];
let legalReadyFlag=true;
// legalInfoReady must return a synchronous boolean — special-cased in the proxy trap
// so that admin.js captures a closure over `legalReadyFlag` rather than an async stub.
const mail=new Proxy({},{get:(_,name)=>{
  if(name==='legalInfoReady')return()=>legalReadyFlag;
  return async(...args)=>{emailCalls.push({fn:name,args});return true;};
}});

const realLoad=Module._load;
Module._load=function(name,parent){
  const f=(()=>{try{return Module._resolveFilename(name,parent)}catch{return''}})();
  if(f===root+'/services/email.js')return mail;
  if(f===root+'/services/twilio.js')return{sendSmsNotification:async()=>{},assignTwilioNumber:async()=>null};
  if(f===root+'/services/passwordCheck.js')return{isPasswordPwned:async()=>false};
  if(name==='stripe')return()=>({});
  if(['resend','cloudinary','@anthropic-ai/sdk'].includes(name))throw Error('External blocked: '+name);
  return realLoad.apply(this,arguments);
};
global.fetch=async()=>{throw Error('Network blocked in invoice tests')};

// ── Bootstrap ──────────────────────────────────────────────────────────────
const db=require(root+'/database.js');
const express=require(root+'/node_modules/express');
const bcrypt=require(root+'/node_modules/bcryptjs');
const cookieParser=require(root+'/node_modules/cookie-parser');
const adminRouter=require(root+'/routes/admin');

const app=express();
app.set('trust proxy',1);
app.use(cookieParser());
app.use(express.json());
app.use('/admin',adminRouter);

// ── Helpers ────────────────────────────────────────────────────────────────
let visitorId=1;
function request(method,url,{body,headers={},cookie}={}){return new Promise(resolve=>{
  const socket=new net.Socket();Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.'+(++visitorId)});
  const req=new http.IncomingMessage(socket);req.method=method;req.url=url;req.complete=true;
  req.headers={host:'test.example',...headers};
  if(cookie)req.headers.cookie=cookie;
  const payload=body!==undefined?Buffer.from(JSON.stringify(body)):null;
  if(payload){req.headers['content-type']='application/json';req.headers['content-length']=String(payload.length);}
  const res=new http.ServerResponse(req),chunks=[];let done=false;
  const to=setTimeout(()=>finish('timeout'),8000);
  function finish(){if(done)return;done=true;clearTimeout(to);const text=Buffer.concat(chunks).toString();let json;try{json=JSON.parse(text)}catch{}resolve({status:res.statusCode,text,json,headers:res.getHeaders()});}
  res.write=d=>{if(d)chunks.push(Buffer.from(d));return true;};
  res.end=function(d){if(d)chunks.push(Buffer.from(d));finish();this.emit('finish');return this;};
  app.handle(req,res,e=>{res.statusCode=e?500:404;res.end(e?JSON.stringify({error:e.message}):'not found');});
  if(payload)req.push(payload);req.push(null);
});}

// Créer un admin de test
const adminPasswordPlain='AdminTestPassword!2026';
const adminHashedPwd=bcrypt.hashSync(adminPasswordPlain,10);
const adminDbId=db.prepare("INSERT INTO admins (email, name, password) VALUES (?,?,?)").run('admin-inv@test.example','Admin Inv',adminHashedPwd).lastInsertRowid;

function adminCookie(){
  const admin=db.prepare('SELECT * FROM admins WHERE id=?').get(adminDbId);
  return 'admin_token='+require(root+'/services/session').sign(admin,'admin');
}

// ── Seeds ──────────────────────────────────────────────────────────────────
const {v4:uuidv4}=require(root+'/node_modules/uuid');
function seedSeller({email,paid=true,pack='serenite',invoiceNumber=null,paidAmount=null}){
  const hashed=bcrypt.hashSync('Password!2026',10);
  const r=db.prepare("INSERT INTO sellers (uuid,email,password,pack,paid_at,paid_amount,invoice_number,contrat_signe) VALUES (?,?,?,?,?,?,?,?)")
    .run(uuidv4(),email,hashed,pack,paid?new Date().toISOString():null,paidAmount,invoiceNumber,1);
  return r.lastInsertRowid;
}

function seedEmailSend({sellerId,subject,success,sentAt=null}){
  db.prepare("INSERT INTO email_sends (to_email,subject,seller_id,success,source,sent_at) VALUES (?,?,?,?,?,?)")
    .run('x@test.example',subject,sellerId,success?1:0,'auto',sentAt||new Date().toISOString());
}

const PAID_NO_INVOICE_ID   = seedSeller({email:'paid-no-inv@test.example', paidAmount:154700});
const PAID_WITH_INVOICE_ID = seedSeller({email:'paid-with-inv@test.example', invoiceNumber:'VPM-2026-00099-TEST1', paidAmount:99900, pack:'autonome'});
const PAID_FAILED_INV_ID   = seedSeller({email:'paid-failed-inv@test.example', paidAmount:154700});
const UNPAID_ID            = seedSeller({email:'unpaid@test.example', paid:false});

// Invoice sent successfully for PAID_WITH_INVOICE_ID (> 24h ago → no 24h guard)
seedEmailSend({sellerId:PAID_WITH_INVOICE_ID, subject:'🧾 Facture Vendu Par Moi — 999,00 € TTC', success:true, sentAt:new Date(Date.now()-48*3600*1000).toISOString()});
// Failed invoice for PAID_FAILED_INV_ID
seedEmailSend({sellerId:PAID_FAILED_INV_ID, subject:'🧾 Facture Vendu Par Moi — 1 547,00 € TTC', success:false, sentAt:new Date(Date.now()-2*3600*1000).toISOString()});

// ── Tests ──────────────────────────────────────────────────────────────────
let passes=0,failures=[];
async function test(id,fn){try{await fn();passes++;console.log('PASS '+id);}catch(e){failures.push({id,err:e.message});console.error('FAIL '+id+': '+e.message);}}

(async()=>{

// A-I-01 — Accès sans token admin → redirect 302 (GET invoice-status)
await test('A-I-01',async()=>{
  const r=await request('GET',`/admin/api/crm/${PAID_NO_INVOICE_ID}/invoice-status`);
  assert.equal(r.status,302,'Must redirect without admin token');
});

// A-I-02 — Accès sans token admin → redirect 302 (POST resend-invoice)
await test('A-I-02',async()=>{
  const r=await request('POST',`/admin/api/crm/${PAID_NO_INVOICE_ID}/resend-invoice`,{body:{}});
  assert.equal(r.status,302,'Must redirect without admin token');
});

// A-I-03 — Statut : vendeur inconnu → 404
await test('A-I-03',async()=>{
  const r=await request('GET','/admin/api/crm/999999/invoice-status',{cookie:adminCookie()});
  assert.equal(r.status,404,'Unknown seller must return 404');
});

// A-I-04 — Statut : vendeur non payant → paid:false
await test('A-I-04',async()=>{
  const r=await request('GET',`/admin/api/crm/${UNPAID_ID}/invoice-status`,{cookie:adminCookie()});
  assert.equal(r.status,200,'Must return 200 for unpaid seller');
  assert.equal(r.json.paid,false,'paid must be false');
  assert(!r.json.paid_at,'paid_at must be null');
});

// A-I-05 — Statut : vendeur payant sans facture → last_invoice:null
await test('A-I-05',async()=>{
  const r=await request('GET',`/admin/api/crm/${PAID_NO_INVOICE_ID}/invoice-status`,{cookie:adminCookie()});
  assert.equal(r.status,200);
  assert.equal(r.json.paid,true,'paid must be true');
  assert(!r.json.last_email,'last_email must be null when no email sent');
  assert.equal(r.json.legal_ready,true,'legal_ready must reflect LEGAL vars');
});

// A-I-06 — Statut : vendeur avec facture réussie → last_invoice.success:true
await test('A-I-06',async()=>{
  const r=await request('GET',`/admin/api/crm/${PAID_WITH_INVOICE_ID}/invoice-status`,{cookie:adminCookie()});
  assert.equal(r.status,200);
  assert.equal(r.json.last_email?.success,1,'last_email.success must be 1');
  assert.equal(r.json.invoice_number,'VPM-2026-00099-TEST1','Stored invoice number must be returned');
});

// A-I-07 — Statut : vendeur avec facture échouée → last_invoice.success:false
await test('A-I-07',async()=>{
  const r=await request('GET',`/admin/api/crm/${PAID_FAILED_INV_ID}/invoice-status`,{cookie:adminCookie()});
  assert.equal(r.status,200);
  assert.equal(r.json.last_email?.success,0,'last_email.success must be 0 on failed send');
});

// A-I-08 — Renvoi : vendeur non payant → 400
await test('A-I-08',async()=>{
  const r=await request('POST',`/admin/api/crm/${UNPAID_ID}/resend-invoice`,{body:{},cookie:adminCookie()});
  assert.equal(r.status,400,'Unpaid seller must return 400');
  assert(r.json.error,'Error message must be present');
});

// A-I-09 — Renvoi : LEGAL vars absentes → 503
await test('A-I-09',async()=>{
  legalReadyFlag=false;
  try{
    const r=await request('POST',`/admin/api/crm/${PAID_NO_INVOICE_ID}/resend-invoice`,{body:{},cookie:adminCookie()});
    assert.equal(r.status,503,'Missing LEGAL vars must return 503');
    assert(/LEGAL_SIREN/i.test(r.json.error)||/mentions légales/i.test(r.json.error),'Error must mention legal config');
  }finally{legalReadyFlag=true;}
});

// A-I-10 — Renvoi réussi : numéro généré et persisté, email envoyé, cohérence DB↔email
await test('A-I-10',async()=>{
  emailCalls.length=0;
  const r=await request('POST',`/admin/api/crm/${PAID_NO_INVOICE_ID}/resend-invoice`,{body:{},cookie:adminCookie()});
  assert.equal(r.status,200,'Resend must return 200');
  assert(r.json.ok,'ok must be true');
  assert(r.json.invoiceNumber,'Invoice number must be returned');
  assert(/^VPM-\d{4}-\d{5}$/.test(r.json.invoiceNumber),'Invoice number format must match VPM-YYYY-NNNNN');
  const inv=emailCalls.find(c=>c.fn==='sendInvoiceEmail');
  assert(inv,'sendInvoiceEmail must be called');
  assert.equal(inv.args[0].invoiceNumber,r.json.invoiceNumber,'Email must use same invoice number as response');
  // Vérifier que le numéro est persisté en base
  const seller=db.prepare('SELECT invoice_number FROM sellers WHERE id=?').get(PAID_NO_INVOICE_ID);
  assert.equal(seller.invoice_number,r.json.invoiceNumber,'Invoice number must be stored in DB');
});

// A-I-11 — Stabilité : deuxième renvoi retourne le même numéro (pas de doublon)
await test('A-I-11',async()=>{
  emailCalls.length=0;
  const r=await request('POST',`/admin/api/crm/${PAID_WITH_INVOICE_ID}/resend-invoice`,{body:{},cookie:adminCookie()});
  assert.equal(r.status,200,'Second resend must return 200');
  assert.equal(r.json.invoiceNumber,'VPM-2026-00099-TEST1','Resend must reuse existing invoice number, not generate a new one');
  const inv=emailCalls.find(c=>c.fn==='sendInvoiceEmail');
  assert.equal(inv.args[0].invoiceNumber,'VPM-2026-00099-TEST1','Email invoice number must match stored number');
});

// A-I-12 — Garde 24h : renvoi récent → 409
await test('A-I-12',async()=>{
  // Seed a recent successful send for PAID_NO_INVOICE_ID (which was just resent in A-I-10)
  const seller=db.prepare('SELECT invoice_number FROM sellers WHERE id=?').get(PAID_NO_INVOICE_ID);
  db.prepare("INSERT INTO email_sends (to_email,subject,seller_id,success,source,sent_at) VALUES (?,?,?,?,?,?)")
    .run('x@test.example',`🧾 Facture Vendu Par Moi — 1 547,00 € TTC`,PAID_NO_INVOICE_ID,1,'auto',new Date().toISOString());
  const r=await request('POST',`/admin/api/crm/${PAID_NO_INVOICE_ID}/resend-invoice`,{body:{},cookie:adminCookie()});
  assert.equal(r.status,409,'Recent successful send must return 409');
  assert(r.json.sent_at,'sent_at must be in 409 response');
});

// A-I-13 — force:true contourne la garde 24h
await test('A-I-13',async()=>{
  emailCalls.length=0;
  const r=await request('POST',`/admin/api/crm/${PAID_NO_INVOICE_ID}/resend-invoice`,{body:{force:true},cookie:adminCookie()});
  assert.equal(r.status,200,'force:true must bypass 24h guard');
  assert(r.json.ok,'ok must be true with force');
  const inv=emailCalls.find(c=>c.fn==='sendInvoiceEmail');
  assert(inv,'sendInvoiceEmail must be called with force:true');
});

// A-I-14 — Numéro inconnu → 404
await test('A-I-14',async()=>{
  const r=await request('POST','/admin/api/crm/999999/resend-invoice',{body:{},cookie:adminCookie()});
  assert.equal(r.status,404,'Unknown seller must return 404');
});

})().then(()=>{
  console.log(`\n${passes} passed, ${failures.length} failed`);
  if(failures.length){failures.forEach(f=>console.error('  FAIL '+f.id+': '+f.err));process.exit(1);}
});
