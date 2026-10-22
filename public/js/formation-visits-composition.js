/* Lesson 4.1 only. Text comes from the validated source, restored separately. */
(() => {
  const container = document.getElementById('modContainer');
  if (!container) return;
  const image = (src, alt, cls) => {
    const figure = document.createElement('figure');
    figure.className = cls;
    const img = document.createElement('img');
    img.src = src; img.alt = alt; img.loading = 'eager';
    const picture=document.createElement('picture');const source=document.createElement('source');source.media='(max-width:600px)';source.srcset=src.replace('.png','-iphone.png');picture.append(source,img);figure.append(picture);
    return figure;
  };
  function compose() {
    const lesson = document.getElementById('step-3-0');
    if (!lesson || lesson.dataset.visitsComposition) return;
    lesson.dataset.visitsComposition = 'true';
    const hero = image('/images/formation/qualification/agenda-reel-calendrier.png', 'Capture de l’agenda existant : calendrier des disponibilités et des visites.', 'visits-hero-visual');
    lesson.querySelector('.lesson-masthead').append(hero);
    const sections = lesson.querySelectorAll('.step-body > .sst');
    ['intro','dossier','availability','organisation','booking','action','takeaway'].forEach((name,i) => sections[i]?.classList.add('visits-'+name));
    const intro = sections[0].querySelector('.sst-text');
    const paragraphs = [...intro.children];
    const tools = document.createElement('div'); tools.className = 'visits-tools';
    for (const index of [1,3]) {
      const tool = document.createElement('div'); tool.className = 'visits-tool';
      tool.append(paragraphs[index], paragraphs[index+1]); tools.append(tool);
    }
    paragraphs[0].after(tools);
    const confidentiality = sections[1].querySelector('.sst-text > p:last-child');
    confidentiality.classList.add('visits-confidentiality');
    const availability = sections[2].querySelector('.sst-text');
    const copy = document.createElement('div'); copy.className = 'visits-availability-copy';
    copy.append(...availability.children); availability.append(copy);
    availability.append(image('/images/formation/qualification/agenda-reel-disponibilite.png', 'Capture réelle : Ajouter une disponibilité, date, horaires et Enregistrer cette disponibilité.', 'visits-availability-screen'));
    sections[3].querySelector('.sst-text').classList.add('visits-advice');
    const booking = sections[4].querySelector('.sst-text');
    const steps = [...booking.children];
    const chronology = document.createElement('ol'); chronology.className = 'visits-chronology';
    for (let i=1; i<=7; i+=2) {
      const item = document.createElement('li'); item.append(steps[i], steps[i+1]); chronology.append(item);
    }
    steps[0].after(chronology);
    const warning = document.createElement('aside'); warning.className = 'visits-financial-warning';
    warning.append(...[...booking.children].filter(el=>el.tagName==='P' && el!==steps[0])); booking.append(warning);
  }
  compose();
  new MutationObserver(compose).observe(container, {childList:true, subtree:true});
})();
