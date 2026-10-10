const { JSDOM } = require('jsdom');
const fs=require('fs'),path=require('path');
const allowedTags=new Set('DIV SPAN P BR STRONG EM B I U H1 H2 H3 H4 H5 H6 TABLE THEAD TBODY TFOOT TR TH TD UL OL LI IMG HR SVG PATH CIRCLE RECT LINE POLYLINE POLYGON G DEFS LINEARGRADIENT STOP'.split(' '));
const cssProps=new Set('color background background-color font-family font-size font-weight font-style line-height text-align text-decoration white-space word-break overflow-wrap display flex flex-direction flex-wrap align-items justify-content gap width max-width min-width height max-height min-height margin margin-top margin-bottom margin-left margin-right padding padding-top padding-bottom padding-left padding-right border border-top border-bottom border-left border-right border-color border-width border-style border-radius border-collapse box-sizing vertical-align object-fit opacity letter-spacing page-break-before page-break-after page-break-inside break-inside'.split(' '));
function sanitize(html,photoUrls=[]) {
  if(typeof html!=='string'||html.length>2*1024*1024)throw Error('Contenu PDF invalide');
  const dom=new JSDOM('<body>'+html+'</body>');const document=dom.window.document;
  const images=new Set(photoUrls);
  for(const node of [...document.body.querySelectorAll('*')]){
    if(!allowedTags.has(node.tagName.toUpperCase())){node.remove();continue;}
    for(const attr of [...node.attributes]){
      const n=attr.name.toLowerCase();
      if(n==='style'){
        const clean=[];for(const part of attr.value.split(';')){const i=part.indexOf(':');const key=part.slice(0,i).trim().toLowerCase(),value=part.slice(i+1).trim();if(i>0&&cssProps.has(key)&&/^[#a-zA-Z0-9 .,()%+\-]+$/.test(value)&&!/(url|expression|image-set|behavior)/i.test(value))clean.push(key+':'+value);}
        node.setAttribute('style',clean.join(';'));
      } else if(n==='src'&&node.tagName==='IMG'){if(!images.has(attr.value))node.removeAttribute(n);}
      else if(!['class','id','alt','width','height','colspan','rowspan','viewbox','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','d','x','y','x1','x2','y1','y2','cx','cy','r','rx','points','xmlns'].includes(n))node.removeAttribute(n);
      else if(/[<>"'\\]/.test(attr.value))node.removeAttribute(n);
    }
  }
  const result=document.body.innerHTML;dom.window.close();return result;
}
async function embedPhotos(html,photos){
 const dom=new JSDOM('<body>'+html+'</body>');
 for(const node of dom.window.document.querySelectorAll('img[src]')){
  const src=node.getAttribute('src');if(!photos.some(p=>p.url===src)){node.removeAttribute('src');continue;}
  try{
   let bytes,mime;
   if(src.startsWith('/uploads/photos/')){bytes=await fs.promises.readFile(path.join(__dirname,'../public/uploads/photos',path.basename(src)));mime=src.endsWith('.png')?'image/png':src.endsWith('.webp')?'image/webp':'image/jpeg';}
   else{const u=new URL(src);if(u.protocol!=='https:'||u.hostname!=='res.cloudinary.com')throw Error('Image non autorisée');const response=await fetch(src,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Image indisponible');mime=response.headers.get('content-type')?.split(';')[0];if(!['image/jpeg','image/png','image/webp'].includes(mime))throw Error('Type invalide');bytes=Buffer.from(await response.arrayBuffer());}
   if(bytes.length>20*1024*1024)throw Error('Image trop lourde');
   node.setAttribute('src',`data:${mime};base64,${bytes.toString('base64')}`);
  }catch{node.removeAttribute('src');}
 }
 const result=dom.window.document.body.innerHTML;dom.window.close();return result;
}
async function generateSafePdf(html,photos=[],options={}){
 const safe=sanitize(html,photos.map(p=>p.url));const embedded=await embedPhotos(safe,photos);
 const browser=await require('puppeteer').launch({headless:true,args:[],timeout:20000});
 try{
  const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);
  page.on('request',req=>req.url().startsWith('data:image/')?req.continue():req.abort());
  await page.setContent(`<!doctype html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;color:#1a1a1a;font-size:13px}img{max-width:100%}table{width:100%;border-collapse:collapse}.fd-label{color:#888;width:42%;padding:4px 10px 4px 0}.fd-value{padding:4px 0;font-weight:600}</style></head><body>${embedded}</body></html>`,{waitUntil:'load',timeout:20000});
  return Buffer.from(await page.pdf({format:'A4',printBackground:true,margin:{top:'10mm',bottom:'10mm',left:'10mm',right:'10mm'},...options}));
 }finally{await browser.close();}
}
module.exports={sanitize,embedPhotos,generateSafePdf};
