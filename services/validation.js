const date = v => typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const time = v => typeof v==='string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
const email = v => typeof v==='string' && v.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v.trim());
const text = v => typeof v==='string' && v.trim().length>0 && v.length<=500;
const number = (v,min=0,max=1e12,integer=false) => (typeof v==='number'||typeof v==='string'&&v.trim()!==''&&/^(?:\d+\.?\d*|\.\d+)$/.test(v)) && Number.isFinite(Number(v)) && Number(v)>=min && Number(v)<=max && (!integer||Number.isSafeInteger(Number(v)));
const webUrl = v => {try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&v.length<=4096}catch{return false}};
const parisDay = (now=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
function parisInstant(day,hour){
 const target=new Date(`${day}T${hour}:00Z`);let instant=target.getTime();
 for(let i=0;i<3;i++){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(x=>[x.type,x.value]));const wall=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);instant+=target.getTime()-wall;}
 return new Date(instant);
}
function slotError(slots){
 if(!Array.isArray(slots)||slots.length>2000)return 'Liste de disponibilités invalide';
 for(const s of slots){if(!s||!time(s.start)||!time(s.end)||s.start>=s.end)return 'Horaires invalides';if(s.date){if(!date(s.date)||s.date<parisDay())return 'Date de disponibilité invalide ou passée';}else if(!Number.isInteger(s.day)||s.day<0||s.day>6)return 'Jour invalide';}
 for(let i=0;i<slots.length;i++)for(let j=0;j<i;j++){const a=slots[i],b=slots[j];if((a.date&&a.date===b.date||!a.date&&!b.date&&a.day===b.day)&&a.start<b.end&&b.start<a.end)return 'Disponibilités superposées';}
 return null;
}
function bookingError(db,property,b){
 if(!text(b.buyer_name)||!email(b.buyer_email)||b.buyer_phone && !/^[+\d\s().-]{6,30}$/.test(b.buyer_phone))return 'Coordonnées invalides';
 if(!date(b.visit_date)||!time(b.visit_time)||parisInstant(b.visit_date,b.visit_time)<=new Date())return 'Date ou heure invalide ou passée';
 if(b.buyer_budget!==undefined&&!number(b.buyer_budget,1)&&!['Moins de 100 000 €','100 000 – 200 000 €','200 000 – 300 000 €','300 000 – 400 000 €','400 000 – 500 000 €','500 000 – 700 000 €','Plus de 700 000 €'].includes(b.buyer_budget))return 'Budget invalide';
 const day=new Date(b.visit_date+'T12:00:00Z').getUTCDay();
 const slots=db.prepare('SELECT * FROM agenda_slots WHERE seller_id=? AND active=1').all(property.seller_id);
 const end=new Date(parisInstant(b.visit_date,b.visit_time).getTime()+1800000);
 const endTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(end);
 if(!slots.some(s=>(s.specific_date===b.visit_date||!s.specific_date&&s.is_recurring&&s.day_of_week===day)&&s.start_time<=b.visit_time&&s.end_time>=endTime&&parisDay(end)===b.visit_date))return 'Ce créneau ne fait pas partie des disponibilités';
 return null;
}
function propertyError(data,previous={}){
 const merged={...previous,...data};
 for(const [k,v] of Object.entries(data)){
  if(v===null||v==='')continue;
  if(['dpe_class','ges_class'].includes(k)&&!['A','B','C','D','E','F','G'].includes(v))return k+' : classe invalide';
  if(/^(surface_|terrace_surface|garage_surface|hauteur_plafond|price$|taxe_fonciere$|dpe_conso_energie$|dpe_ges$|dpe_cout_|facture_)/.test(k)&&!number(v))return k+' : valeur numérique positive requise';
  if(['rooms','bedrooms','wc_count','year_built','heating_year','dpe_annee_ref'].includes(k)&&!number(v,0,k.includes('year')||k==='dpe_annee_ref'?new Date().getFullYear()+10:1000,true))return k+' : entier invalide';
  if(k==='dpe_date'&&!date(v))return 'Date DPE invalide';
  if(k==='virtual_tour_url'&&!webUrl(v))return 'URL de visite invalide';
  if(['type','address','city','postal_code','description'].includes(k) && typeof v!=='string')return k+' : texte requis';
  if(typeof v==='object')return k+' : valeur invalide';
 }
 if(merged.dpe_cout_min!==null&&merged.dpe_cout_min!==''&&merged.dpe_cout_min!==undefined&&merged.dpe_cout_max!==null&&merged.dpe_cout_max!==''&&merged.dpe_cout_max!==undefined&&Number(merged.dpe_cout_min)>Number(merged.dpe_cout_max))return 'Le minimum DPE dépasse le maximum';
 return null;
}
module.exports={date,time,email,text,number,webUrl,parisDay,parisInstant,slotError,bookingError,propertyError};
