const fs = require('fs');
const path = require('path');
const db = require('../database');
const privateRoot = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(__dirname,'../storage/documents'));
const publicRoot = path.join(__dirname,'../public');
function localPath(doc) {
  if (doc.url.startsWith('/private-documents/')) return path.join(privateRoot, path.basename(doc.url));
  if (doc.url.startsWith('/uploads/photos/') && process.env.PHOTO_UPLOAD_DIR) return path.join(path.resolve(process.env.PHOTO_UPLOAD_DIR),path.basename(doc.url));
  if (doc.url.startsWith('/uploads/documents/') || doc.url.startsWith('/uploads/photos/')) return path.join(publicRoot, doc.url);
  return null;
}
async function readDocument(doc) {
  const local=localPath(doc);
  if(local){
    const stat=await fs.promises.stat(local);if(stat.size>50*1024*1024)throw Error('Document trop volumineux');
    return {buffer:await fs.promises.readFile(local),mime:require('mime-types').lookup(local)||'application/octet-stream'};
  }
  const parsed=new URL(doc.url);
  if(parsed.protocol!=='https:' || parsed.hostname!=='res.cloudinary.com')throw Error('Stockage documentaire non autorisé');
  const {cloudinary}=require('./upload');
  const authenticated=parsed.pathname.includes('/authenticated/');
  const url=authenticated?cloudinary.utils.private_download_url(doc.cloudinary_id,path.extname(parsed.pathname).slice(1)||'pdf',{resource_type:parsed.pathname.includes('/raw/')?'raw':'image',type:'authenticated',expires_at:Math.floor(Date.now()/1000)+60}):doc.url;
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Stockage indisponible');
  if(Number(response.headers.get('content-length'))>50*1024*1024)throw Error('Document trop volumineux');
  const buffer=Buffer.from(await response.arrayBuffer());if(buffer.length>50*1024*1024)throw Error('Document trop volumineux');
  return {buffer,mime:response.headers.get('content-type')?.split(';')[0]||'application/octet-stream'};
}
async function sendDocument(doc,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const inline=new Set(['application/pdf','image/jpeg','image/png','image/webp','image/gif']);
  const local=localPath(doc);
  if(local){
    const mime=require('mime-types').lookup(local)||'application/octet-stream';
    if(!inline.has(mime)){res.type('application/octet-stream');res.setHeader('Content-Disposition','attachment; filename="document.bin"');}
    return res.sendFile(local);
  }
  try{
    const {buffer,mime}=await readDocument(doc);
    res.type(inline.has(mime)?mime:'application/octet-stream');
    res.setHeader('Content-Disposition',inline.has(mime)?'inline':'attachment; filename="document.bin"');
    res.send(buffer);
  }catch{return res.status(502).json({error:'Impossible de récupérer le document'});}
}

function guardLegacyDocument(req,res,next) {
  const url='/uploads/documents'+req.path;
  const doc=db.prepare('SELECT d.*, p.seller_id FROM property_documents d JOIN properties p ON p.id=d.property_id WHERE d.url=?').get(url);
  if(!doc)return res.sendStatus(404);
  try { const account=require('./session').verify(req.cookies?.token || req.headers.authorization?.replace('Bearer ',''),'seller',db);if(account.id===doc.seller_id)return sendDocument(doc,res); } catch {}
  return res.sendStatus(403);
}
async function removeMedia(doc,kind) {
  const local=localPath(doc);
  if(local){try{await fs.promises.unlink(local)}catch(e){if(e.code!=='ENOENT')throw e}return;}
  const {cloudinary}=require('./upload');
  const result=await cloudinary.uploader.destroy(doc.cloudinary_id,{resource_type:doc.url.includes('/raw/')?'raw':'image',type:doc.url.includes('/authenticated/')?'authenticated':'upload',invalidate:true});
  if(result && !['ok','not found'].includes(result.result))throw Error('Storage deletion failed');
}
module.exports={sendDocument,readDocument,guardLegacyDocument,removeMedia,privateRoot};
