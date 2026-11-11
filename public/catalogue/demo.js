/* Aperçu volontaire : fixtures en mémoire, aucune écriture et aucun contact vendeur. */
(function () {
  const host = location.hostname;
  if (!(host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host)) || new URLSearchParams(location.search).get('apercu') !== 'annonces') return;
  const images = ['/images/catalogue-maison-a-vendre.webp', '/images/formation/chapitre5/section-12-salon.jpg', '/images/guide/ch5-maison.png'];
  const rows = [
    ['Maison avec jardin', 'Arras', '62000', 'Maison', 289000, 135, 4, ['Jardin', 'Terrasse'], 2],
    ['Appartement lumineux', 'Lille', '59000', 'Appartement', 245000, 78, 2, ['Lumineux', 'Centre-ville'], 1],
    ['Maison de caractère', 'Douai', '59500', 'Maison', 219000, 112, 3, ['Jardin', 'Charme'], 0],
    ['Maison familiale', 'Valenciennes', '59300', 'Maison', 325000, 158, 5, ['Terrasse', 'Garage'], 2],
    ['Appartement avec cachet', 'Lens', '62300', 'Appartement', 169000, 65, 2, ['Parquet', 'Lumineux'], 1],
    ['Maison au calme', 'Cambrai', '59400', 'Maison', 259000, 124, 3, ['Jardin', 'Terrasse'], 0]
  ];
  const items = rows.map((r, i) => ({ publicId: 'demo-' + i, title: r[0], city: r[1], postalCode: r[2], type: r[3], price: r[4], surface: r[5], bedrooms: r[6], features: r[7], photos: [r[8], (r[8] + 1) % 3].map(n => ({ src: images[n], alt: 'Visuel d’illustration — annonce fictive' })) }));
  const banner = document.createElement('p'); banner.className = 'catalogue-demo-banner'; banner.textContent = 'APERÇU — 6 annonces fictives et photos d’illustration. Aucun de ces biens n’est proposé à la vente.';
  document.querySelector('.catalogue .container').prepend(banner);
  const dialog = document.createElement('dialog'); dialog.className = 'catalogue-demo-dialog';
  dialog.innerHTML = '<button type="button" aria-label="Fermer l’aperçu">×</button><p>ANNONCE FICTIVE · APERÇU DE PRÉSENTATION</p><img alt="Visuel d’illustration"><h2></h2><strong></strong><div></div><p>Les caractéristiques, la localisation et le prix sont inventés. Cette image illustre uniquement la mise en page. Aucun contact ni achat n’est possible.</p>';
  document.body.appendChild(dialog); dialog.querySelector('button').onclick = () => dialog.close();
  window.VpmCatalogueDemo = {
    query(params) {
      const term = (params.get('location') || '').toLocaleLowerCase('fr');
      let list = items.filter(p => (!term || (p.city + ' ' + p.postalCode).toLocaleLowerCase('fr').includes(term)) && (!params.get('type') || p.type === params.get('type')) && (!params.get('surface') || p.surface >= +params.get('surface')) && (!params.get('bedrooms') || p.bedrooms >= +params.get('bedrooms')) && (!params.get('price') || p.price <= +params.get('price')));
      if (params.get('sort') === 'price-asc') list.sort((a,b) => a.price-b.price);
      if (params.get('sort') === 'price-desc') list.sort((a,b) => b.price-a.price);
      return { items: list, total: list.length, countPublished: 6, types: ['Maison', 'Appartement'], page: 1, pages: 1 };
    },
    open(p) {
      dialog.querySelector('img').src = p.photos[0].src; dialog.querySelector('h2').textContent = p.title;
      dialog.querySelector('strong').textContent = new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(p.price);
      dialog.querySelector('div').textContent = p.city + ' · ' + p.surface + ' m² · ' + p.bedrooms + ' chambres'; dialog.showModal();
    }
  };
})();
