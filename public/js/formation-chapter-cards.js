/* Presentation only: reuse chapter 1's illustrated card component. */
(() => {
  'use strict';
  const chapterOneDescriptions = [];
  function decorate(mi) {
    const panel = document.querySelector(mi === 0 ? '.estimate-chapter' : '.chapter-panel');
    if (!panel) return;
    panel.classList.add('vpm-chapter-presentation');
    const chapterPhoto = panel.querySelector('img.estimate-photo,img.chapter-photo');
    if (chapterPhoto && !chapterPhoto.parentElement.classList.contains('vpm-chapter-visual')) {
      const visual = document.createElement('figure');
      visual.className = 'vpm-chapter-visual';
      visual.setAttribute('aria-hidden','true');
      chapterPhoto.before(visual);
      visual.append(chapterPhoto);
    }
    if (mi !== 0) {
      const intro=panel.querySelector('.chapter-intro');
      const paragraphs=Array.from(intro.children).filter(node=>node.tagName==='P');
      if(paragraphs.length>1) {
        const details=document.createElement('details');details.className='vpm-chapter-context';
        const summary=document.createElement('summary');summary.textContent='Présentation du chapitre';details.append(summary);
        paragraphs.slice(1).forEach(node=>details.append(node));
        panel.querySelector('.chapter-hero').after(details);
      }
      const heading=intro.querySelector('h2');
      const endings=['','ma vente','et mes photos','mes visites','','et je conclus'];
      const ending=endings[mi];
      if(ending && heading.textContent.endsWith(ending)) {
        const full=heading.textContent;heading.replaceChildren();
        const first=document.createElement('span');first.textContent=full.slice(0,-ending.length);
        const last=document.createElement('em');last.textContent=ending;heading.append(first,last);
      }
    }
    const nav = panel.querySelector(mi === 0 ? '.estimate-lessons' : '.chapter-lessons');
    if (!nav) return;
    nav.classList.add('vpm-illustrated-lessons');
    nav.style.setProperty('--lesson-count', MODULES[mi].steps.length);
    const buttons = Array.from(nav.children);
    buttons.forEach((button,si) => {
      const photo = vpmLessonPhoto(mi,si);
      const filename = photo.file;
      const oldIcon = button.querySelector('.estimate-card-icon svg,.lesson-pictogram');
      const oldDescription = button.querySelector('.estimate-card-desc');
      if (mi === 0 && oldDescription) chapterOneDescriptions[si] = oldDescription.textContent;
      const icon = oldIcon ? oldIcon.cloneNode(true) : null;
      button.replaceChildren();
      button.classList.add('vpm-illustrated-card');
      button.dataset.lessonPhoto = filename;
      const frame = document.createElement('div');frame.className='estimate-card-photo';frame.setAttribute('aria-hidden','true');
      const image=document.createElement('img');image.src='/images/formation/cartes-validees/'+filename;image.alt='';image.width=photo.width;image.height=photo.height;frame.append(image);
      const number=document.createElement('span');number.className='estimate-card-num';number.textContent=`${mi+1}.${si+1}`;frame.append(number);
      const circle=document.createElement('div');circle.className='estimate-card-icon';circle.setAttribute('aria-hidden','true');if(icon)circle.append(icon);
      const body=document.createElement('div');body.className='estimate-card-body';
      const title=document.createElement('strong');title.className='estimate-card-title';title.textContent=MODULES[mi].steps[si].title.replace(/^◆\s*/,'');
      const description=document.createElement('p');description.className='estimate-card-desc';
      // Chapters 2–6 had no editorial card descriptions. Use their existing metadata,
      // rather than importing the mockup's invented summaries.
      description.textContent=mi===0 ? chapterOneDescriptions[si] : MODULES[mi].steps[si].meta || '';
      body.append(title,description);
      const arrow=document.createElement('span');arrow.className='estimate-card-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='→';
      button.append(frame,circle,body,arrow);
    });
  }
  const originalEstimate = renderEstimateChapter;
  renderEstimateChapter = function(...args) { const result=originalEstimate.apply(this,args);if(activeModule===0)decorate(0);return result; };
  const originalChapter = renderChapterPanel;
  renderChapterPanel = function(mi,...args) { const result=originalChapter.call(this,mi,...args);if(mi!==0)decorate(mi);return result; };
  renderEstimateChapter();renderChapterPanel(activeModule);applyFormationView();
})();
