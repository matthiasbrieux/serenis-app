/* Lesson 6.2 only: move original nodes; never rewrite teaching or message text. */
(() => {
  'use strict';
  const root = document.getElementById('modContainer');
  if (!root) return;
  const make = (tag, name) => { const node=document.createElement(tag);node.className=name;return node; };
  function group(first,last,name,tag='div') {
    const box=make(tag,name);first.before(box);
    let node=first;
    while(node){const next=node.nextSibling;box.append(node);if(node===last)break;node=next;}
    return box;
  }
  function steps(nodes,name) {
    if(!nodes.length)return;
    const list=make('div',name);nodes[0].before(list);
    const ends=nodes.map((node,index)=>nodes[index+1]?.previousSibling||node);
    nodes.forEach((node,index)=>list.append(group(node,ends[index],'action-step')));
  }
  function emphasize(node) {
    const walk=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),texts=[];
    while(walk.nextNode())texts.push(walk.currentNode);
    for(const text of texts){
      const parts=text.data.split(/(\d[\d ]*\s?€\.?)/g);if(parts.length===1)continue;
      const fragment=document.createDocumentFragment();
      parts.forEach((part,index)=>{if(index%2){const mark=make('span','action-amount');mark.textContent=part;fragment.append(mark);}else fragment.append(document.createTextNode(part));});
      text.replaceWith(fragment);
    }
  }
  function compose() {
    const lesson=document.getElementById('step-5-1');
    if(!lesson?.dataset.offerLesson||lesson.dataset.actionEditorial)return;
    // The library supplies the original copy handlers. Wait until they are attached.
    if(lesson.querySelectorAll('.home-offer-source-copy').length!==3)return;
    lesson.dataset.actionEditorial='true';
    // Native completion owns persistence. Reflect its class in the existing accessible control
    // after all click listeners have run (their microtasks can otherwise expose the old state).
    const completion=lesson.querySelector('[data-chk]');
    const syncCompletion=()=>{const value=String(lesson.classList.contains('done'));if(completion.getAttribute('aria-checked')!==value)completion.setAttribute('aria-checked',value);};
    syncCompletion();
    new MutationObserver(syncCompletion).observe(lesson,{attributes:true,attributeFilter:['class']});
    const sections=[...lesson.querySelectorAll('.offer-content > .sst')];
    const types=['receive','compare','respond','negotiate','multiple','application','takeaway'];
    sections.forEach((section,index)=>{
      section.classList.add('action-'+types[index]);
      const heading=section.querySelector('.sst-title');
      // Lowercase is purely typographic: all original heading characters remain in the DOM.
      if(heading){
        const label=make('span','action-title-label');label.append(...heading.childNodes);heading.append(label);
        for(const node of [...label.childNodes]){
          if(node.nodeType!==Node.TEXT_NODE||!node.data.trim())continue;
          const text=node.data,capitals=new Set(),first=text.search(/[A-ZÀ-ÖØ-Þ]/);
          if(first>=0)capitals.add(first);
          const brand=text.indexOf('VENDU PAR MOI');if(brand>=0)[0,6,10].forEach(offset=>capitals.add(brand+offset));
          const tool=text.indexOf('MES OFFRES');if(tool>=0)capitals.add(tool);
          const fragment=document.createDocumentFragment();let start=0;
          [...capitals].sort((a,b)=>a-b).forEach(index=>{fragment.append(document.createTextNode(text.slice(start,index)));const cap=make('span','action-capital');cap.textContent=text[index];fragment.append(cap);start=index+1;});
          fragment.append(document.createTextNode(text.slice(start)));node.replaceWith(fragment);
        }
      }
    });
    const content=index=>sections[index].querySelector('.sst-text');
    const ps=index=>[...content(index).children].filter(n=>n.tagName==='P');
    // The actual tool is pictured in its genuine empty state, with no customer information.
    const receive=ps(0);
    group(receive[0],receive[3],'action-reception-intro');
    steps(receive.slice(1,4),'action-process');
    group(receive[4],receive[5],'action-legal');
    const screenshot=make('figure','action-tool-capture'),image=make('img','');
    image.src='/images/formation/action/mes-offres-reel.png';
    image.alt='Rubrique réelle Mes offres de Vendu Par Moi, sans offre ni donnée client';
    image.width=1100;image.height=540;image.loading='lazy';
    screenshot.append(image);content(0).querySelector('.action-reception-intro').after(screenshot);
    // Same two proposals, same order. Bars represent only their actual prices (baseline zero).
    const comparison=ps(1),cards=make('div','action-comparison');comparison[1].before(cards);
    for(const [first,last]of [[1,3],[4,6]]){
      const lastNode=comparison[last].nextSibling?.nodeType===Node.TEXT_NODE?comparison[last].nextSibling:comparison[last];
      const card=group(comparison[first],lastNode,'action-buyer','article');
      comparison[first+1].classList.add('action-price');
      emphasize(comparison[first+1]);cards.append(card);
    }
    group(comparison[7],comparison.at(-1),'action-comparison-reading');
    // These are channel-neutral written models: correspondence, with no invented subject/address.
    const headings=[...content(2).querySelectorAll(':scope > h4')];
    headings.forEach((heading,index)=>{
      const last=headings[index+1]?.previousSibling||content(2).lastChild;
      const response=group(heading,last,'action-response','article');
      const paragraphs=[...response.querySelectorAll(':scope > p')];
      const start=paragraphs.find(p=>p.textContent.startsWith('« Bonjour'));
      const end=paragraphs.find(p=>p.textContent.includes('[Votre prénom]'));
      if(start&&end){
        const mail=group(start,end,'action-correspondence');
        const chrome=make('div','action-mail-chrome');chrome.setAttribute('aria-hidden','true');
        chrome.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg><span></span><span></span><span></span>';
        mail.prepend(chrome);
        // Keep the original copy control and surrounding whitespace in place.
      }
    });
    // Keep the five original method paragraphs, then the complete worked example and dialogue.
    const negotiation=ps(3);
    steps(negotiation.slice(4,9),'action-method');
    const example=content(3).querySelector('h4');
    group(example,negotiation.at(-1),'action-worked-example');
    emphasize(content(3));
    content(3).querySelectorAll('.tail-comic-panel').forEach(panel=>{
      panel.classList.add(panel.querySelector('.nc-dial-who.v')?'action-seller':'action-buyer-speech');
    });
    const multiple=ps(4);
    group(multiple[0],multiple[1],'action-multiple-intro');
    group(multiple[2],multiple[3],'action-discretion');
    group(multiple[4],multiple[5],'action-legal');
    steps(ps(5).slice(0,3),'action-application-steps');
    ps(5).at(-1)?.classList.add('action-final-check');
    const takeaway=ps(6);group(takeaway[0],takeaway[1],'action-takeaway-lead');
  }
  compose();new MutationObserver(compose).observe(root,{childList:true,subtree:true});
})();
