// Generates static PDF/DOCX placeholder documents for the biblio toolkit
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../public/documents');

function pdf(title, sections) {
  const enc = s => s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x00-\xFF]/g, '?');

  const lines = [];
  lines.push('BT');
  lines.push('/F2 18 Tf');
  lines.push('56 800 Td');
  lines.push(`(${enc(title)}) Tj`);
  lines.push('0 -10 Td');
  lines.push('/F1 9 Tf');
  lines.push('(Vendu Par Moi  \xB7  venduparmoi.fr) Tj');
  lines.push('0 -28 Td');

  sections.forEach(({ head, items }) => {
    if (head) {
      lines.push('/F2 12 Tf');
      lines.push(`(${enc(head)}) Tj`);
      lines.push('0 -6 Td');
      lines.push('/F1 10 Tf');
    }
    items.forEach(item => {
      lines.push(`(${enc(item)}) Tj`);
      lines.push('0 -16 Td');
    });
    lines.push('0 -10 Td');
  });

  lines.push('ET');
  const stream = lines.join('\n');
  const slen = Buffer.byteLength(stream, 'latin1');

  const hdr  = '%PDF-1.4\n';
  const o1   = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const o2   = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const o3   = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n'
             + '/Resources << /Font <<\n'
             + '  /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n'
             + '  /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n'
             + '>> >> /Contents 4 0 R >>\nendobj\n';
  const o4   = `4 0 obj\n<< /Length ${slen} >>\nstream\n${stream}\nendstream\nendobj\n`;

  const off1 = hdr.length;
  const off2 = off1 + o1.length;
  const off3 = off2 + o2.length;
  const off4 = off3 + o3.length;
  const xrefOff = off4 + Buffer.byteLength(o4, 'latin1');

  const pad = n => String(n).padStart(10, '0');
  const xref    = `xref\n0 5\n0000000000 65535 f \n${pad(off1)} 00000 n \n${pad(off2)} 00000 n \n${pad(off3)} 00000 n \n${pad(off4)} 00000 n \n`;
  const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF\n`;

  return Buffer.from(hdr + o1 + o2 + o3 + o4 + xref + trailer, 'latin1');
}

// Minimal OOXML DOCX (single-file ZIP with word/document.xml)
function docx(title, paragraphs) {
  // We don't have JSZip — generate a valid .docx via raw ZIP bytes would be complex.
  // Instead write an RTF file with .docx extension so it opens in Word/LibreOffice.
  const rtfParas = paragraphs.map(p => `\\pard\\sa200 ${p}\\par\n`).join('');
  const content = `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Times New Roman;}}\n{\\f0\\fs28\\b ${title}}\\par\\par\n${rtfParas}}`;
  return Buffer.from(content, 'latin1');
}

// ─── DOCUMENTS ──────────────────────────────────────────────────────────────

const docs = [

  ['guide-vendeur.pdf', pdf('Guide du vendeur particulier', [
    { head: '1. Pourquoi vendre sans agence ?', items: [
      'Economisez 3 a 5 % du prix de vente (souvent 10 000 a 25 000 euros).',
      'Vous restez maitre du processus : visites, negociation, calendrier.',
      'Vendu Par Moi vous fournit tous les outils professionnels.',
    ]},
    { head: '2. Les etapes cles de la vente', items: [
      'Etape 1  Estimation du prix de marche (DVF, Meilleurs Agents)',
      'Etape 2  Reunion des diagnostics obligatoires (DPE, Amiante, Plomb...)',
      'Etape 3  Publication de l\'annonce (SeLoger, Leboncoin, Bien\'ici)',
      'Etape 4  Visites et qualification des acheteurs',
      'Etape 5  Reception et negociation des offres',
      'Etape 6  Signature du compromis chez le notaire',
      'Etape 7  Acte authentique et remise des cles',
    ]},
    { head: '3. Vos obligations legales', items: [
      'Fournir le Dossier de Diagnostic Technique (DDT) complet.',
      'Indiquer le prix net vendeur dans l\'annonce (loi ALUR).',
      'Repondre de la garantie des vices caches.',
      'Informer sur les servitudes, hypotheques, copropriete.',
    ]},
    { head: '4. Conseils pratiques', items: [
      'Fixez un prix juste des le depart : les baisses successives freinent les acheteurs.',
      'Soignez les photos : 80 % des acheteurs decident en 20 secondes.',
      'Repondez aux appels dans les 2 heures : la reactivite rassure.',
      'Faites signer un bon de visite a chaque acheteur.',
    ]},
  ])],

  ['checklist-visite.pdf', pdf('Checklist preparation d\'une visite', [
    { head: 'La veille de la visite', items: [
      '☐  Confirmer le rendez-vous par SMS ou email',
      '☐  Aerer toutes les pieces (30 min minimum)',
      '☐  Ranger et depersonnaliser les espaces',
      '☐  Nettoyer cuisine, salle de bain, WC',
      '☐  Sortir les poubelles',
      '☐  Preparer le dossier complet (diagnostics, charges...)',
    ]},
    { head: 'Le jour J - avant l\'arrivee', items: [
      '☐  Ouvrir les volets et allumer les lumieres',
      '☐  Chauffer ou rafraichir selon la saison',
      '☐  Faire du cafe ou allumer une bougie discrete',
      '☐  Garage/parking : libre et accessible',
      '☐  Animaux : sortis ou en cage',
    ]},
    { head: 'Pendant la visite', items: [
      '☐  Accueillir sans forcer la conversation',
      '☐  Accompagner sans suivre pas a pas',
      '☐  Mettre en valeur les points forts naturellement',
      '☐  Repondre honnement aux questions',
      '☐  Faire signer le bon de visite',
      '☐  Remettre une fiche descriptive papier',
    ]},
    { head: 'Apres la visite', items: [
      '☐  Enregistrer les coordonnees et les retours',
      '☐  Envoyer un email de remerciement sous 24h',
      '☐  Relancer si pas de retour apres 3 jours',
    ]},
  ])],

  ['bon-de-visite.pdf', pdf('Bon de visite', [
    { head: 'Identification du bien', items: [
      'Adresse : ....................................................................',
      'Type de bien : ....................  Surface : ..........  Etage : .......',
      'Prix de vente affiché : ....................................................',
    ]},
    { head: 'Identification de l\'acheteur potentiel', items: [
      'Nom et Prenom : ............................................................',
      'Adresse : ....................................................................',
      'Telephone : ................................  Email : ......................',
      'Piece d\'identite (type et n\xB0) : ..............................................',
    ]},
    { head: 'Declaration', items: [
      'Je soussigne(e) confirme avoir visite le bien designe ci-dessus',
      'en date du ....../....../......, en presence du vendeur.',
      '',
      'Je reconnais que cette visite a ete organisee directement',
      'avec le vendeur, sans intermediaire, et qu\'aucun mandat',
      'd\'agence ne couvre ce bien pour cette transaction.',
      '',
      'Signature de l\'acheteur :               Signature du vendeur :',
      '',
      '',
      '..............................          ..............................',
    ]},
  ])],

  ['bon-de-visite.docx', docx('Bon de visite', [
    'Adresse du bien : ....................................................................',
    'Visiteur (Nom, Prenom) : ............................................................',
    'Date de visite : ...../...../.....',
    'Signature acheteur :                        Signature vendeur :',
  ])],

  ['diagnostics-obligatoires.pdf', pdf('Diagnostics immobiliers obligatoires', [
    { head: 'Diagnostics selon l\'age du bien', items: [
      'DPE - Diagnostic de Performance Energetique  (tous les biens)',
      'Amiante - biens construits avant le 1er juillet 1997',
      'Plomb (CREP) - biens construits avant le 1er janvier 1949',
      'Electricite - installation de plus de 15 ans',
      'Gaz - installation de plus de 15 ans',
      'Assainissement non collectif - si fosse septique',
      'Termites - zones arretees par prefecture',
      'Etat des risques (ERP) - tous les biens',
      'Bruit - zones aeroportuaires',
    ]},
    { head: 'Validite des diagnostics', items: [
      'DPE : 10 ans (sauf travaux)',
      'Amiante : illimite si absence ; 3 ans si presence',
      'Plomb : illimite si absence ; 1 an si presence',
      'Electricite / Gaz : 3 ans',
      'Termites : 6 mois',
      'ERP : 6 mois',
    ]},
    { head: 'Cout indicatif (diagnostiqueur certifie)', items: [
      'Pack complet appartement : 150 a 300 euros',
      'Pack complet maison : 300 a 600 euros',
      'DPE seul : 100 a 150 euros',
      'Comparez les devis sur Quotatis ou Check\&Diag.',
    ]},
    { head: 'Attention', items: [
      'Un diagnostic manquant peut annuler la vente ou entrainer',
      'la responsabilite du vendeur. Rassemblez-les AVANT de publier.',
    ]},
  ])],

  ['offre-achat-modele.docx', docx('Modele d\'offre d\'achat', [
    'Nom et prenom de l\'acheteur : ....................................................',
    'Adresse : ....................................................................',
    '',
    'Objet : Offre d\'achat pour le bien situe au ...................................',
    '',
    'Monsieur / Madame,',
    '',
    'Par la presente, je vous soumets une offre d\'achat ferme pour votre bien',
    'au prix de ............................  euros (............................),',
    'net vendeur, sans frais d\'agence.',
    '',
    'Cette offre est valable jusqu\'au ....../....../......',
    '',
    'Conditions suspensives :',
    '- Obtention d\'un pret immobilier d\'un montant de ........... euros',
    '  a un taux maximum de ......%, sur une duree de ...... mois.',
    '',
    'Signature : ..............................    Date : ....../....../......',
  ])],

  ['loi-hoguet-particuliers.pdf', pdf('La loi Hoguet et les particuliers', [
    { head: 'Ce que dit la loi Hoguet (loi n\xB0 70-9 du 2 janvier 1970)', items: [
      'La loi Hoguet encadre les professions de l\'immobilier.',
      'Elle s\'applique aux agents immobiliers, pas aux particuliers.',
      'Un particulier peut vendre son bien SANS carte professionnelle.',
    ]},
    { head: 'Ce que vous pouvez faire en tant que particulier', items: [
      'Publier des annonces sur tous les portails immobiliers.',
      'Negocier directement avec les acheteurs.',
      'Signer un compromis de vente devant notaire.',
      'Ne pas mandater d\'agent immobilier (vente directe).',
    ]},
    { head: 'Ce qui est interdit', items: [
      'Exercer l\'activite d\'agent immobilier a titre professionnel sans carte.',
      'Percevoir une commission pour avoir mis en relation acheteur/vendeur',
      'si vous n\'etes pas le proprietaire du bien.',
    ]},
    { head: 'Votre protection', items: [
      'En tant que vendeur particulier, vous beneficiez de :',
      '- La garantie des vices caches (article 1641 du Code civil)',
      '- L\'obligation d\'information pre-contractuelle',
      '- Le droit de retractation de l\'acheteur (10 jours apres compromis)',
    ]},
  ])],

  ['comprendre-compromis.pdf', pdf('Comprendre le compromis de vente', [
    { head: 'Qu\'est-ce que le compromis ?', items: [
      'Le compromis de vente (ou promesse synallagmatique) est le contrat',
      'qui engage vendeur ET acheteur avant l\'acte authentique.',
      'Il est signe chez le notaire (recommande) ou sous seing prive.',
    ]},
    { head: 'Ce qu\'il contient', items: [
      'Identite des parties (vendeur et acheteur)',
      'Description precise du bien (adresse, surface, annexes)',
      'Prix de vente et modalites de paiement',
      'Conditions suspensives (pret, permis de construire...)',
      'Date limite de signature de l\'acte authentique',
      'Montant du depot de garantie (5 a 10 % du prix)',
    ]},
    { head: 'Les conditions suspensives', items: [
      'Condition pret : si l\'acheteur n\'obtient pas son financement,',
      '  il peut se retirer sans penalite et recuperer son depot.',
      'Absence de servitude cachee, de preemption...',
    ]},
    { head: 'Delais importants', items: [
      'Droit de retractation acheteur : 10 jours apres signature',
      'Delai moyen entre compromis et acte : 3 mois',
      'Acte authentique : signature chez le notaire',
      'Remise des cles : le jour de l\'acte authentique',
    ]},
  ])],

  ['calculateur-prix.xlsx', (() => {
    const csv = [
      'Calculateur de prix de vente - Vendu Par Moi',
      '',
      'Surface habitable (m2);',
      'Prix moyen au m2 dans votre secteur (€);',
      'Estimation de base (m2 x prix/m2);=A3*A4',
      '',
      'Ajustements',
      'Etage avec ascenseur (+3%);=A5*0.03',
      'Dernier etage vue degagee (+8%);=A5*0.08',
      'Rez-de-chaussee (-7%);=-A5*0.07',
      'Travaux importants (-15%);=-A5*0.15',
      'DPE F ou G (-10%);=-A5*0.10',
      'Parking inclus (+5%);=A5*0.05',
      'Jardin privatif (+8%);=A5*0.08',
      '',
      'PRIX ESTIME;=A5+SOMME(A9:A15)',
      'Fourchette basse (-5%);=A16*0.95',
      'Fourchette haute (+5%);=A16*1.05',
      '',
      'Economie sans agence (3%);=A16*0.03',
      'Economie sans agence (5%);=A16*0.05',
    ].join('\n');
    return Buffer.from(csv, 'utf8');
  })()],

  ['guide-negociation.pdf', pdf('Guide de negociation immobiliere', [
    { head: 'Comprendre la marge de negociation', items: [
      'La marge de negociation moyenne en France : 4 a 6 %.',
      'Un bien bien price se negocie peu ; un bien sur-price, beaucoup.',
      'Votre objectif : defendre votre prix juste, pas ceder par fatigue.',
    ]},
    { head: 'Repondre a une offre basse', items: [
      '1. Ne refusez jamais sechemment : "Je prends note, je reflechis."',
      '2. Analysez le profil : acheteur serieux ou chasseur de bonnes affaires ?',
      '3. Faites une contre-proposition precise : -1 % max pour rester carre.',
      '4. Justifiez votre prix avec des elements concrets (DPE, travaux recents...).',
    ]},
    { head: 'Techniques de negociation', items: [
      'Le silence : apres votre contre-proposition, attendez.',
      'L\'ancrage : commencez par valoriser avant de negocier.',
      'La reciprocite : "Je baisse de X si vous renoncez a la condition Y."',
      'La limite fictive : "C\'est ma derniere offre, j\'ai une visite demain."',
    ]},
    { head: 'Signaux d\'alerte', items: [
      'Acheteur qui cherche a court-circuiter le notaire : refusez.',
      'Demande de remise cash hors contrat : illegal, refusez.',
      'Pression sur les diagnostics : tenez-vous en aux faits.',
    ]},
  ])],

  ['suivi-offres.xlsx', (() => {
    const csv = [
      'Suivi des offres - Vendu Par Moi',
      '',
      'N°;Acheteur;Telephone;Email;Date offre;Montant offre (€);Condition pret;Apport;Statut;Notes',
      '1;;;;;;Oui/Non;;;',
      '2;;;;;;Oui/Non;;;',
      '3;;;;;;Oui/Non;;;',
      '4;;;;;;Oui/Non;;;',
      '5;;;;;;Oui/Non;;;',
    ].join('\n');
    return Buffer.from(csv, 'utf8');
  })()],

  ['home-staging-guide.pdf', pdf('Guide Home Staging', [
    { head: 'Principe du home staging', items: [
      'Le home staging consiste a valoriser votre bien sans travaux lourds.',
      'Budget indicatif : 1 a 3 % du prix de vente, ROI souvent x3.',
      'Objectif : permettre a l\'acheteur de se projeter.',
    ]},
    { head: 'Les 5 regles d\'or', items: [
      '1. Depersonnaliser : retirez photos de famille, objets tres specifiques.',
      '2. Desencombrer : meubles et objets superflus en garde-meuble.',
      '3. Reparer : poignees cassees, joints noircis, ampoules grillee.',
      '4. Nettoyer : sol, vitres, cuisine et salle de bain impeccables.',
      '5. Neutraliser : peintures tres marquees -> blanc casse ou gris clair.',
    ]},
    { head: 'Pieces prioritaires', items: [
      'Entree : premiere impression decisive. Proprete, lumiere, odeur neutre.',
      'Sejour : valoriser l\'espace, la lumiere. Retirer meubles encombrants.',
      'Cuisine : plan de travail vide, robinetterie chrome, rangements ordonnes.',
      'Salle de bain : serviettes neuves assorties, miroir sans traces.',
      'Chambres : literie blanche, stores ou rideaux clairs.',
    ]},
    { head: 'Budget type pour un appartement 60 m2', items: [
      'Peinture partielle : 200 a 400 euros (materiel ou artisan)',
      'Accessoires (coussins, tapis, cadres) : 100 a 200 euros',
      'Nettoyage professionnel : 150 a 250 euros',
      'Total : environ 500 a 850 euros pour +10 000 euros de valeur percue',
    ]},
  ])],

  ['preparation-visite.pdf', pdf('Preparer sa maison pour les visites', [
    { head: 'La semaine avant', items: [
      'Reparer les petites deteriorations visibles (silicone, peinture...)',
      'Trier et stocker les affaires personnelles en exces',
      'Commander ou nettoyer la literie et les serviettes',
      'Verifier toutes les ampoules et les interrupteurs',
    ]},
    { head: 'La veille', items: [
      'Passer l\'aspirateur et laver les sols',
      'Nettoyer vitres et miroirs',
      'Vider les poubelles et sortir les recyclables',
      'Preparer le dossier vendeur : diagnostics, charges, plans',
      'Confirmer le rendez-vous avec l\'acheteur',
    ]},
    { head: 'Le matin de la visite', items: [
      'Ouvrir volets et fenetres 30 min (puis refermer si froid)',
      'Allumer toutes les lumieres pour lumiere homogene',
      'Mettre musique douce et discrete en fond',
      'Chauffer a 19-20 degres en hiver',
      'Preparer carnet de notes pour noter les retours',
    ]},
    { head: 'Pendant la visite', items: [
      'Commencez par la piece la plus flatteuse',
      'Laissez l\'acheteur explorer a son rythme',
      'Repondez honnement, ne sur-vendez pas',
      'Faites signer le bon de visite avant de partir',
      'Notez les objections pour les anticiper a la prochaine visite',
    ]},
  ])],

  ['fiche-bien.docx', docx('Fiche descriptive du bien', [
    'Adresse complete : ....................................................................',
    'Type : ................  Surface hab. : ..........m2  Annee de construction : ......',
    'Etage : ......  Exposition : ............  Statut : Proprietaire occupant / Libre',
    '',
    'Description generale :',
    '....................................................................',
    '....................................................................',
    '',
    'Pieces : Sejour ...m2 | Cuisine ...m2 | Ch.1 ...m2 | Ch.2 ...m2 | SDB ...m2',
    '',
    'Equipements : DV Oui/Non | Parquet Oui/Non | Cave Oui/Non | Parking Oui/Non',
    '',
    'DPE : Classe ... | GES : Classe ...',
    'Charges mensuelles : .......euros | Taxe fonciere : .......euros/an',
    '',
    'Prix : .......euros net vendeur (sans commission d\'agence)',
    'Contact : ............................  Tel : .............................',
  ])],

];

let ok = 0;
docs.forEach(([name, buf]) => {
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('  OK', name, `(${buf.length} bytes)`);
  ok++;
});
console.log(`\n${ok} documents generes dans public/documents/`);
