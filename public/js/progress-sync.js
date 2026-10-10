// Server progression is authoritative and the offline cache belongs to one account.
let progressAccountPromise;
let progressMutationVersion = 0;
function progressAccount() {
  if (!progressAccountPromise) progressAccountPromise = fetch('/api/me',{credentials:'same-origin'}).then(async r=>{
    if(!r.ok)throw Error('Session indisponible');const d=await r.json();const s=d.seller;
    if(!s?.id)throw Error('Compte indisponible');return String(s.uuid||s.id);
  }).catch(e=>{progressAccountPromise=null;throw e;});
  return progressAccountPromise;
}
function safeProgressJson(value,fallback={}) { try { const data=JSON.parse(value);return data && typeof data==='object' && !Array.isArray(data) ? data : fallback; } catch { return fallback; } }
async function syncProgress(key,value) {
  progressMutationVersion++;
  try {
    const account=await progressAccount();
    localStorage.setItem('vpm_progress_'+account+'_'+key,String(value));
    const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value:String(value)})});
    if(!r.ok)throw Error('Progression non enregistrée');
    localStorage.removeItem('vpm_progress_pending_'+account+'_'+key);
  } catch(e) {
    try{const account=await progressAccount();localStorage.setItem('vpm_progress_pending_'+account+'_'+key,String(value))}catch{}
    console.warn('Progression conservée localement ; synchronisation en attente.');
  }
}
async function hydrateProgress(onChanged) {
  const startVersion=progressMutationVersion;
  try {
    const account=await progressAccount();
    const r=await fetch('/api/progress',{credentials:'same-origin'});
    if(!r.ok)throw Error('Progression indisponible');const data=await r.json();
    if(progressMutationVersion!==startVersion)return;
    const known=new Set(['vpm_done_steps','vpm_celebrated',...Object.keys(data)]);
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('ck_'))known.add(key);}
    for(const key of known){
      const pending=localStorage.getItem('vpm_progress_pending_'+account+'_'+key);
      const value=pending ?? data[key] ?? (key==='vpm_celebrated'?'[]':'{}');
      localStorage.setItem(key,String(value));localStorage.setItem('vpm_progress_'+account+'_'+key,String(value));
      if(pending!==null)syncProgress(key,pending);
    }
    if(typeof onChanged==='function')onChanged();
  }catch{
    // Never fall back to another account's unscoped state.
    try{const account=await progressAccount();for(const key of ['vpm_done_steps','vpm_celebrated'])localStorage.setItem(key,localStorage.getItem('vpm_progress_'+account+'_'+key)||(key==='vpm_celebrated'?'[]':'{}'));if(typeof onChanged==='function')onChanged();}catch{}
  }
}
