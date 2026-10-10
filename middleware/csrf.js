// Browser same-origin validation. Webhooks have their own provider signatures.
module.exports = function csrf(req,res,next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method) || req.path.startsWith('/webhook/')) return next();
  const origin=req.get('origin');
  const referer=req.get('referer');
  const configured=process.env.BASE_URL;
  const allowed=new Set([`${req.protocol}://${req.get('host')}`]);
  if(configured)try{allowed.add(new URL(configured).origin)}catch{}
  let supplied;
  try{if(origin)supplied=new URL(origin).origin;else if(referer)supplied=new URL(referer).origin;}catch{return res.status(403).json({error:'Origine non autorisée'});}
  if(req.get('sec-fetch-site')==='cross-site' || (supplied && !allowed.has(supplied)))return res.status(403).json({error:'Origine non autorisée'});
  // Cookie-authenticated clients without browser origin must explicitly identify same-origin JS.
  if(!supplied && (req.cookies?.token||req.cookies?.admin_token||req.cookies?.partner_token) && req.get('x-vpm-request')!=='same-origin' && !req.headers.authorization)return res.status(403).json({error:'Origine de la requête absente'});
  next();
};
