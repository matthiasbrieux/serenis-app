'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'views/seller/library.html'),'utf8');
const start=source.indexOf('const MODULES = ')+16;
const modules=JSON.parse(source.slice(start,source.indexOf('\n];',start)+2));
module.exports=function openMessages({clipboardFails=false,presentationSource}={}){
  const dom=new JSDOM(source,{runScripts:'outside-only',url:'https://vpm.example/ma-formation#formation',pretendToBeVisual:true}),w=dom.window;
  const copied=[],destinations=[],fiches=[];
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{if(clipboardFails)throw Error('Clipboard refused');copied.push(value);}}});
  // Only native browser dialog behavior is shimmed; production uses HTMLDialogElement.
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;this.querySelector('[autofocus]')?.focus();};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  const definitions=source.slice(source.indexOf('const FICHES = '),source.indexOf('// Tutoriel issu du guide vendeur validé')).replace('const FICHES =','var FICHES =').replace('const FICHE_MAILS =','var FICHE_MAILS =');
  w.eval(`var MODULES=${JSON.stringify(modules)};${definitions}
    var CH_PHOTOS=Array(6).fill('/images/formation-hero.png');var CH_ICONS=Array(6).fill('');var activeModule=0;var doneSteps={};var formationView={level:'home'};
    function formationProgressKey(mi,si){return mi+'-'+si;}function openModule(){}function renderChapterCards(){}function updateProgress(){}function applyFormationView(){}function setFormationVisibility(el,visible){el.hidden=!visible;}
    function selectFormationLesson(mi,si){window.recordDestination(mi,si);formationView.level='lesson';applyFormationView();}function openFiche(key){window.recordFiche(key);}`);
  w.recordDestination=(mi,si)=>destinations.push([mi,si]);w.recordFiche=key=>fiches.push(key);
  // Use the three original rendered dossier texts from their existing presentation source.
  const dossier=fs.readFileSync(path.join(root,'public/js/formation-dossier-editorial.js'),'utf8');
  const literal=dossier.match(/const messagePreviews = (.*);\n/)[1];
  const texts=vm.runInNewContext(literal);
  const step=w.document.createElement('div');step.id='step-1-3';
  texts.forEach(text=>{const preview=w.document.createElement('div');preview.className='dossier-message-preview';const body=w.document.createElement('div');body.className='dossier-message-text';body.textContent=text;preview.append(body);step.append(preview);});w.document.body.append(step);
  w.eval(fs.readFileSync(path.join(root,'public/js/formation-home-messages.js'),'utf8'));
  const models=w.VPMFormationHomeMessages;
  w.eval(presentationSource||fs.readFileSync(path.join(root,'public/js/formation-home.js'),'utf8'));
  return {dom,w,d:w.document,models,copied,destinations,fiches,close:()=>dom.window.close()};
};
