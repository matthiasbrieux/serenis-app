/* Seller agenda presentation. All forms, persistence and reservation rules remain in agenda.html. */
(() => {
  const main = document.querySelector('body.vpm-agenda-page main');
  if (!main) return;
  main.classList.add('ap-agenda');
  const make = (tag, cls, text) => { const el=document.createElement(tag); if(cls) el.className=cls; if(text!==undefined) el.textContent=text; return el; };
  const button = (text, action, cls='') => { const b=make('button',cls,text); b.type='button'; b.addEventListener('click',action); return b; };
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parseDate = value => new Date(value+'T12:00:00');
  const dayLabel = d => d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
  const todayKey = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const mobile = matchMedia('(max-width:767px)');
  let view=mobile.matches?'day':'week', cursor=parseDate(todayKey());
  let agendaActions=[];
  const statRow=main.querySelector('.agenda-stats');
  if(statRow){const order={avenir:0,aujourd_hui:1,passees:2};[...statRow.querySelectorAll('.stat-card-agenda[data-filter]')].sort((a,b)=>order[a.dataset.filter]-order[b.dataset.filter]).forEach(card=>statRow.append(card));}
  // Move existing nodes rather than recreate inputs, forms or business actions.
  const hero=main.querySelector('.aph'), share=main.querySelector('#bookingLinkBox');
  const top=make('div','ap-top'); hero.before(top); top.append(hero);
  main.insertBefore(statRow,top);
  const agendaTabs=make('nav','ap-agenda-tabs');agendaTabs.setAttribute('aria-label','Rubriques de l’agenda');
  main.insertBefore(agendaTabs,top);
  const pendingTabCount=make('span','ap-tab-count','0'),tabButtons={};
  for(const [key,label] of [['agenda','Agenda'],['visits','Mes visites']]){
    const b=button('',()=>selectAgendaTab(key),'ap-agenda-tab');b.dataset.tab=key;b.append(make('span','',label));
    if(key==='pending')b.append(pendingTabCount);
    agendaTabs.append(b);tabButtons[key]=b;
  }
  top.after(statRow);statRow.after(agendaTabs);
  tabButtons.agenda.setAttribute('aria-current','page');
  const layout=main.querySelector('.agenda-layout');
  const right=main.querySelector('.agenda-right-col'), visits=main.querySelector('.visits-below');
  const manual=main.querySelector('.manual-visit-section');
  const bottom=make('div','ap-bottom'), actionCol=make('div','ap-actions'), listCol=make('div','ap-lists');
  layout.after(bottom); bottom.append(listCol,actionCol); listCol.append(visits);
  const calendarActions=make('div','ap-calendar-actions');main.insertBefore(calendarActions,layout);
  const availabilityButton=button('+ Ajouter une disponibilité',openAvailability,'ap-calendar-action ap-calendar-action-primary');calendarActions.append(availabilityButton);
  const shareButton=button('Partager mon agenda',()=>{share.style.display=share.style.display==='none'?'flex':'none';if(share.style.display!=='none')share.scrollIntoView({behavior:'smooth',block:'center'});},'ap-share-compact');calendarActions.append(shareButton);
  const appointmentsPanel=make('section','ap-appointments-panel');
  appointmentsPanel.append(make('h2','ap-appointments-heading','Mes prochains rendez-vous'));
  const appointmentList=make('div','ap-appointments-list');appointmentsPanel.append(appointmentList);layout.append(appointmentsPanel);
  const dashboard=make('section','ap-dashboard-panels');dashboard.setAttribute('aria-label','Résumé de votre agenda');
  const remindersPanel=make('section','ap-dashboard-panel ap-reminders-panel'),todayPanel=make('section','ap-dashboard-panel ap-today-panel'),detailPanel=make('section','ap-dashboard-panel ap-event-detail-panel');
  const bellSvg='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10 21h4"/></svg>';
  const calendarSvg='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  const panelHeading=(icon,title)=>{const h=make('h2','ap-dashboard-heading');h.insertAdjacentHTML('afterbegin',icon);h.append(make('span','',title));return h;};
  remindersPanel.append(panelHeading(bellSvg,'Mes rappels du jour'));
  todayPanel.append(panelHeading(calendarSvg,'Mes visites du jour'));
  const detailHeading=panelHeading(calendarSvg,"Détail de l'événement"),clearSelection=button('×',()=>{selectedEvent=null;renderDashboardPanels();},'ap-detail-close');clearSelection.setAttribute('aria-label',"Fermer le détail de l'événement");detailHeading.append(clearSelection);detailPanel.append(detailHeading);
  const reminderCount=make('span','ap-count-badge','0');remindersPanel.querySelector('.ap-dashboard-heading').append(reminderCount);
  const reminderItems=make('div','ap-dashboard-list'),todayItems=make('div','ap-dashboard-list'),detailBody=make('div','ap-event-detail-body');
  remindersPanel.append(reminderItems);todayPanel.append(todayItems);detailPanel.append(detailBody);
  dashboard.append(detailPanel);listCol.append(dashboard);
  let selectedEvent=null;
  // Move the original saved-slots block, preserving its nodes and handlers.
  const registered=right.querySelector('.dispo-registered-block');
  visits.querySelector('#upcomingSection').after(registered);
  function openAvailability() { availabilityFormHost.hidden=false; toggleDispoForm(true); const form=document.getElementById('dispoAddForm'); form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'}); document.getElementById('availDate').focus({preventScroll:true}); }
  const subtitle=hero.querySelector('.aph-sub');if(subtitle)subtitle.textContent='Organisez vos visites et suivez vos échanges avec les acheteurs';
  // Reuse the existing manual-visit button and form; move it above the calendar.
  const manualButton=manual.querySelector('.btn-outline-manual');
  if(manualButton){manualButton.textContent='+ Ajouter une visite manuellement';manualButton.classList.add('ap-calendar-action','ap-calendar-action-secondary');calendarActions.insertBefore(manualButton,shareButton);}
  manual.remove();
  // Keep the existing availability form, but show it only on request.
  const availabilityFormHost=right.querySelector('.dispo-section');
  calendarActions.append(availabilityFormHost);availabilityFormHost.hidden=true;
  document.getElementById('dispoAddHdr').hidden=true;
  // Relocate the existing history panel; preserve its list and toggle behavior.
  const history=document.getElementById('pastSection');
  manual.after(history);history.classList.add('ap-history','dispo-add-block');
  const historyHeading=history.querySelector('.agenda-panel-title');
  historyHeading.className='dispo-add-hdr';historyHeading.removeAttribute('style');
  historyHeading.setAttribute('role','button');historyHeading.tabIndex=0;
  historyHeading.setAttribute('aria-controls','pastList');historyHeading.setAttribute('aria-expanded','false');
  const historyLabel=historyHeading.firstElementChild;
  const calendarIcon=make('span','dispo-add-hdr-icon');
  calendarIcon.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/></svg>';
  historyLabel.replaceChildren(calendarIcon,make('span','dispo-add-hdr-title','Mes visites passées'));
  const oldTogglePast=window.togglePastSection;
  window.togglePastSection=function(){oldTogglePast();historyHeading.setAttribute('aria-expanded',String(_pastOpen));};
  historyHeading.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePastSection();}});
  function renderHistory(){
    const past=allVisits.filter(v=>v.status==='done'||(v.status==='confirmed'&&isPastVisit(v))||(v.status==='pending'&&isPastVisit(v))).sort((a,b)=>(b.visit_date+(b.visit_time||'')).localeCompare(a.visit_date+(a.visit_time||'')));
    history.style.display='block';
    document.getElementById('pastCountBadge').textContent=String(past.length);
    const list=document.getElementById('pastList');
    if(past.length)list.innerHTML=past.map(buildPastCard).join('');
    else list.replaceChildren(make('p','ap-history-empty','Aucune visite passée pour le moment'));
  }

  const appointmentsHeading=appointmentsPanel.querySelector('.ap-appointments-heading');
  appointmentsHeading.textContent='Mes prochaines visites';
  const availabilityPanel=make('section','ap-availability-panel');
  const availabilityHeading=make('h2','ap-lower-heading','Mes disponibilités');
  availabilityPanel.append(availabilityHeading,registered);
  const visitsPanel=make('section','ap-visits-panel');
  visitsPanel.hidden=false;
  const visitsHeading=make('h2','ap-lower-heading','Mes visites');visitsPanel.append(visitsHeading);
  const visitsFilters=make('div','ap-visits-filters');
  const visitsFilterButtons={};
  for(const [key,label] of [['last','Dernière réservée'],['scheduled','Programmée'],['confirmed','Confirmée'],['rappel','Rappel J-1'],['all','Toutes']]){const b=button(label,()=>setVisitsFilter(key),'ap-visits-filter');b.dataset.filter=key;visitsFilters.append(b);visitsFilterButtons[key]=b;}
  visitsPanel.append(visitsFilters);listCol.append(visitsPanel);visitsPanel.append(visits);listCol.append(availabilityPanel);
  const compromisPanel=main.querySelector('#compromis-vente'),compromisHeader=compromisPanel?.querySelector('.compromis-bar-hdr'),compromisBody=compromisPanel?.querySelector('.compromis-bar-body');
  if(compromisPanel&&compromisHeader&&compromisBody){
    const toggle=button('Renseigner mon compromis',()=>{compromisBody.hidden=!compromisBody.hidden;toggle.setAttribute('aria-expanded',String(!compromisBody.hidden));},'ap-compromis-toggle');
    compromisHeader.classList.add('ap-compromis-heading');compromisHeader.append(toggle);compromisBody.hidden=true;compromisPanel.classList.add('ap-compromis-panel');listCol.append(compromisPanel);
  }
  // Sharing remains available through a discreet link above the calendar.
  actionCol.append(share);
  const calSync=right.querySelector('#calSyncBox');
  if(calSync){const syncDetails=make('details','ap-sync-details');const syncSummary=make('summary','','Synchroniser mon agenda');syncDetails.append(syncSummary,calSync);actionCol.append(syncDetails);}
  right.remove();
  const pendingPanel=make('div','agenda-panel ap-pending');
  pendingPanel.append(make('h2','ap-panel-title','Demandes en attente')); const pendingList=make('div','ap-pending-list');pendingPanel.append(pendingList);visits.prepend(pendingPanel);
  const pendingEmpty={hidden:true};
  function setVisitsFilter(key){
    visitsPanel.hidden=false;
    Object.entries(visitsFilterButtons).forEach(([name,el])=>el.setAttribute('aria-pressed',String(name===key)));
    const upcoming=document.getElementById('upcomingSection'),pastSection=document.getElementById('pastSection'),cancelled=document.getElementById('cancelledSection'),contacts=document.getElementById('contactsSection');
    const hasPending=allVisits.some(v=>v.status==='pending'&&!isPastVisit(v));
    pendingPanel.hidden=!hasPending||!['upcoming','confirmed','scheduled','rappel','last','pending','all'].includes(key);
    pendingEmpty.hidden=hasPending||key!=='pending';
    const showUpcoming=['upcoming','confirmed','scheduled','rappel','last','all'].includes(key);
    if(upcoming)upcoming.style.display=showUpcoming?'block':'none';
    if(pastSection){pastSection.style.display=['past','all'].includes(key)?'block':'none';if(['past','all'].includes(key)&&!_pastOpen)togglePastSection();}
    if(cancelled)cancelled.style.display=['past','all'].includes(key)?'block':'none';
    if(contacts)contacts.style.display=key==='all'?'block':'none';
    if(upcoming){
      upcoming.querySelectorAll('.vcc2').forEach(card=>{
        if(key==='confirmed')card.style.display=card.classList.contains('vcc2-confirmed')?'':'none';
        else if(key==='scheduled')card.style.display=(!card.classList.contains('vcc2-confirmed')&&!card.classList.contains('vcc2-rappel'))?'':'none';
        else if(key==='rappel')card.style.display=card.classList.contains('vcc2-rappel')?'':'none';
        else card.style.display='';
      });
    }
    const empty=document.getElementById('visitsEmpty');if(empty)empty.style.display='none';
    if(key==='last'){
      setTimeout(()=>{
        const upcomingVisits=allVisits.filter(v=>v.status==='confirmed'&&!isPastVisit(v));
        if(!upcomingVisits.length)return;
        const last=upcomingVisits.reduce((a,b)=>((a.created_at||'')>(b.created_at||'')?a:b));
        const card=document.getElementById(`vcard-${last.id}`);
        if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('ap-highlight-card');setTimeout(()=>card.classList.remove('ap-highlight-card'),2500);}
      },120);
    }
  }
  const oldSetFilter=window.setStatFilter;
  window.setStatFilter=function(value){oldSetFilter(value);pendingPanel.hidden=Boolean(value)||!allVisits.some(v=>v.status==='pending'&&!isPastVisit(v));};
  main.querySelectorAll('.stat-card-agenda[data-filter]').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setStatFilter(el.dataset.filter);}});});
  const oldRenderVisits=window.renderVisits;
  window.renderVisits=function(){oldRenderVisits();renderHistory(); const pending=allVisits.filter(v=>v.status==='pending'&&!isPastVisit(v));pendingPanel.hidden=Boolean(activeStatFilter)||!pending.length;pendingEmpty.hidden=pending.length>0;pendingList.innerHTML=pending.map(buildVisitCompact).join('');pendingTabCount.textContent=String(pending.length);renderDashboardPanels();renderAppointments();};
  const calendar=main.querySelector('.calendar-card'), header=calendar.querySelector('.cal-header');
  const switcher=make('div','ap-view-switch');switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Vue du calendrier');
  const views={month:'Mois',week:'Semaine',day:'Jour'};
  for(const [key,label] of Object.entries(views)){const b=button(label,()=>{view=key;renderCalendar();});b.dataset.view=key;switcher.append(b);}
  header.append(switcher,button('+ Ajouter une disponibilité',openAvailability,'ap-calendar-add'));
  const mini=make('aside','ap-mini'),rightRail=make('aside','ap-right-rail');layout.append(rightRail);rightRail.append(mini);
  const extra=make('div','ap-timeline');calendar.querySelector('#calGrid').after(extra);
  const monthHeader=calendar.querySelector('.cal-grid:not(#calGrid)');
  const originalCalendar=window.renderCalendar;
  const statusText={confirmed:'Visite confirmée',pending:'Demande en attente',cancelled:'Visite annulée',done:'Visite effectuée'};
  const REMINDER_TIME='09:00';
  function timeLabel(value){const [hour='00',minute='00']=(value||'').slice(0,5).split(':');return minute==='00'?`${Number(hour)} h`:`${Number(hour)} h ${minute}`;}
  const fullDate=value=>parseDate(value).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const eventIcons={availability:calendarSvg,confirmed:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 11a3 3 0 1 0 0-6M18 14a5 5 0 0 1 3 4v2"/></svg>',pending:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',reminder:bellSvg,followup:bellSvg};
  function previousDate(value){const d=parseDate(value);d.setDate(d.getDate()-1);return dateKey(d);}
  function eventsFor(key) {
    const items=availSlots.filter(s=>s.date===key).map(s=>({kind:'availability',time:(s.start||'').slice(0,5),end:(s.end||'').slice(0,5),label:'Disponible',data:s}));
    for(const v of allVisits.filter(v=>v.visit_date===key).filter(v=>!activeStatFilter || (v.status!=='cancelled' && (activeStatFilter==='avenir'?!isPastVisit(v):activeStatFilter==='passees'?isPastVisit(v):v.visit_date===todayKey()))))items.push({kind:v.status,time:(v.visit_time||'').slice(0,5),label:v.status==='confirmed'?(v.sms_copied_at?'Visite confirmée':'Visite programmée'):statusText[v.status]||v.status,data:v});
    const m=getMilestoneDates();for(const [id,label] of [['sru','Rétractation'],['conditions','Cond. suspensive'],['acte','Acte authentique']])if(m[id]===key)items.push({kind:'milestone',time:'',label});
    for(const action of agendaActions.filter(a=>a.kind==='visit_reminder'&&a.due_date===key))items.push({kind:'reminder',time:REMINDER_TIME,label:`Rappel — visite demain à ${timeLabel(action.visit_time)}`,data:action,actionId:action.id});
    for(const action of agendaActions.filter(a=>a.kind==='visit_followup'&&a.due_date===key))items.push({kind:'followup',time:REMINDER_TIME,label:'Faire le suivi après la visite',data:action,actionId:action.id});
    return items.sort((a,b)=>a.time.localeCompare(b.time));
  }
  function chooseEvent(event,key,openVisitDay=false){
    const visitKinds=['confirmed','pending','done','reminder'];
    if(visitKinds.includes(event.kind)){
      const visitId=event.kind==='reminder'?(event.data?.visit_id||event.data?.id):event.data?.id;
      Object.entries(tabButtons).forEach(([name,el])=>el.setAttribute('aria-current',String(name==='visits'?'page':'false')));
      visitsPanel.hidden=false;
      if(activeStatFilter)setStatFilter(null);
      if(event.kind==='pending')setVisitsFilter('pending');
      else if(event.kind==='done')setVisitsFilter('past');
      else if(event.kind==='reminder')setVisitsFilter('rappel');
      else setVisitsFilter('upcoming');
      visitsPanel.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>{
        const card=document.getElementById(`vcard-${visitId}`);
        if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('ap-highlight-card');setTimeout(()=>card.classList.remove('ap-highlight-card'),2500);}
      },120);
      return;
    }
    selectedEvent={...event,date:key};if(openVisitDay&&event.data?.visit_date)showDate(event.data.visit_date,true);else renderDashboardPanels();
  }
  function eventNode(event,key,compact=false){
    const el=make(event.kind==='reminder'?'button':'div','ap-event ap-event-'+event.kind);
    if(event.kind==='confirmed'&&!event.data?.sms_copied_at)el.classList.replace('ap-event-confirmed','ap-event-scheduled');
    if(['availability','confirmed','scheduled','pending','reminder','followup'].includes(event.kind)){
      if(event.kind!=='reminder'){el.tabIndex=0;el.setAttribute('role','button');}
      el.addEventListener('click',click=>{click.stopPropagation();chooseEvent(event,key,event.kind==='reminder');});
      if(event.kind!=='reminder')el.addEventListener('keydown',keyEvent=>{if(keyEvent.key==='Enter'||keyEvent.key===' '){keyEvent.preventDefault();chooseEvent(event,key);}});
    }
    if(event.kind==='reminder'){
      el.type='button';el.setAttribute('aria-label',`${event.label} — ${event.data?.buyer_name||'Acquéreur'}, ouvrir la visite`);
    }
    const head=make('span','ap-event-head');
    if(eventIcons[event.kind]){const icon=make('span','ap-event-icon');icon.innerHTML=eventIcons[event.kind];head.append(icon);}
    if(event.time) head.append(make('strong','',event.time+(event.end?' – '+event.end:'')));
    if(head.childElementCount)el.append(head);
    el.append(make('span','',event.label));
    if(!compact && event.data?.buyer_name)el.append(make('span','ap-event-name',event.data.buyer_name));
    return el;
  }
  function showDate(key,preserveSelection=false){if(!preserveSelection)selectedEvent=null;cursor=parseDate(key);calDate=new Date(cursor.getFullYear(),cursor.getMonth(),1);calSelected=key;view='day';renderCalendar();}
  window.apShowDate=showDate;
  function renderDashboardPanels(){
    const today=todayKey();
    const due=agendaActions.filter(a=>a.due_date===today&&['visit_reminder','visit_followup'].includes(a.kind));
    const todays=allVisits.filter(v=>v.visit_date===today&&['confirmed','pending'].includes(v.status)).sort((a,b)=>(a.visit_time||'').localeCompare(b.visit_time||''));
    reminderCount.textContent=String(due.length);reminderItems.replaceChildren();
    if(!due.length)reminderItems.append(make('p','ap-dashboard-empty','Aucun rappel prévu aujourd’hui.'));
    due.forEach(visit=>{
      const row=button('',()=>chooseEvent({kind:visit.kind==='visit_followup'?'followup':'reminder',time:REMINDER_TIME,label:visit.kind==='visit_followup'?'Faire le suivi après la visite':`Rappel — visite demain à ${timeLabel(visit.visit_time)}`,data:visit,actionId:visit.id},today,true),'ap-dashboard-row ap-dashboard-reminder');
      row.append(make('strong','ap-dashboard-time',REMINDER_TIME));
      const icon=make('span','ap-dashboard-row-icon');icon.innerHTML=bellSvg;row.append(icon);
      const copy=make('span','ap-dashboard-row-copy');copy.append(make('strong','','Rappel — visite demain à '+timeLabel(visit.visit_time)),make('small','',visit.buyer_name||'Acquéreur'));row.append(copy,make('span','ap-dashboard-open','›'));reminderItems.append(row);
    });
    todayItems.replaceChildren();
    if(!todays.length)todayItems.append(make('p','ap-dashboard-empty','Aucune visite prévue aujourd’hui.'));
    todays.forEach(visit=>{
      const label=visit.status==='confirmed'?(visit.sms_copied_at?'Visite confirmée':'Visite programmée'):statusText[visit.status]||visit.status;
      const row=button('',()=>chooseEvent({kind:visit.status,label,data:visit},today),'ap-dashboard-row ap-dashboard-visit ap-event-'+visit.status);
      row.append(make('strong','ap-dashboard-time',timeLabel(visit.visit_time)));
      const copy=make('span','ap-dashboard-row-copy');copy.append(make('strong','',label),make('small','',visit.buyer_name||'Acquéreur'));row.append(copy,make('span','ap-dashboard-open','›'));todayItems.append(row);
    });
    detailBody.replaceChildren();
    detailPanel.hidden=!selectedEvent;
    if(!selectedEvent)return;
    const {kind,data,date}=selectedEvent;
    const eventClass=kind==='confirmed'&&!data?.sms_copied_at?'scheduled':kind;
    const info=make('div','ap-selected-event ap-event-'+eventClass);
    info.append(make('strong','ap-selected-date',fullDate(['reminder','followup'].includes(kind)?data.visit_date:date)));
    if(kind==='availability'){
      info.append(make('span','','Créneau disponible'),make('span','',`${timeLabel(data.start)} – ${timeLabel(data.end)}`));
      const index=availSlots.indexOf(data),slotRow=[...document.querySelectorAll('#availSlotList .dispo-slot-row')].find(row=>Number(row.dataset.slotIdx)===index);
      detailBody.append(info);
      if(slotRow){const manage=button('Gérer ce créneau',()=>{slotRow.scrollIntoView({behavior:'smooth',block:'center'});slotRow.querySelector('.dispo-slot-del')?.focus();},'ap-dashboard-action');detailBody.append(manage);}
      return;
    }
    const status=kind==='reminder'?'Visite confirmée':kind==='followup'?'Visite effectuée':kind==='confirmed'?(data?.sms_copied_at?'Visite confirmée':'Visite programmée'):(statusText[data?.visit_status||data?.status]||data?.visit_status||data?.status);
    info.append(make('span','',status),make('strong','',data.buyer_name||'Acquéreur'),make('span','',`Visite ${fullDate(data.visit_date)} à ${timeLabel(data.visit_time)}`));detailBody.append(info);
    const visitId=data.visit_id||data.id;
    const visitButton=button('Consulter la fiche de visite',()=>{if(kind==='pending')selectAgendaTab('pending');else selectAgendaTab('visits');setTimeout(()=>{document.getElementById(`vcard-${visitId}`)?.scrollIntoView({behavior:'smooth',block:'center'});},80);},'ap-dashboard-action');detailBody.append(visitButton);
    if(kind==='reminder'){const advice=document.createElement('a');advice.className='ap-dashboard-action';advice.href='/ma-formation#formation/lecon/4/3';advice.textContent='Conseils pour préparer la visite';detailBody.append(advice);const action=agendaActions.find(a=>a.id===selectedEvent.actionId);if(action)detailBody.append(button('Marquer la préparation comme effectuée',()=>updateAgendaAction(action,'done'),'ap-dashboard-action'));}
    if(kind==='followup'){
      const action=agendaActions.find(a=>a.id===selectedEvent.actionId);
      if(action){
        const visitId=data.visit_id||data.id;
        if(typeof window.sendDossierSerieux==='function')detailBody.append(button('Dossier Acheteur Sérieux',()=>window.sendDossierSerieux(visitId),'ap-dashboard-action'));
        detailBody.append(button('Marquer le suivi comme effectué',()=>updateAgendaAction(action,'done'),'ap-dashboard-action'));
        const next=parseDate(action.due_date);next.setDate(next.getDate()+1);
        detailBody.append(button('Reporter à demain',()=>updateAgendaAction(action,'open',dateKey(next)),'ap-dashboard-action'));
      }
    }
    if(kind==='pending')detailBody.append(make('small','ap-dashboard-hint','Les actions de gestion de la demande sont disponibles dans sa fiche ci-dessous.'));
  }
  function selectAgendaTab(key){
    Object.entries(tabButtons).forEach(([name,el])=>el.setAttribute('aria-current',String(name===key?'page':'false')));
    visitsPanel.hidden=key==='agenda';
    if(activeStatFilter)setStatFilter(null);
    if(key==='agenda'){calendar.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(key==='pending')setVisitsFilter('pending');
    else setVisitsFilter('upcoming');
    visitsPanel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function appointmentDate(date){return parseDate(date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});}
  function renderAppointments(){
    const today=todayKey();
    const rows=allVisits.filter(v=>v.status!=='cancelled'&&v.status!=='done'&&v.visit_date>=today)
      .sort((a,b)=>(a.visit_date+(a.visit_time||'')).localeCompare(b.visit_date+(b.visit_time||''))).slice(0,6);
    appointmentList.replaceChildren();
    if(!rows.length){appointmentList.append(make('p','ap-appointments-empty','Aucun rendez-vous à venir.'));return;}
    for(const visit of rows){
      const row=make('article','ap-appointment-row');
      const date=make('time','ap-appointment-date');date.dateTime=visit.visit_date;date.append(make('strong','',parseDate(visit.visit_date).toLocaleDateString('fr-FR',{day:'2-digit'})),make('span','',appointmentDate(visit.visit_date)));row.append(date);
      const icon=make('span','ap-appointment-icon');icon.innerHTML=visit.status==='pending'?eventIcons.pending:calendarSvg;row.append(icon);
      const info=make('div','ap-appointment-info');
      info.append(make('strong','',visit.status==='pending'?'Demande à confirmer':visit.status==='done'?'Visite passée':'Visite avec '+(visit.buyer_name||'Acquéreur')));
      info.append(make('span','',`${timeLabel(visit.visit_time)}${visit.status==='done'?' · Effectuée':visit.status==='pending'?' · À confirmer':visit.sms_copied_at?' · Confirmée':' · Programmée'}`));
      row.append(info);
      const action=button(visit.status==='pending'?'Gérer la demande':'Voir les détails',()=>{
        selectedEvent={kind:visit.status==='pending'?'pending':visit.status==='done'?'done':'confirmed',label:statusText[visit.status]||'Visite',data:visit,date:visit.visit_date};
        detailPanel.scrollIntoView({behavior:'smooth',block:'center'});renderDashboardPanels();
        document.getElementById(`vcard-${visit.id}`)?.scrollIntoView({behavior:'smooth',block:'center'});
      },'ap-appointment-action');row.append(action);appointmentList.append(row);
    }
  }
  async function refreshAgendaActions(){
    try{
      const res=await fetch('/api/agenda/actions');if(!res.ok)return;
      const data=await res.json();agendaActions=data.actions||[];
      renderCalendar();renderDashboardPanels();
      if(window.renderVisits)window.renderVisits();
    }catch(e){}
  }
  async function updateAgendaAction(action,status,dueDate){
    const response=await fetch(`/api/agenda/actions/${action.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,due_date:dueDate})});
    if(!response.ok){showToast('Impossible de mettre à jour ce rappel','error');return;}
    await refreshAgendaActions();
    if(status==='done'){selectedEvent=null;}
  }
  Object.defineProperty(window,'agendaActionsData',{get:()=>agendaActions});
  window.dismissFollowup=async function(visitId){
    const action=agendaActions.find(a=>a.visit_id==visitId&&a.kind==='visit_followup');
    if(!action){showToast('Aucun suivi en attente pour cette visite');return;}
    await updateAgendaAction(action,'done');
  };
  function renderMini(){
    mini.replaceChildren();const nav=make('div','ap-mini-nav');nav.append(button('‹',()=>navigateMonth(-1)),make('strong','',cursor.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})),button('›',()=>navigateMonth(1)));nav.firstChild.setAttribute('aria-label','Mois précédent du calendrier miniature');nav.lastChild.setAttribute('aria-label','Mois suivant du calendrier miniature');mini.append(nav);
    const grid=make('div','ap-mini-grid');for(const l of ['L','M','M','J','V','S','D'])grid.append(make('span','',l));
    const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);for(let i=0;i<(first.getDay()+6)%7;i++)grid.append(make('span'));
    const count=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
    for(let n=1;n<=count;n++){const d=new Date(cursor.getFullYear(),cursor.getMonth(),n),key=dateKey(d);const b=button(String(n),()=>showDate(key));b.setAttribute('aria-label',dayLabel(d));if(key===dateKey(cursor))b.classList.add('ap-selected');if(eventsFor(key).length)b.classList.add('ap-has-events');grid.append(b);}mini.append(grid);
    const legend=make('div','ap-mini-legend');for(const [kind,label] of [['availability','Créneau disponible'],['confirmed','Visite confirmée'],['pending','Demande en attente'],['reminder','Rappel automatique']])legend.append(make('div','ap-event ap-event-'+kind,label));mini.append(legend);
  }
  function renderMonth(){
    const grid=calendar.querySelector('#calGrid');
    // Preserve the existing month click behavior, milestone calculation and filters.
    for(const cell of grid.querySelectorAll('[onclick]')){
      const key=/selectCalDay\('([^']+)'\)/.exec(cell.getAttribute('onclick'))?.[1];if(!key)continue;
      cell.classList.add('ap-month-cell');cell.setAttribute('tabindex','0');cell.setAttribute('role','button');cell.setAttribute('aria-label',dayLabel(parseDate(key)));
      cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCalDay(key);}});
      cell.querySelectorAll('.cal-cell-event-chip').forEach(e=>e.remove());
      const items=eventsFor(key).filter(e=>e.kind!=='milestone');
      const list=make('div','ap-month-events');for(const item of items.slice(0,2))list.append(eventNode(item,key,true));
      if(items.length>2)list.append(make('span','ap-more',`+ ${items.length-2} événement${items.length>3?'s':''}`));cell.append(list);
    }
  }
  function renderTimeline(){
    extra.replaceChildren();const dates=[];const first=new Date(cursor);if(view==='week')first.setDate(first.getDate()-(first.getDay()+6)%7);
    for(let i=0;i<(view==='week'?7:1);i++){const d=new Date(first);d.setDate(d.getDate()+i);dates.push(d);}
    const data=dates.map(d=>eventsFor(dateKey(d)));
    const scroll=make('div','ap-timeline-scroll'),grid=make('div','ap-hour-grid');grid.style.setProperty('--days',dates.length);
    grid.append(make('div','ap-time-axis','Heure'));
    dates.forEach(d=>{const b=button(dayLabel(d),()=>showDate(dateKey(d)),'ap-day-heading');if(dateKey(d)===todayKey())b.classList.add('ap-is-today');grid.append(b);});
    // Reminders and milestones are distinct all-day items above the proportional time grid.
    if(data.some(items=>items.some(e=>!e.time))){grid.append(make('div','ap-time-axis ap-all-day-label','Repères'));data.forEach((items,i)=>{const cell=make('div','ap-all-day-cell');items.filter(e=>!e.time).forEach(e=>cell.append(eventNode(e,dateKey(dates[i]))));grid.append(cell);});}
    const timed=data.map(items=>items.filter(e=>e.time));
    const minute=value=>{const [h='0',m='0']=(value||'').slice(0,5).split(':');return Number(h)*60+Number(m);};
    const startMinutes=timed.flat().map(e=>minute(e.time));
    const endMinutes=timed.flat().map(e=>minute(e.end||'')||minute(e.time)+60);
    const minHour=Math.min(8,...startMinutes.map(n=>Math.floor(n/60)));
    const maxHour=Math.max(18,...endMinutes.map(n=>Math.ceil(n/60)));
    const hourHeight=50,trackHeight=Math.max(1,maxHour-minHour)*hourHeight;
    grid.style.setProperty('--ap-hour-height',hourHeight+'px');
    const axis=make('div','ap-time-column');axis.style.gridRow='3';axis.style.height=trackHeight+'px';
    for(let hour=minHour;hour<maxHour;hour++){const tick=make('span','ap-hour-tick',String(hour).padStart(2,'0')+':00');tick.style.top=((hour-minHour)*hourHeight)+'px';axis.append(tick);}grid.append(axis);
    dates.forEach((date,index)=>{
      const track=make('div','ap-day-track');track.dataset.date=dateKey(date);track.style.gridRow='3';track.style.height=trackHeight+'px';
      const all=timed[index].map(e=>({event:e,start:minute(e.time),end:e.end?minute(e.end):minute(e.time)+60,lane:0})).sort((a,b)=>a.start-b.start||b.end-a.end);
      const availability=all.filter(item=>item.event.kind==='availability'),appointments=all.filter(item=>item.event.kind!=='availability');
      const laneEnds=[];appointments.forEach(item=>{let lane=laneEnds.findIndex(end=>end<=item.start);if(lane<0)lane=laneEnds.length;item.lane=lane;laneEnds[lane]=item.end;});
      const laneCount=Math.max(1,laneEnds.length);
      // A visit replaces only its own interval visually; the availability block
      // remains underneath it for the full saved range, and the appointment
      // keeps a readable column width instead of being squeezed into a sliver.
      const positioned=[...availability.map(item=>({...item,left:0,width:100})),...appointments.map(item=>({ ...item,left:item.lane*100/laneCount,width:100/laneCount }))];
      for(const item of positioned){const node=eventNode(item.event,dateKey(date));node.classList.add('ap-positioned-event');node.dataset.start=String(item.start);node.dataset.end=String(item.end);node.style.top=((item.start-minHour*60)/60*hourHeight)+'px';node.style.height=(Math.max(0,item.end-item.start)/60*hourHeight)+'px';node.style.left=`calc(${item.left}% + 3px)`;node.style.width=`calc(${item.width}% - 6px)`;track.append(node);}
      grid.append(track);
    });
    scroll.append(grid);extra.append(scroll);
    if(!data.flat().some(e=>['availability','confirmed','pending','done','cancelled'].includes(e.kind)))extra.prepend(make('p','ap-calendar-empty','Aucune disponibilité ni visite sur cette période.'));
  }
  function addAvailabilityDateLinks(){
    const base=new Date(cursor);if(view==='week')base.setDate(base.getDate()-(base.getDay()+6)%7);
    document.querySelectorAll('#availSlotList .dispo-slot-row').forEach(row=>{
      const slot=availSlots[Number(row.dataset.slotIdx)];if(!slot||row.querySelector('[data-jump-date]'))return;
      const day=parseDate(slot.date),outside=view==='day'?slot.date!==dateKey(cursor):view==='week'?day<base||day>=new Date(base.getFullYear(),base.getMonth(),base.getDate()+7):day.getMonth()!==cursor.getMonth()||day.getFullYear()!==cursor.getFullYear();
      if(!outside)return;
      const jump=button('Voir la date',()=>showDate(slot.date),'ap-slot-jump');jump.dataset.jumpDate=slot.date;row.append(jump);
    });
  }
  window.renderCalendar=function(){
    // Keep the legacy renderer for the month, day detail, availability list and milestones.
    originalCalendar();
    addAvailabilityDateLinks();
    const isMonth=view==='month';calendar.querySelector('#calGrid').hidden=!isMonth;monthHeader.hidden=!isMonth;extra.hidden=isMonth;
    switcher.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    const label=document.getElementById('calMonthLabel');
    if(view==='day')label.textContent=cursor.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if(view==='week'){const start=new Date(cursor);start.setDate(start.getDate()-(start.getDay()+6)%7);const end=new Date(start);end.setDate(end.getDate()+6);label.textContent=`Semaine du ${start.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} au ${end.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;}
    if(isMonth)renderMonth();else renderTimeline();
    for(const id of ['calPrev','calNext'])document.getElementById(id).title=(id==='calPrev'?'Période précédente':'Période suivante');
    renderMini();
    renderDashboardPanels();
  };
  function navigateMonth(direction){selectedEvent=null;cursor=new Date(cursor.getFullYear(),cursor.getMonth()+direction,1);calDate=new Date(cursor);calSelected=null;document.getElementById('calDayDetail').style.display='none';renderCalendar();}
  function navigate(direction){selectedEvent=null;if(view==='month')cursor=new Date(cursor.getFullYear(),cursor.getMonth()+direction,1);else cursor.setDate(cursor.getDate()+direction*(view==='week'?7:1));calDate=new Date(cursor.getFullYear(),cursor.getMonth(),1);calSelected=null;document.getElementById('calDayDetail').style.display='none';renderCalendar();}
  for(const [id,direction]of [['calPrev',-1],['calNext',1]])document.getElementById(id).addEventListener('click',e=>{e.stopImmediatePropagation();navigate(direction);},true);
  window.jumpToToday=function(){selectedEvent=null;cursor=parseDate(todayKey());calDate=new Date(cursor.getFullYear(),cursor.getMonth(),1);calSelected=null;document.getElementById('calDayDetail').style.display='none';renderCalendar();};
  const oldSelect=window.selectCalDay;
  window.selectCalDay=function(key){selectedEvent=null;cursor=parseDate(key);oldSelect(key);};
  // Keep renderCalendar's synchronization when data is refreshed by existing actions.
  const queryDate=new URLSearchParams(location.search).get('date');if(queryDate&&/^\d{4}-\d{2}-\d{2}$/.test(queryDate))cursor=parseDate(queryDate);
  calDate=new Date(cursor.getFullYear(),cursor.getMonth(),1);
  const hdr=document.getElementById('dispoAddHdr');hdr.tabIndex=0;hdr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDispoForm();}});
  for(const [id,label]of [['availDate','Date'],['availStart','De'],['availEnd','À']]){const input=document.getElementById(id);const lab=input.closest('div').querySelector('label');if(lab)lab.htmlFor=id;input.setAttribute('aria-label',label);}
  renderVisits();renderCalendar();refreshAgendaActions();setVisitsFilter('upcoming');
})();
