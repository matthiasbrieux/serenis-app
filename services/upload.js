const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const photoRoot = path.resolve(process.env.PHOTO_UPLOAD_DIR || path.join(__dirname,'../public/uploads/photos'));
const documentRoot = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(__dirname,'../storage/documents'));
let cloudinary = {uploader:{destroy:async()=>({result:'not found'})}};
if(process.env.CLOUDINARY_URL){cloudinary=require('cloudinary').v2;cloudinary.config(true);}
async function validate(buffer,file,document) {
  const ext=path.extname(file.originalname).toLowerCase();
  if(document && ext==='.pdf' && file.mimetype==='application/pdf' && buffer.subarray(0,5).toString()==='%PDF-' && buffer.subarray(-2048).includes(Buffer.from('%%EOF'))) return {buffer,ext:'.pdf',mime:'application/pdf'};
  const formats={'.jpg':'jpeg','.jpeg':'jpeg','.png':'png','.webp':'webp','.gif':'gif'};
  const format=formats[ext];
  if(!format || file.mimetype!=='image/'+(format==='jpeg'?'jpeg':format))throw Error('Format non autorisé : PDF ou image valide requis.');
  const image=sharp(buffer,{limitInputPixels:40000000,failOn:'warning'});
  const metadata=await image.metadata();
  if(metadata.format!==format || !metadata.width || !metadata.height)throw Error('Image invalide');
  const cleaned=await image.rotate().toFormat(format==='gif'?'png':format).toBuffer();
  return {buffer:cleaned,ext:format==='gif'?'.png':'.'+format,mime:format==='gif'?'image/png':file.mimetype};
}
function storage(document){return {
  _handleFile(req,file,cb){
    let completed=false; const finish=(...args)=>{if(!completed){completed=true;cb(...args)}};
    const chunks=[];let length=0;const max=document?50*1024*1024:20*1024*1024;let limited=false;
    file.stream.on('limit',()=>{limited=true});
    file.stream.on('data',chunk=>{length+=chunk.length;if(length<=max)chunks.push(chunk)});
    file.stream.on('error',finish);
    file.stream.on('end',async()=>{try{
      if(completed)return;
      if(req.aborted)throw Error('Téléversement interrompu');
      if(limited||length>max)throw Error('Fichier trop volumineux');
      const data=await validate(Buffer.concat(chunks),file,document);
      const filename=crypto.randomUUID()+data.ext;
      if(req.aborted)throw Error('Téléversement interrompu');
      if(process.env.CLOUDINARY_URL){
        const result=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({folder:document?'serenis/documents':'serenis/photos',resource_type:data.ext==='.pdf'?'raw':'image',type:document?'authenticated':'upload',public_id:filename,overwrite:false},(e,v)=>e?reject(e):resolve(v));stream.end(data.buffer)});
        if(req.aborted){await cloudinary.uploader.destroy(result.public_id,{resource_type:data.ext==='.pdf'?'raw':'image',type:document?'authenticated':'upload'});throw Error('Téléversement interrompu');}
        return finish(null,{filename:result.public_id,public_id:result.public_id,path:result.secure_url,size:data.buffer.length,mimetype:data.mime});
      }
      const dir=document?documentRoot:photoRoot;await fs.promises.mkdir(dir,{recursive:true,mode:0o700});
      const destination=path.join(dir,filename);await fs.promises.writeFile(destination,data.buffer,{mode:0o600,flag:'wx'});
      if(req.aborted){await fs.promises.unlink(destination);throw Error('Téléversement interrompu');}
      finish(null,{filename,path:destination,size:data.buffer.length,mimetype:data.mime});
    }catch(e){finish(e)}});
  },
  _removeFile(req,file,cb){if(file.path?.startsWith('/'))fs.unlink(file.path,e=>cb(e?.code==='ENOENT'?null:e));else if(file.filename)cloudinary.uploader.destroy(file.filename,{resource_type:document&&file.mimetype==='application/pdf'?'raw':'image',type:document?'authenticated':'upload'}).then(()=>cb(),cb);else cb();}
};}
const options=document=>({storage:storage(document),limits:{fileSize:(document?50:20)*1024*1024,files:document?1:150,fields:30,parts:180}});
module.exports={uploadPhoto:multer(options(false)),uploadDocument:multer(options(true)),cloudinary,validate};
