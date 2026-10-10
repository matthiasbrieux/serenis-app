/* Ajout autonome : la progression et les contenus existants restent intacts. */
(async function(){
  const box=document.getElementById('formationResume'),title=document.getElementById('formationResumeTitle'),button=document.getElementById('formationResumeButton');
  if(!box||!title||!button)return;
  let key=null,last=null;
  function valid(v){return v&&Number.isInteger(v.mi)&&Number.isInteger(v.si)&&MODULES[v.mi]?.steps?.[v.si];}
  function display(v){if(!valid(v))return;last=v;title.textContent=MODULES[v.mi].steps[v.si].title.replace(/^◆\s*/,'');box.hidden=false;}
  try{const res=await fetch('/api/me');if(!res.ok)return;const data=await res.json();const user=data.seller||data.user||data;const id=user.id||user.user_id;if(!id)return;key='vpm_formation_last_'+String(id);const raw=localStorage.getItem(key);if(raw)display(resolveStoredFormationLesson(JSON.parse(raw)));}catch{}
  document.addEventListener('click',function(e){const h=e.target.closest('.step-hdr[data-mi]');if(!key||!h||e.target.closest('[data-chk]'))return;const v={mi:Number(h.dataset.mi),si:Number(h.dataset.si),lessonKey:formationProgressKey(Number(h.dataset.mi),Number(h.dataset.si))};setTimeout(()=>{if(!valid(v)||!document.getElementById('step-'+v.mi+'-'+v.si)?.classList.contains('open'))return;display(v);try{localStorage.setItem(key,JSON.stringify(v));}catch{}},0);});
  button.addEventListener('click',function(){if(!valid(last))return;stopAgent();activeModule=last.mi;if(MODULES[last.mi].mailCat)activeMailCat=MODULES[last.mi].mailCat;renderModules();updateKeyPoints();updateModuleVideo();renderMails();renderChecklists();goToStep(last.mi,last.si);});
})();
