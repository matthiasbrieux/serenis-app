'use strict';
// Runs server.js and its real middleware, login, session and document handlers.
// Transport is in memory: this sandbox does not allow listening TCP sockets.
// The application database and outbound services are never used.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),net=require('node:net'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-document-app-'));
process.chdir(root);
Object.assign(process.env,{
  NODE_ENV:'test',DATABASE_URL:path.join(temporary,'documents.db'),BACKUP_DIR:temporary,
  PHOTO_UPLOAD_DIR:path.join(temporary,'photos'),PRIVATE_UPLOAD_DIR:path.join(temporary,'documents'),
  JWT_SECRET:'fictitious-document-route-test-only',STRIPE_SECRET_KEY:'sk_test_fictitious_document_routes',
  RESEND_API_KEY:'',TWILIO_ACCOUNT_SID:'',TWILIO_AUTH_TOKEN:'',CLOUDINARY_URL:'',ANTHROPIC_API_KEY:'',
  SELLER_EMAIL:'',SELLER_PASSWORD:'',ADMIN_EMAIL:'',ADMIN_PASSWORD:''
});
global.fetch=async()=>{throw Error('Outbound network disabled in document integration test');};
const express=require('express');
const listen=express.application.listen;
let capture;
const ready=new Promise(resolve=>capture=resolve);
express.application.listen=function(){capture(this);return {};};
require(root+'/server');
const timer=setTimeout(()=>{console.error('FAIL application initialization timeout');process.exit(1)},10000);
function request(app,method,url,{cookie,body}={}){
  return new Promise((resolve,reject)=>{
    const req=new http.IncomingMessage(new net.Socket());
    Object.defineProperty(req.socket,'remoteAddress',{value:'127.0.0.1'});
    req.method=method;req.url=url;req.headers={host:'localhost:3000'};
    if(method==='POST')req.headers.origin='http://localhost:3000';
    if(cookie)req.headers.cookie=cookie;
    const payload=body?Buffer.from(JSON.stringify(body)):null;
    if(payload){req.headers['content-type']='application/json';req.headers['content-length']=String(payload.length);}
    const res=new http.ServerResponse(req),chunks=[];
    const timeout=setTimeout(()=>reject(Error('Request timeout '+url)),30000);
    res.write=function(chunk){if(chunk)chunks.push(Buffer.from(chunk));return true;};
    res.end=function(chunk){if(chunk)chunks.push(Buffer.from(chunk));clearTimeout(timeout);resolve({status:res.statusCode,headers:res.getHeaders(),bytes:Buffer.concat(chunks),text:Buffer.concat(chunks).toString()});this.emit('finish');return this;};
    app.handle(req,res,error=>{if(error){clearTimeout(timeout);reject(error);}else{res.statusCode=404;res.end('unhandled test request');}});
    if(payload)req.push(payload);req.push(null);
  });
}
(async()=>{
  let db;
  try{
    const app=await ready;clearTimeout(timer);express.application.listen=listen;
    db=require(root+'/database');
    const password='Fictitious-Document-Verification-2026!';
    db.prepare('INSERT INTO sellers(uuid,email,password,pack,contrat_signe) VALUES(?,?,?,?,?)').run('document-test','document-test@example.test',require('bcryptjs').hashSync(password,4),'autonome',1);
    const login=await request(app,'POST','/login',{body:{email:'document-test@example.test',password}});
    assert.equal(login.status,200);assert.equal(JSON.parse(login.text).success,true);
    const cookie=[].concat(login.headers['set-cookie']).find(value=>value.startsWith('token=')).split(';')[0];assert(cookie.startsWith('token='));
    console.log('PASS real POST /login -> 200, seller session cookie issued');
    // Chapter-six stable identities: exercise actual authenticated persistence
    // against this temporary database, never the application/customer database.
    const historical={'5_0':true,'5_1':true,'5_2':true};
    const saveHistorical=await request(app,'POST','/api/progress',{cookie,body:{key:'vpm_done_steps',value:JSON.stringify(historical)}});
    assert.equal(saveHistorical.status,200);
    const restored=await request(app,'GET','/api/progress',{cookie});
    assert.equal(restored.status,200);
    assert.deepEqual(JSON.parse(JSON.parse(restored.text).vpm_done_steps),historical);
    const withAction={...historical,'5_offre_action':true};
    const saveAction=await request(app,'POST','/api/progress',{cookie,body:{key:'vpm_done_steps',value:JSON.stringify(withAction)}});
    assert.equal(saveAction.status,200);
    const afterAction=await request(app,'GET','/api/progress',{cookie});
    assert.deepEqual(JSON.parse(JSON.parse(afterAction.text).vpm_done_steps),withAction);
    assert.equal((await request(app,'GET','/api/progress')).status,401);
    console.log('PASS real authenticated progress GET/POST: historical 5_0/5_1/5_2 retained, new 5_offre_action persisted independently');
    const formation=await request(app,'GET','/ma-formation',{cookie});
    assert.equal(formation.status,200);assert(formation.text.includes('formation-document-callout'));
    const {JSDOM}=require('jsdom');
    const dom=new JSDOM(formation.text);const document=dom.window.document;
    const start=formation.text.indexOf('const MODULES = ')+16;
    const modules=JSON.parse(formation.text.slice(start,formation.text.indexOf('\n];',start)+2));
    assert.equal(modules.length,6);
    for(const [slug,mi,si,title,fields,boxes] of [
      ['etat-civil',5,2,'3 — QUELLES INFORMATIONS TRANSMETTRE AU NOTAIRE ?',35,22],
      ['etat-des-lieux',5,3,'3 — RELEVEZ LES COMPTEURS',11,5]
    ]){
      const url='/ma-formation/documents/'+slug;
      const denied=await request(app,'GET',url);assert.equal(denied.status,302);assert.equal(denied.headers.location,'/login');
      const deniedPdf=await request(app,'GET',url+'/pdf');assert.equal(deniedPdf.status,302);assert.equal(deniedPdf.headers.location,'/login');
      const invalid=await request(app,'GET',url,{cookie:'token=invalid'});assert.equal(invalid.status,302);
      const response=await request(app,'GET',url,{cookie});
      assert.equal(response.status,200);assert(response.headers['content-type'].startsWith('text/html'));
      assert(response.headers['cache-control'].includes('no-store'));
      const page=new JSDOM(response.text).window.document;
      assert(page.querySelector(`a[href="/ma-formation#formation/lecon/6/${si+1}"]`),'Document return link follows the renamed lesson');
      const content=page.querySelector('.document-content');assert(content);
      assert.equal(content.querySelectorAll('.write-field').length,fields);
      assert.equal((content.textContent.match(/□/g)||[]).length,boxes);
      console.log(`PASS authenticated GET ${url} -> 200 text/html, ${fields} fields, ${boxes} checkboxes; anonymous/invalid sessions redirect to login`);
      const section=(modules[mi].steps[si].validatedFlow||modules[mi].steps[si].sections).find(section=>section.title===title);
      const callout=new JSDOM(section.body).window.document.querySelector('.formation-document-callout a');
      assert.equal(callout.getAttribute('href'),url);
      const clicked=await request(app,'GET',callout.getAttribute('href'),{cookie});assert.equal(clicked.status,200);assert.equal(clicked.text,response.text);
      // The original document collection must also use the canonical HTML route.
      const legacy=document.querySelector('.vdocs-doc-label[href="'+url+'"]');assert(legacy);
      assert(!formation.text.includes('href="/toolbox/formation/'+slug+'.pdf"'));
      console.log(`PASS chapter 6 lesson button and document collection -> same HTML ${url}`);
      const pdfLink=page.querySelector('.primary').getAttribute('href');assert.equal(pdfLink,url+'/pdf');
      // Real generation, not mocked. Report the genuine environment failure as unvalidated PDF.
      const pdf=await request(app,'GET',pdfLink,{cookie});
      if(pdf.status===200){
        assert(pdf.headers['content-type'].includes('application/pdf'));assert.equal(pdf.bytes.subarray(0,5).toString(),'%PDF-');
        assert(pdf.headers['content-disposition'].includes('attachment'));
        console.log(`PASS real generated PDF ${pdfLink} -> 200, ${pdf.bytes.length} bytes`);
      }else{
        assert.equal(pdf.status,503);assert(pdf.text.includes('temporairement indisponible'));
        console.log(`NOT VALIDATED real PDF ${pdfLink} -> 503, Chromium unavailable; no PDF success claimed`);
      }
      assert.equal(page.querySelectorAll('[data-print]').length,2);
    }
    const missing=await request(app,'GET','/ma-formation/documents/unknown',{cookie});assert.equal(missing.status,404);
    for(const asset of ['/css/formation-documents.css','/css/formation-home-messages.css','/js/formation-documents.js','/images/email-logo.png','/js/formation-home.js']){
      const result=await request(app,'GET',asset,{cookie});assert.equal(result.status,200);assert(result.bytes.length>0);console.log('PASS actual static asset '+asset+' -> 200');
    }
    console.log('PASS full server.js startup/middleware/routing/login integration (in-memory transport; no live TCP/browser claim)');
  }finally{
    clearTimeout(timer);express.application.listen=listen;if(db)db.close();fs.rmSync(temporary,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
