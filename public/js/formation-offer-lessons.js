/* Four independent lessons use the native lesson router and progress controls. */
(() => {
  'use strict';
  const container = document.getElementById('modContainer');
  if (!container) return;
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const iconPaths = {
    price:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    coins:'<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.7 2.7 3 6 3s6-1.3 6-3V6M3 11v5c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.5M15 10c3.3 0 6 1.3 6 3s-2.7 3-6 3-6-1.3-6-3 2.7-3 6-3Zm-6 3v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4"/>',
    file:'<path d="M14 2H5v20h14V7ZM14 2v5h5M8 12h8m-8 4h8"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h1m3 0h1m3 0h1m-9 3h1m3 0h1"/>',
    checklist:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5m-8-8 .7.7L5.5 9.5m0 2.5.7.7.8-.8"/>',
    house:'<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7"/>',
    offer:'<path d="M4 5h16v14H4zM7 9h10M7 13h6M7 16h8"/>',
    hand:'<path d="m3 12 4-4 5 1 3-2 6 4-2 6-4 3-7-4Z"/><path d="m8 12 4-3m-5 6 4 3m0-5 5 4m-2-6 5 3"/>',
    hourglass:'<path d="M6 2h12M6 22h12M7 2v4c0 3 5 6 5 6s5-3 5-6V2M7 22v-4c0-3 5-6 5-6s5 3 5 6v4"/>',
    check:'<path d="m4 12 5 5L20 5"/><circle cx="12" cy="12" r="10"/>',
    warning:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    wallet:'<path d="M4 6.5h14a2 2 0 0 1 2 2V20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13M3 8h15a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5M15 14h.01"/>',
    target:'<circle cx="11" cy="13" r="7"/><circle cx="11" cy="13" r="3"/><path d="m13 11 7-7m-4 0h4v4"/>',
    bank:'<path d="M3 9h18L12 3 3 9Zm2 1v9m4-9v9m6-9v9m4-9v9M3 21h18M2 19h20"/>',
    euro:'<circle cx="13" cy="12" r="9"/><path d="M17 7.5a5 5 0 1 0 0 9M4 10h9m-9 4h8"/>',
    linkedHomes:'<path d="m2 10 5-5 5 5M4 9v9h6v-7m2 0h3m-2-2 2 2-2 2m2-2h2l2-2 5 5-5 5h-2m-2-5h4m-2-2v9h5v-7"/>',
    documentSearch:'<path d="M5 2h9l5 5v8M14 2v5h5M8 11h7M8 14h4"/><path d="M5 2v20h8m-5-11h7"/><circle cx="17" cy="17" r="4"/><path d="m20 20 2 2"/>',
    documentCheck:'<path d="M6 2h9l5 5v7M15 2v5h5M9 11h7M9 14h4M6 2v20h7"/><circle cx="17" cy="18" r="4"/><path d="m15.5 18 1 1 2-2"/>',
    folderCheck:'<path d="M3 6h7l2 2h9v9M3 6v13h9"/><circle cx="17" cy="17" r="4"/><path d="m15.5 17 1 1 2-2"/>'
  };
  function icon(name,className){
    const node=make('span',className);node.setAttribute('aria-hidden','true');
    node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">'+(iconPaths[name]||iconPaths.file)+'</svg>';
    return node;
  }
  function composeDecisionPoints(section){
    if(section.dataset.offerDecisionComposed)return;
    const content=section.querySelector('.sst-text'),heading=section.querySelector(':scope > .tail-section-heading,:scope > summary .tail-section-heading');
    if(!content||!heading)return;
    section.dataset.offerDecisionComposed='true';section.classList.add('offer-decision-section');
    const groups=make('div','offer-decision-list');let current=null;
    [...content.childNodes].forEach(node=>{
      const strong=node.nodeType===1&&node.matches('p')?node.querySelector('strong'):null;
      const match=strong&&strong.textContent.match(/^(\d+\.)(\s+)(.+)$/);
      if(match){
        current=make('article','offer-decision-point');groups.append(current);
        const label=make('div','offer-decision-label');
        const number=make('span','offer-decision-number',match[1]);number.setAttribute('aria-hidden','true');
        const title=make('span','offer-decision-title',match[3]);
        strong.replaceChildren(number,document.createTextNode(match[2]),title);
        node.classList.add('offer-decision-heading');
        const kinds=['euro','bank','documentCheck','calendar','folderCheck'];
        label.append(icon(kinds[groups.children.length-1],'offer-decision-icon'),node);
        current.append(label);
      }else if(current){if(node.nodeType===1&&node.matches('p'))node.classList.add('offer-decision-description');current.append(node);}
      else groups.append(node);
    });
    content.replaceChildren(groups);content.classList.add('offer-decision-copy');
    const layout=make('div','offer-decision-layout');
    const placement=section.querySelector(':scope > summary')||heading;
    placement.after(layout);layout.append(content);
  }
  function composeCascadeTable(section){
    if(section.dataset.offerCascadeComposed)return;
    const content=section.querySelector('.sst-text'),heading=section.querySelector(':scope > .tail-section-heading,:scope > summary .tail-section-heading');
    const table=content?.querySelector('table');if(!content||!heading||!table)return;
    section.dataset.offerCascadeComposed='true';section.classList.add('offer-cascade-section');
    const hero=make('div','offer-cascade-heading');
    heading.after(hero);hero.append(heading);
    const headerIcons=['house','warning'];
    table.classList.add('offer-cascade-table');
    table.querySelectorAll('thead th').forEach((th,index)=>th.prepend(icon(headerIcons[index],'offer-cascade-header-icon')));
    table.querySelectorAll('tbody tr').forEach((row,index)=>{
      const first=row.querySelector('td:first-child');
      const situationIcon=first?.querySelector('.lesson-pictogram');
      if(situationIcon){situationIcon.innerHTML=(iconPaths[['house','house','offer','file','coins'][index]]||iconPaths.house);situationIcon.classList.add('offer-cascade-situation-icon');}
      const cell=row.querySelector('td:last-child');if(!cell)return;
      const raw=cell.textContent;
      let match=raw.match(/^(Important|Intermédiaire|Plus rassurant)(.*)$/);
      const status=index<2?'important':index===2?'intermediate':index===3?'reassuring':'secure';
      const statusIcon=['warning','warning','hourglass','check','check'][index];
      cell.dataset.vigilance=status;
      const badge=make('span','offer-cascade-badge',match?match[1]:raw);
      const tail=match?match[2]:'';
      cell.replaceChildren(icon(statusIcon,'offer-cascade-status-icon'),badge,document.createTextNode(tail));
    });
    const note=[...content.children].find(node=>node.matches('p'));
    if(note){note.classList.add('offer-cascade-note');note.prepend(icon('info','offer-cascade-note-icon'));}
  }
  function composeFinancingIntro(section){
    if(section.dataset.offerFinanceIntroComposed)return;
    const content=section.querySelector('.sst-text'),heading=section.querySelector(':scope > .tail-section-heading');
    if(!content||!heading)return;
    section.dataset.offerFinanceIntroComposed='true';section.classList.add('offer-finance-intro');
    const headingIcon=heading.querySelector('.tail-icon');
    const headingSvg=headingIcon?.querySelector('svg');if(headingSvg)headingSvg.innerHTML=iconPaths.wallet;
    const layout=make('div','offer-finance-intro-layout'),copy=make('div','offer-finance-intro-copy');
    const title=heading.querySelector('.sst-title');
    if(title&&!title.querySelector('.offer-finance-title-focus')){
      const original=title.textContent,focusAt=original.indexOf('COMMENT L');
      if(focusAt>0){
        const kicker=make('span','offer-finance-kicker',original.slice(0,focusAt));
        const focus=make('span','offer-finance-title-focus',original.slice(focusAt));
        const svg=title.querySelector('svg');title.replaceChildren(...(svg?[svg]:[]),kicker,focus);
      }
    }
    const objective=[...content.children].find(node=>{
      if(!node.matches('p'))return false;
      return /^Votre objectif n['’]est pas/.test(node.querySelector('strong')?.textContent||'');
    });
    if(objective){const callout=make('div','offer-finance-objective');callout.prepend(icon('target','offer-finance-objective-icon'));objective.before(callout);callout.append(objective);}
    heading.before(layout);layout.append(copy);copy.append(heading,content);
    content.classList.add('offer-finance-intro-text');
  }
  function composeFinancingCases(section){
    if(section.dataset.offerFinanceCaseComposed)return;
    const title=section.dataset.tailTitle||'';
    const match=title.match(/^(CAS N° ([1-3])|4) —/);if(!match)return;
    const number=match[2]||'4',icons={1:'bank',2:'euro',3:'linkedHomes',4:'documentSearch'};
    const summary=section.querySelector(':scope > details > summary,:scope > summary');
    if(!summary)return;
    section.dataset.offerFinanceCaseComposed='true';
    section.classList.add('offer-finance-case','offer-finance-case-'+number);
    summary.classList.add('offer-finance-case-heading');summary.dataset.financeCase=number;
    const pictogram=summary.querySelector('.tail-icon svg');if(pictogram)pictogram.innerHTML=iconPaths[icons[number]];
    const separator=make('span','offer-finance-case-divider');separator.setAttribute('aria-hidden','true');
    const pictogramWrap=summary.querySelector('.tail-icon');if(pictogramWrap)pictogramWrap.after(separator);
  }
  function compose() {
    for (let index = 0; index < 4; index++) {
      const lesson = document.getElementById('step-5-' + index);
      if (!lesson || !lesson.dataset.tailComposed || lesson.dataset.offerLesson) continue;
      lesson.dataset.offerLesson = 'true';
      const body = lesson.querySelector('.step-body');
      if (index < 2) {
        const originalSections = [...body.children].filter(node => node.matches('.sst'));
        const content = make('div', 'offer-content');
        // Move the existing content without cloning it or changing any original text.
        originalSections.forEach(section => content.append(section));
        // The lesson masthead already carries the lesson identity; avoid a second logo strip.
        body.prepend(content);
        if(index===0){
          for(const section of content.querySelectorAll('.sst')){
            const title=section.dataset.tailTitle||section.querySelector('.sst-title')?.textContent.trim()||'';
            if(title==="1 — QU'EST-CE QU'UNE OFFRE D'ACHAT ?")section.classList.add('offer-definition-section');
            if(title==='3 — LA PREMIÈRE QUESTION À POSER : COMMENT L’ACHETEUR FINANCE-T-IL SON ACHAT ?'||title==="3 — LA PREMIÈRE QUESTION À POSER : COMMENT L'ACHETEUR FINANCE-T-IL SON ACHAT ?")composeFinancingIntro(section);
            composeFinancingCases(section);
            if(title==='6 — LES CINQ POINTS À EXAMINER AVANT DE DÉCIDER')composeDecisionPoints(section);
            if(title==="TABLEAU — COMPRENDRE L'AVANCEMENT D'UNE VENTE EN CASCADE")composeCascadeTable(section);
          }
        }
      }
    }
  }
  compose();
  new MutationObserver(compose).observe(container, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked']
  });
})();
