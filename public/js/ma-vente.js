/* Dashboard-only presentation. Server-owned data; no writes and no shared global cache. */
(function () {
  const paths = {
    document:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h1M15 14h1M8 18h1"/>',
    offer:'<path d="M13 2H5v20h14V8zM13 2v6h6M8 12h4M8 16h3M15 15l2 2 4-4"/>',
    announce:'<path d="m3 10 14-6v16L3 14zM3 10v4M6 15l2 6h3l-2-5M20 8l2-1M20 12h3M20 16l2 1"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    room:'<path d="M3 18V8h18v10M3 14h18M6 8V5h5v3M13 8V5h5v3M3 18v3M21 18v3"/>',
    area:'<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M3 3l6 6M21 3l-6 6M21 21l-6-6M3 21l6-6"/>',
    tree:'<path d="M12 21v-7M8 18a4 4 0 0 1-3-7 4 4 0 0 1 3-6 4 4 0 0 1 8 0 4 4 0 0 1 3 6 4 4 0 0 1-3 7z"/>',
    energy:'<path d="M5 3h10l5 4-5 4H5zM5 13h10l5 4-5 4H5z"/>',
    copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H3V3h12v2"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>'; }
  function text(tag, value, cls) { const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e; }
  function safeUrl(raw) { if (typeof raw !== 'string' || !raw.trim()) return null; try { const u=new URL(raw,location.origin);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null; }catch{return null;} }
  function link(href,label,cls) { const a=text('a',label,cls);a.href=href;return a; }
  function listItem(label,href) { const li=document.createElement('li');li.append(link(href,label+' →'));return li; }
  function present(v) {return v!==null&&v!==undefined&&String(v).trim()!=='';}
  function indicators(property,photos,documents) {
    const sharedPhotos=photos.filter(photo=>property[(photo.category||'pro')+'_photos_public']!==0);
    const shared=documents.filter(d=>d.folder!=='notaire');
    return [
      {label:'Fiche descriptive',ready:['type','address','price','surface_habitable','description','year_built'].every(k=>present(property[k])),note:'Champs essentiels renseignés ; vérifiez votre fiche'},
      {label:'Photos',ready:sharedPhotos.length>0,note:'Au moins une photo partageable ajoutée'},
      {label:'Documents',ready:shared.length>0,note:'Au moins un document ajouté ; liste à vérifier dans Mon bien'},
      {label:'DPE et diagnostics',ready:present(property.dpe_class)&&documents.some(d=>d.folder==='diagnostics')&&property.diagnostics_in_dossier!==0,note:'Classe et pièces présentes ; validité à vérifier'}
    ];
  }
  window.renderMaVente=function(seller,property,photos,documents,visits,offers,slots,notifications) {
    const greeting=document.getElementById('dashboardGreeting');greeting.replaceChildren(text('span','Bonjour'+(seller.first_name?' ':'')));
    if(seller.first_name)greeting.append(text('em',seller.first_name+','));
    const summary=[property.type,property.rooms?property.rooms+' pièces':null,present(property.surface_habitable)?property.surface_habitable+' m²':null,[property.city,property.postal_code?'('+property.postal_code+')':null].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    document.getElementById('mvPropertySummary').textContent=summary||'Renseignez votre logement dans Mon bien pour préparer votre vente.';
    const facts=document.getElementById('mvPropertyFacts');facts.replaceChildren();
    for(const [name,value] of [['room',property.rooms?property.rooms+' pièces':'Pièces à renseigner'],['area',present(property.surface_habitable)?property.surface_habitable+' m²':'Surface à renseigner'],['tree',present(property.surface_terrain)?'Terrain '+property.surface_terrain+' m²':'Terrain non renseigné'],['energy',property.dpe_class?'DPE '+property.dpe_class:'DPE à renseigner']]){const fact=text('div','');fact.innerHTML=icon(name);fact.append(text('span',value));facts.append(fact);}
    const checks=indicators(property,photos,documents);const completion=document.getElementById('mvCompletion');completion.replaceChildren();
    checks.forEach(check=>{const item=text('li',check.label+(check.ready?' — renseigné':' — à compléter'));item.className=check.ready?'is-ready':'is-missing';item.title=check.note;completion.append(item);});
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const active=visits.filter(v=>v.status!=='cancelled');
    const parisTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
    const isPast=v=>v.visit_date&&(v.visit_date<today||(v.visit_date===today&&(v.visit_time||'23:59').slice(0,5)<parisTime));
    [active.filter(v=>v.visit_date&&!isPast(v)).length,active.filter(v=>v.visit_date===today).length,active.filter(isPast).length].forEach((n,i)=>document.getElementById('mvVisits'+i).textContent=n);
    ['pending','accepted','refused'].forEach((status,i)=>document.getElementById('mvOffers'+i).textContent=offers.filter(o=>(o.status||'pending')===status).length);
    const notifs=document.getElementById('mvNotifications');notifs.replaceChildren();
    if(!notifications.length)notifs.append(text('p','Aucune notification pour le moment.','mv-empty'));
    notifications.slice(0,3).forEach(n=>{const row=text('div','','mv-notification');row.innerHTML=icon(n.type?.includes('visit')?'calendar':'bell');const copy=text('div','');copy.append(text('strong',n.title||'Notification'));if(n.body)copy.append(text('p',n.body));if(n.created_at){const parsed=new Date(/[zZ]|[+-]\d\d:\d\d$/.test(n.created_at)?n.created_at:n.created_at.replace(' ','T')+'Z');if(!Number.isNaN(+parsed))copy.append(text('time',new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'}).format(parsed)));}row.append(copy);notifs.append(row);});
  };
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.mv-track-icon').forEach(el=>el.innerHTML=icon(el.dataset.icon));
    const firstIcon=document.querySelector('.db-step-num.vpm-step-dossier');if(firstIcon)firstIcon.innerHTML=icon('document');
    document.querySelectorAll('.db-step-btn-link>span:first-child').forEach(el=>el.innerHTML=icon('copy'));
  });
})();
