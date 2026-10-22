/* Reprise de lecture : même clé par compte, aucune modification de progression. */
(async function(){
  const box=document.getElementById('formationResume'),title=document.getElementById('formationResumeTitle'),button=document.getElementById('formationResumeButton');
  if(!box||!title||!button)return;
  let key=null,last=null,pending=null;
  function valid(v){return v&&Number.isInteger(v.mi)&&Number.isInteger(v.si)&&MODULES[v.mi]?.steps?.[v.si];}
  function display(v){if(!valid(v))return;last=v;title.textContent=MODULES[v.mi].steps[v.si].title.replace(/^◆\s*/,'');box.hidden=false;}
  function record(v){if(!valid(v))return;if(!key){pending=v;return;}display(v);try{localStorage.setItem(key,JSON.stringify(v));}catch{}}
  document.addEventListener('formation:lesson',event=>record(event.detail));
  button.addEventListener('click',()=>{if(valid(last))selectFormationLesson(last.mi,last.si);});
  try{
    const res=await fetch('/api/me');if(!res.ok)return;const data=await res.json();const user=data.seller||data.user||data;const id=user.id||user.user_id;if(!id)return;
    key='vpm_formation_last_'+String(id);const raw=localStorage.getItem(key);if(raw)display(resolveStoredFormationLesson(JSON.parse(raw)));
    if(pending)record(pending);
    else if(typeof formationView!=='undefined'&&formationView.level==='lesson')record({mi:formationView.mi,si:formationView.si,lessonKey:formationProgressKey(formationView.mi,formationView.si),...(formationView.mi===5?{structureVersion:2}:{})});
  }catch{}
})();
