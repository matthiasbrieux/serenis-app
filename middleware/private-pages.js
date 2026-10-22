const path=require('path');
const {requireAdmin}=require('./auth');

const adminPages=new Set([
  // Existants
  'fiche-fondateurs.html','dossier.html','formation-complete.html','dossier-complet.html','hoguet-defense.html','dossier-conviction.html',
  // Groupe A
  'flyer.html','facture-vpm.html','devis-vpm.html','attestation-formation.html','recu-paiement.html',
  'planning-mise-en-vente.html','planning-fin-de-vente.html','notice-utilisation.html',
  'cheques-parrainage.html','script-appel-acheteur.html','presentation-commerciale.html',
  'fiche-visite.html','fiche-acces-emails.html'
]);
// Groupe C : vendeur connecté OU admin
const authPages=new Set(['pdf-objections.html','pdf-sms.html','pdf-email.html']);

function requireAuthOrAdmin(req,res,next){
  const token=req.cookies?.token;
  if(token){
    try{require('../services/session').verify(token,'seller',require('../database'));return next();}catch{}
  }
  return requireAdmin(req,res,next);
}

module.exports=function privatePageGuard(req,res,next){
  let normalized;
  try{normalized=path.posix.normalize(decodeURIComponent(req.path)).replace(/^\/+/,'');}catch{return res.sendStatus(400);}
  if(adminPages.has(normalized))return requireAdmin(req,res,()=>res.sendFile(path.join(__dirname,'../public',normalized)));
  if(authPages.has(normalized))return requireAuthOrAdmin(req,res,()=>res.sendFile(path.join(__dirname,'../public',normalized)));
  next();
};
