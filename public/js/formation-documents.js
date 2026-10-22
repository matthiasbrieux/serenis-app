(() => {
  'use strict';
  document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  let pending = false;
  document.querySelectorAll('.document-button.primary').forEach(link => link.addEventListener('click', async event => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    const links = [...document.querySelectorAll('.document-button.primary')];
    const status = document.querySelector('.document-status');
    links.forEach(item => item.setAttribute('aria-disabled', 'true'));
    status.textContent = 'Préparation de votre PDF…';
    try {
      const response = await fetch(link.href, { headers: { Accept: 'application/pdf' } });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('PDF indisponible');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = url;
      download.download = `Vendu-Par-Moi-${location.pathname.split('/').pop()}.pdf`;
      document.body.append(download); download.click(); download.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'Votre PDF est prêt. Retrouvez-le dans vos téléchargements.';
    } catch {
      status.textContent = 'Le PDF n’a pas pu être généré. Réessayez ou utilisez « Imprimer la fiche » pour enregistrer en PDF.';
    } finally {
      pending = false;
      links.forEach(item => item.removeAttribute('aria-disabled'));
    }
  }));
})();
