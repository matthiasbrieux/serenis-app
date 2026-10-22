/* Presentation only. Original masthead text and pedagogical content stay in place. */
(() => {
  const container=document.getElementById('modContainer');
  function calibrate(){
    container.querySelectorAll('.step-card .lesson-masthead:not(.vpm-calibrated)').forEach(header=>{
      const match=header.closest('.step-card').id.match(/^step-(\d+)-(\d+)$/);
      if(!match)return;
      const photo=vpmLessonPhoto(Number(match[1]),Number(match[2]));
      const frame=document.createElement('figure');frame.className='vpm-lesson-photo';frame.setAttribute('aria-hidden','true');
      const image=document.createElement('img');image.src='/images/formation/cartes-validees/'+photo.file;image.alt='';image.width=photo.width;image.height=photo.height;
      frame.append(image);header.append(frame);header.classList.add('vpm-calibrated');
      frame.style.position='relative';
      header.dataset.lessonPhoto=photo.file;

    });
  }
  calibrate();new MutationObserver(calibrate).observe(container,{childList:true,subtree:true});
})();
