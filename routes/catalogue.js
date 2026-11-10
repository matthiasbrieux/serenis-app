'use strict';
// Catalogue raccordé à la fiche existante. Activation limitée au serveur local.
// Aucun transport e-mail/SMS, aucune publication automatique, aucune route de session de test.
const express=require('express'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),sharp=require('sharp');
const {createCatalogue,fail}=require('../services/catalogue');
function createRouter({db,requireAuth,enabled=process.env.NODE_ENV!=='production',mediaRoot}={}){
 const router=express.Router(),sessions=new Map(),rates=new Map(),pending=new Map();let catalogue;
 const cache=mediaRoot||fs.mkdtempSync(path.join(os.tmpdir(),'vpm-catalogue-media-'));
 fs.mkdirSync(cache,{recursive:true,mode:0o700});
 const prefixes=['/api/catalogue','/media/owner','/media/catalogue'];
 router.use((q,s,n)=>{if(!prefixes.some(p=>q.path===p||q.path.startsWith(p+'/')))return n();s.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'});const host=q.hostname;const remote=q.socket.remoteAddress;const local=['localhost','127.0.0.1','::1'].includes(host)&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote);if(!enabled||!local)return s.status(403).json({error:'Le catalogue connecté est disponible uniquement sur cette application locale. Aucune activation en ligne.'});catalogue ||=createCatalogue(db);n()});
 function csrf(q,s,n){if(q.get('origin')!==q.protocol+'://'+q.get('host')||q.get('sec-fetch-site')==='cross-site')return s.status(403).json({error:'Origine du formulaire refusée.'});const entry=sessions.get(q.cookies?.vpm_catalogue_browser);if(!entry||entry.expires<Date.now()||q.get('X-Local-CSRF')!==entry.token)return s.status(403).json({error:'Rechargez la page avant de valider votre demande.'});n()}
 function limit(q,s,n){const key=q.socket.remoteAddress,now=Date.now();let entry=rates.get(key);if(!entry||entry.until<now){entry={count:0,until:now+15*60e3};rates.set(key,entry)}if(++entry.count>12)return s.status(429).json({error:'Trop de demandes. Réessayez ultérieurement.'});n()}
 const wrap=fn=>(q,s,n)=>Promise.resolve().then(()=>fn(q,s)).catch(n);
 router.get('/api/catalogue/session',(q,s)=>{let id=q.cookies?.vpm_catalogue_browser,entry=sessions.get(id);if(!entry||entry.expires<Date.now()){id=crypto.randomBytes(24).toString('hex');entry={token:crypto.randomBytes(32).toString('hex'),expires:Date.now()+8*3600e3};sessions.set(id,entry);s.cookie('vpm_catalogue_browser',id,{httpOnly:true,sameSite:'strict',secure:q.secure,path:'/',maxAge:8*3600e3})}s.json({csrf:entry.token,local:true})});
 router.get('/api/catalogue/owner',requireAuth,wrap((q,s)=>s.json(catalogue.ownerState(q.seller.id))));
 router.get('/api/catalogue/owner/photos',requireAuth,wrap((q,s)=>s.json({photos:catalogue.ownerPhotos(q.seller.id)})));
 router.put('/api/catalogue/owner/selection',requireAuth,csrf,wrap((q,s)=>s.json(catalogue.saveSelection(q.seller.id,q.body.photoIds))));
 router.post('/api/catalogue/owner/preview',requireAuth,csrf,wrap((q,s)=>s.json(catalogue.preview(q.seller.id))));
 router.post('/api/catalogue/owner/publish',requireAuth,csrf,wrap((q,s)=>s.json(catalogue.publish(q.seller.id,q.body))));
 router.post('/api/catalogue/owner/withdraw',requireAuth,csrf,wrap((q,s)=>s.json(catalogue.withdraw(q.seller.id,q.body))));
 router.get('/api/catalogue/owner/requests',requireAuth,wrap((q,s)=>s.json(catalogue.requests(q.seller.id))));
 router.post('/api/catalogue/owner/notifications/:id/read',requireAuth,csrf,wrap((q,s)=>s.json(catalogue.markRead(q.seller.id,+q.params.id))));
 router.get('/api/catalogue/biens',wrap((q,s)=>s.json(catalogue.list(q.query))));
 router.get('/api/catalogue/biens/:id',wrap((q,s)=>s.json(catalogue.publicDetail(q.params.id))));
 router.post('/api/catalogue/biens/:id/demandes',csrf,limit,wrap((q,s)=>{const result=catalogue.requestContact(q.params.id,q.body,q.get('Idempotency-Key'));s.status(result.duplicate?200:201).json(result)}));
 async function image(photo,width){const key=photo.id+'-'+crypto.createHash('sha256').update(photo.url).digest('hex').slice(0,16)+'-'+width;const target=path.join(cache,key+'.jpg');if(fs.existsSync(target))return target;if(pending.has(key))return pending.get(key);const job=(async()=>{let buffer;if(photo.url.startsWith('/uploads/photos/')){const base=path.resolve(process.env.PHOTO_UPLOAD_DIR||path.join(__dirname,'../public/uploads/photos')),candidate=path.resolve(base,photo.url.slice('/uploads/photos/'.length));if(!candidate.startsWith(base+path.sep))fail(404,'Photo indisponible.');const stat=await fs.promises.stat(candidate);if(stat.size>20*1024*1024)fail(413,'Photo trop volumineuse.');buffer=await fs.promises.readFile(candidate)}else{let url;try{url=new URL(photo.url)}catch{fail(404,'Photo indisponible.')}if(url.protocol!=='https:'||url.hostname!=='res.cloudinary.com')fail(403,'Source photo refusée.');const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)fail(502,'Photo momentanément indisponible.');if(Number(response.headers.get('content-length'))>20*1024*1024)fail(413,'Photo trop volumineuse.');buffer=Buffer.from(await response.arrayBuffer());if(buffer.length>20*1024*1024)fail(413,'Photo trop volumineuse.')}const jpg=await sharp(buffer,{limitInputPixels:40e6}).rotate().resize({width,withoutEnlargement:true}).jpeg({quality:92,chromaSubsampling:'4:4:4'}).toBuffer();const tmp=target+'.'+crypto.randomUUID();await fs.promises.writeFile(tmp,jpg,{mode:0o600});await fs.promises.rename(tmp,target);return target})();pending.set(key,job);try{return await job}finally{pending.delete(key)}}
 async function send(q,s,getPhoto){const width=Number(q.query.w||720);if(![320,720,1448].includes(width))fail(400,'Format photo invalide.');const target=await image(getPhoto(),width);getPhoto();s.type('jpg').sendFile(target)}
 router.get('/media/owner/:id',requireAuth,wrap((q,s)=>send(q,s,()=>catalogue.photoOwner(q.seller.id,+q.params.id))));
 router.get('/media/catalogue/:publication/:photo',wrap((q,s)=>send(q,s,()=>catalogue.photoPublic(q.params.publication,q.params.photo))));
 router.use((e,q,s,n)=>{if(!prefixes.some(p=>q.path.startsWith(p)))return n(e);if(s.headersSent)return n(e);s.status(e.status||500).json({error:e.status?e.message:'Opération non enregistrée. Veuillez réessayer ; aucun succès confirmé.'})});
 return router;
}
module.exports={createRouter};
