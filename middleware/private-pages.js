const path=require('path');
const {requireAdmin}=require('./auth');
const privatePages=new Set(['fiche-fondateurs.html','dossier.html','formation-complete.html','dossier-complet.html','hoguet-defense.html','dossier-conviction.html']);
module.exports=function privatePageGuard(req,res,next){
  let normalized;
  try{normalized=path.posix.normalize(decodeURIComponent(req.path)).replace(/^\/+/, '');}catch{return res.sendStatus(400);}
  if(!privatePages.has(normalized))return next();
  return requireAdmin(req,res,()=>res.sendFile(path.join(__dirname,'../public',normalized)));
};
