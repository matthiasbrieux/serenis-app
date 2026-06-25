const sgMail = require('@sendgrid/mail');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'contact@venduparmoi.fr';
const FROM_NAME  = 'Vendu Par Moi';
const BASE_URL   = process.env.BASE_URL || 'https://venduparmoi.fr';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// ── Helper : envoyer un email via SendGrid ────────────────────
async function send(to, subject, html) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn(`[EMAIL] SENDGRID_API_KEY manquant — email non envoyé à ${to} : ${subject}`);
    return false;
  }
  try {
    await sgMail.send({ to, from: { email: FROM_EMAIL, name: FROM_NAME }, subject, html });
    console.log(`[EMAIL] ✓ Envoyé → ${to} : ${subject}`);
    return true;
  } catch (e) {
    console.error(`[EMAIL] ✗ Erreur → ${to} : ${e?.response?.body?.errors?.[0]?.message || e.message}`);
    return false;
  }
}

// ── Gabarit HTML commun ───────────────────────────────────────
function layout(content, { preheader = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Vendu Par Moi</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#F5F0E8;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Logo -->
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="font-size:20px;font-weight:700;color:#3D5A47;letter-spacing:-0.5px;">Vendu Par Moi</span>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#ffffff;border-radius:16px;padding:40px 40px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        ${content}
      </td></tr>

      <!-- Footer -->
      <tr><td align="center" style="padding:28px 0 0;font-size:12px;color:#9a9087;line-height:1.7;">
        <a href="${BASE_URL}" style="color:#3D5A47;text-decoration:none;font-weight:600;">venduparmoi.fr</a> &nbsp;·&nbsp;
        <a href="mailto:contact@venduparmoi.fr" style="color:#9a9087;text-decoration:none;">contact@venduparmoi.fr</a><br/>
        Vous recevez cet email car vous utilisez la plateforme Vendu Par Moi.
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Composants réutilisables ──────────────────────────────────
function h1(text) {
  return `<h1 style="font-size:24px;font-weight:700;color:#3D5A47;margin:0 0 8px;">${text}</h1>`;
}
function h2(text) {
  return `<h2 style="font-size:18px;font-weight:600;color:#3D5A47;margin:24px 0 8px;">${text}</h2>`;
}
function p(text) {
  return `<p style="font-size:15px;color:#4a4540;line-height:1.65;margin:0 0 16px;">${text}</p>`;
}
function muted(text) {
  return `<p style="font-size:13px;color:#9a9087;line-height:1.6;margin:0 0 12px;">${text}</p>`;
}
function btn(label, url, color = '#3D5A47') {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:${color};color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">${label}</a>
  </div>`;
}
function divider() {
  return `<hr style="border:none;border-top:1.5px solid #ede7de;margin:24px 0;"/>`;
}
function infoRow(label, value) {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#7a7065;border-bottom:1px solid #f0ebe4;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#3a3530;font-weight:600;border-bottom:1px solid #f0ebe4;">${value}</td>
  </tr>`;
}
function infoTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #ede7de;margin:16px 0;">
    ${rows}
  </table>`;
}
function badge(text, color = '#3D5A47') {
  return `<span style="display:inline-block;background:${color}20;color:${color};font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;margin-bottom:16px;">${text}</span>`;
}

// ─────────────────────────────────────────────────────────────
// 1. BIENVENUE
// ─────────────────────────────────────────────────────────────

async function sendWelcomeEmail({ email, firstName, pack }) {
  const packLabel = pack === 'serenite' ? 'Pack Sérénité' : 'Pack Autonome';
  const html = layout(`
    ${badge(packLabel)}
    ${h1(`Bienvenue, ${firstName || 'cher vendeur'} !`)}
    ${p('Votre espace vendeur Vendu Par Moi est prêt. Vous pouvez dès maintenant créer votre fiche bien, ajouter vos photos et préparer votre dossier acheteur.')}
    ${p('Notre objectif : vous faire gagner un maximum de temps et vous permettre de vendre votre bien dans les meilleures conditions, sans intermédiaire.')}
    ${btn('Accéder à mon espace', `${BASE_URL}/dashboard`)}
    ${divider()}
    ${muted('Si vous avez la moindre question, répondez simplement à cet email — nous vous répondons en moins de 24h.')}
  `, { preheader: `Bienvenue sur Vendu Par Moi — votre espace vendeur est prêt.` });
  return send(email, 'Bienvenue sur Vendu Par Moi 🏡', html);
}

async function sendWelcomeImproved({ email, firstName, pack, loginUrl }) {
  const packLabel = pack === 'serenite' ? 'Pack Sérénité' : 'Pack Autonome';
  const nextSteps = pack === 'serenite'
    ? '<li>Réservez votre séance photo professionnelle</li><li>Créez votre fiche bien</li><li>Préparez vos documents</li>'
    : '<li>Créez votre fiche bien</li><li>Ajoutez vos photos</li><li>Préparez vos documents</li>';
  const html = layout(`
    ${badge(packLabel)}
    ${h1(`C'est parti, ${firstName || 'cher vendeur'} !`)}
    ${p('Votre paiement a bien été reçu. Votre compte est activé et votre espace vendeur est accessible immédiatement.')}
    ${h2('Vos premières étapes')}
    <ol style="font-size:15px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 20px;">
      ${nextSteps}
      <li>Définissez vos créneaux de visite</li>
      <li>Publiez votre annonce</li>
    </ol>
    ${btn('Accéder à mon espace', loginUrl || `${BASE_URL}/dashboard`)}
    ${divider()}
    ${muted('Vendu Par Moi — La vente immobilière entre particuliers, professionnellement accompagnée.')}
  `, { preheader: 'Votre compte est activé — commencez dès maintenant.' });
  return send(email, '✅ Votre compte Vendu Par Moi est activé', html);
}

// ─────────────────────────────────────────────────────────────
// 2. MOT DE PASSE
// ─────────────────────────────────────────────────────────────

async function sendPasswordResetEmail(email, resetUrl) {
  const html = layout(`
    ${h1('Réinitialisation de votre mot de passe')}
    ${p('Vous avez demandé à réinitialiser votre mot de passe Vendu Par Moi. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.')}
    ${btn('Réinitialiser mon mot de passe', resetUrl, '#C4785A')}
    ${divider()}
    ${muted('Ce lien est valable <strong>1 heure</strong>. Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement cet email.')}
  `, { preheader: 'Réinitialisez votre mot de passe Vendu Par Moi.' });
  return send(email, 'Réinitialisation de votre mot de passe', html);
}

// ─────────────────────────────────────────────────────────────
// 3. VISITES
// ─────────────────────────────────────────────────────────────

async function sendVisitConfirmation(buyerEmail, buyerName, property, visitDate, visitTime, isReminder = false) {
  const subjectPrefix = isReminder ? '⏰ Rappel : ' : '✅ Confirmation : ';
  const typeLabel = property.type === 'appartement' ? 'Appartement' : property.type === 'maison' ? 'Maison' : (property.type || 'Bien');
  const formattedDate = new Date(visitDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const html = layout(`
    ${badge(isReminder ? '⏰ Rappel visite' : '✅ Visite confirmée', '#3D5A47')}
    ${h1(isReminder ? `Rappel : votre visite est demain` : `Votre visite est confirmée, ${buyerName || ''} !`)}
    ${p(isReminder
      ? `Nous vous rappelons que vous avez une visite prévue <strong>demain</strong>. Voici les détails ci-dessous.`
      : `Votre demande de visite a bien été enregistrée. Le propriétaire vous attend aux horaires indiqués.`
    )}
    ${infoTable(`
      ${infoRow('Bien', `${typeLabel} — ${property.city || ''}`)}
      ${infoRow('Adresse', property.address || 'Communiquée par le propriétaire')}
      ${infoRow('Date', formattedDate)}
      ${infoRow('Heure', visitTime)}
    `)}
    ${p('Si vous ne pouvez plus vous présenter, merci de prévenir le propriétaire dès que possible.')}
    ${divider()}
    ${muted('Cette visite a été organisée via la plateforme <strong>Vendu Par Moi</strong>.')}
  `, { preheader: `Votre visite est confirmée — ${formattedDate} à ${visitTime}` });

  return send(buyerEmail, `${subjectPrefix}Visite — ${typeLabel} à ${property.city || ''}`, html);
}

async function sendNewVisitRequest({ sellerEmail, buyerName, buyerEmail, buyerPhone, visitDate, visitTime, propertyAddress }) {
  const formattedDate = new Date(visitDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const html = layout(`
    ${badge('📅 Nouvelle visite', '#C4785A')}
    ${h1('Une visite vient d\'être réservée')}
    ${p('Un acheteur a réservé un créneau de visite pour votre bien. Voici ses coordonnées :')}
    ${infoTable(`
      ${infoRow('Nom', buyerName || '—')}
      ${infoRow('Email', buyerEmail || '—')}
      ${infoRow('Téléphone', buyerPhone || '—')}
      ${infoRow('Date', formattedDate)}
      ${infoRow('Heure', visitTime)}
      ${propertyAddress ? infoRow('Bien', propertyAddress) : ''}
    `)}
    ${btn('Voir mes visites', `${BASE_URL}/mon-agenda`)}
    ${divider()}
    ${muted('Vous recevez cet email car un créneau de votre agenda a été réservé.')}
  `, { preheader: `Nouvelle visite réservée — ${formattedDate} à ${visitTime}` });
  return send(sellerEmail, '📅 Nouvelle visite réservée', html);
}

// Alias pour compatibilité avec buyer.js
async function sendVisitRequestReceived({ sellerEmail, buyerName, buyerEmail, buyerPhone, visitDate, visitTime, propertyAddress }) {
  return sendNewVisitRequest({ sellerEmail, buyerName, buyerEmail, buyerPhone, visitDate, visitTime, propertyAddress });
}

// ─────────────────────────────────────────────────────────────
// 4. DOSSIER ACHETEUR
// ─────────────────────────────────────────────────────────────

async function sendDossierEmail({ to, buyerName, dossierUrl, propertyCity, propertyType }) {
  const typeLabel = propertyType === 'appartement' ? 'Appartement' : propertyType === 'maison' ? 'Maison' : (propertyType || 'Bien');
  const html = layout(`
    ${badge('📁 Dossier bien')}
    ${h1(`Voici le dossier du bien à ${propertyCity || ''}`)}
    ${p(`Bonjour${buyerName ? ` ${buyerName}` : ''},`)}
    ${p(`Le propriétaire vous fait parvenir le dossier complet de son ${typeLabel.toLowerCase()}. Vous y trouverez toutes les informations utiles : description du bien, photos, diagnostics et disponibilités pour une visite.`)}
    ${btn('Accéder au dossier', dossierUrl, '#3D5A47')}
    ${divider()}
    ${muted('Ce dossier a été préparé par le propriétaire du bien via la plateforme <strong>Vendu Par Moi</strong>. Vente entre particuliers.')}
  `, { preheader: `Le dossier du bien à ${propertyCity} vous a été envoyé.` });
  return send(to, `📁 Dossier bien — ${typeLabel} à ${propertyCity || ''}`, html);
}

async function sendDossierToNotaire({ to, notaireName, dossierUrl, propertyAddress, sellerName }) {
  const html = layout(`
    ${badge('⚖️ Dossier notaire')}
    ${h1('Dossier complet du bien')}
    ${p(`Bonjour${notaireName ? ` ${notaireName}` : ''},`)}
    ${p(`Vous avez été invité à consulter le dossier complet du bien situé au <strong>${propertyAddress || 'adresse communiquée par le propriétaire'}</strong>, dans le cadre d'une vente entre particuliers accompagnée par Vendu Par Moi.`)}
    ${p(`Ce dossier contient l'ensemble des documents (diagnostics, plans, pièces administratives) et les offres d'achat reçues.`)}
    ${btn('Accéder au dossier notaire', dossierUrl, '#3D5A47')}
    ${divider()}
    ${muted(`Bien présenté par ${sellerName || 'le propriétaire'} via la plateforme Vendu Par Moi.`)}
  `, { preheader: `Dossier notaire — ${propertyAddress}` });
  return send(to, `⚖️ Dossier notaire — ${propertyAddress || 'Bien immobilier'}`, html);
}

// ─────────────────────────────────────────────────────────────
// 5. PUBLICATION & VENTE
// ─────────────────────────────────────────────────────────────

async function sendPublishedConfirmation({ email, propertySlug }) {
  const publicUrl = `${BASE_URL}/bien/${propertySlug}`;
  const html = layout(`
    ${badge('🚀 Bien publié', '#3D5A47')}
    ${h1('Votre bien est en ligne !')}
    ${p('Félicitations ! Votre annonce est maintenant publiée et accessible aux acheteurs. Votre numéro dédié est activé : les acheteurs qui vous contactent recevront automatiquement votre dossier.')}
    ${btn('Voir mon annonce', publicUrl)}
    ${h2('Et maintenant ?')}
    <ul style="font-size:14px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 16px;">
      <li>Diffusez votre annonce sur LeBonCoin, SeLoger, PAP...</li>
      <li>Partagez le lien à vos contacts</li>
      <li>Votre agenda est ouvert — les acheteurs peuvent réserver en ligne</li>
      <li>Vous recevrez une notification à chaque nouvelle réservation</li>
    </ul>
    ${divider()}
    ${muted('Suivez vos performances depuis votre espace vendeur.')}
  `, { preheader: 'Votre bien est en ligne — les acheteurs peuvent le consulter.' });
  return send(email, '🚀 Votre bien est en ligne !', html);
}

async function sendSoldCongrats({ email, firstName, address, price }) {
  const priceFormatted = price ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price) : '';
  const html = layout(`
    ${badge('🎉 Vente réalisée', '#C4785A')}
    ${h1(`Félicitations, ${firstName || ''} !`)}
    ${p(`Votre bien${address ? ` situé au <strong>${address}</strong>` : ''} est vendu${priceFormatted ? ` pour <strong>${priceFormatted}</strong>` : ''} !`)}
    ${p('C\'est une excellente nouvelle. Vous avez réussi à vendre entre particuliers, en gardant la maîtrise de votre vente du début à la fin.')}
    ${p('Si vous avez apprécié votre expérience Vendu Par Moi, votre avis compte énormément pour nous — et pour les futurs vendeurs qui se poseront les mêmes questions que vous au départ.')}
    ${btn('Laisser un avis', 'https://g.page/r/venduparmo/review', '#C4785A')}
    ${divider()}
    ${muted('Merci de nous avoir fait confiance. L\'équipe Vendu Par Moi vous souhaite une excellente continuation.')}
  `, { preheader: 'Félicitations — votre bien est vendu !' });
  return send(email, '🎉 Félicitations — Votre vente est réalisée !', html);
}

async function sendPropertySoldToBuyer({ buyerEmail, buyerName, propertyType, propertyCity }) {
  const typeLabel = propertyType === 'appartement' ? 'l\'appartement' : propertyType === 'maison' ? 'la maison' : 'le bien';
  const html = layout(`
    ${h1(`Bonne nouvelle, ${buyerName || ''} !`)}
    ${p(`Nous souhaitions vous informer que ${typeLabel} à <strong>${propertyCity || ''}</strong> que vous avez visité vient de trouver preneur.`)}
    ${p('Si vous êtes toujours à la recherche d\'un bien, n\'hésitez pas à explorer d\'autres annonces sur notre plateforme.')}
    ${btn('Voir les biens disponibles', BASE_URL)}
    ${divider()}
    ${muted('Vendu Par Moi — La vente immobilière entre particuliers.')}
  `, { preheader: `Le bien que vous avez visité à ${propertyCity} est vendu.` });
  return send(buyerEmail, 'Information sur le bien visité', html);
}

// ─────────────────────────────────────────────────────────────
// 6. FACTURE / PAIEMENT
// ─────────────────────────────────────────────────────────────

async function sendInvoiceEmail({ email, firstName, amount, pack, invoiceNumber, date }) {
  const amountTTC = (amount / 100).toFixed(2).replace('.', ',');
  const amountHT  = ((amount / 100) / 1.2).toFixed(2).replace('.', ',');
  const tva       = ((amount / 100) - (amount / 100) / 1.2).toFixed(2).replace('.', ',');
  const packLabel = pack === 'serenite' ? 'Pack Sérénité' : 'Pack Autonome';
  const dateStr   = new Date(date).toLocaleDateString('fr-FR');
  const html = layout(`
    ${badge('🧾 Facture', '#3D5A47')}
    ${h1(`Facture — ${packLabel}`)}
    ${p(`Bonjour ${firstName || ''},`)}
    ${p('Veuillez trouver ci-dessous le détail de votre facture Vendu Par Moi.')}
    ${infoTable(`
      ${infoRow('N° facture', invoiceNumber)}
      ${infoRow('Date', dateStr)}
      ${infoRow('Pack', packLabel)}
      ${infoRow('Montant HT', `${amountHT} €`)}
      ${infoRow('TVA (20%)', `${tva} €`)}
      ${infoRow('Total TTC', `<strong>${amountTTC} €</strong>`)}
    `)}
    ${p('Cette facture fait foi pour votre comptabilité. Conservez-la précieusement.')}
    ${divider()}
    ${muted('Pour toute question, contactez-nous à <a href="mailto:contact@venduparmoi.fr" style="color:#3D5A47;">contact@venduparmoi.fr</a>')}
  `, { preheader: `Votre facture Vendu Par Moi — ${amountTTC} € TTC` });
  return send(email, `🧾 Facture Vendu Par Moi — ${amountTTC} € TTC`, html);
}

// ─────────────────────────────────────────────────────────────
// 7. CONTRAT
// ─────────────────────────────────────────────────────────────

async function sendContractRenewal({ email, firstName, expiryDate, daysLeft }) {
  const expiryStr = new Date(expiryDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const html = layout(`
    ${badge(`⚠️ Contrat — J-${daysLeft}`, '#C4785A')}
    ${h1(`Votre accès expire dans ${daysLeft} jours`)}
    ${p(`Bonjour ${firstName || ''},`)}
    ${p(`Votre contrat Vendu Par Moi arrive à expiration le <strong>${expiryStr}</strong>. Si votre bien n'est pas encore vendu, pensez à renouveler votre accès pour continuer à bénéficier de la plateforme et de votre numéro dédié.`)}
    ${btn('Renouveler mon accès', `${BASE_URL}/tarifs`, '#C4785A')}
    ${p('Si votre vente est finalisée, félicitations ! Vous pouvez nous le signaler depuis votre espace vendeur.')}
    ${divider()}
    ${muted('Une question ? Contactez-nous à <a href="mailto:contact@venduparmoi.fr" style="color:#3D5A47;">contact@venduparmoi.fr</a>')}
  `, { preheader: `Votre accès Vendu Par Moi expire dans ${daysLeft} jours.` });
  return send(email, `⚠️ Votre accès expire dans ${daysLeft} jours`, html);
}

// ─────────────────────────────────────────────────────────────
// 8. AVIS
// ─────────────────────────────────────────────────────────────

async function sendReviewRequest({ email, firstName, daysSold, propertyCity }) {
  const html = layout(`
    ${badge('⭐ Votre avis', '#C4785A')}
    ${h1(`Comment s'est passée votre vente ?`)}
    ${p(`Bonjour ${firstName || ''},`)}
    ${p(`Vous avez vendu votre bien à <strong>${propertyCity || ''}</strong>${daysSold ? ` en ${daysSold} jours` : ''} grâce à Vendu Par Moi. Nous espérons que l'expérience a été à la hauteur de vos attentes.`)}
    ${p('Votre retour d\'expérience est précieux pour nous améliorer et aider les futurs vendeurs à se décider. Cela ne prend que 2 minutes !')}
    ${btn('Laisser mon avis', 'https://g.page/r/venduparmo/review', '#C4785A')}
    ${divider()}
    ${muted('Merci d\'avoir choisi Vendu Par Moi pour votre vente.')}
  `, { preheader: 'Votre avis sur Vendu Par Moi nous tient à cœur.' });
  return send(email, '⭐ Votre avis sur Vendu Par Moi', html);
}

// ─────────────────────────────────────────────────────────────
// 9. MISSIONS PHOTOGRAPHES
// ─────────────────────────────────────────────────────────────

async function sendMissionAssigned(photographer, mission) {
  const html = layout(`
    ${badge('📸 Nouvelle mission', '#3D5A47')}
    ${h1(`Bonjour ${photographer.first_name}, une mission vous est proposée`)}
    ${p('Une nouvelle mission photo vient de vous être assignée. Acceptez ou refusez depuis votre espace partenaire.')}
    ${infoTable(`
      ${infoRow('Client', mission.client_name || '—')}
      ${infoRow('Adresse', mission.address + ', ' + mission.city)}
      ${infoRow('Type', mission.property_type || '—')}
      ${infoRow('Surface', mission.surface ? `${mission.surface} m²` : '—')}
      ${mission.scheduled_date ? infoRow('Date prévue', mission.scheduled_date) : ''}
      ${mission.scheduled_time ? infoRow('Heure', mission.scheduled_time) : ''}
    `)}
    ${btn('Accepter ou refuser', `${BASE_URL}/partner/dashboard`)}
    ${divider()}
    ${muted('Vendu Par Moi — Réseau de photographes partenaires.')}
  `, { preheader: `Nouvelle mission photo — ${mission.city}` });
  return send(photographer.email, '📸 Nouvelle mission photo — Vendu Par Moi', html);
}

async function sendMissionConfirmed(clientEmail, clientName, mission, photographer) {
  const dateStr = mission.scheduled_date
    ? new Date(mission.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—';
  const html = layout(`
    ${badge('✅ Séance confirmée', '#3D5A47')}
    ${h1(`Votre séance photo est confirmée !`)}
    ${p(`Bonjour ${clientName || ''},`)}
    ${p('Votre séance photo professionnelle est confirmée. Voici les détails :')}
    ${infoTable(`
      ${infoRow('Photographe', `${photographer.first_name} ${photographer.last_name}`)}
      ${infoRow('Date', dateStr)}
      ${infoRow('Heure', mission.scheduled_time || '—')}
      ${infoRow('Adresse', mission.address + ', ' + mission.city)}
    `)}
    ${p('Préparez votre bien : rangement, lumière naturelle, espaces dégagés. Le photographe vous guidera sur place.')}
    ${divider()}
    ${muted('Les photos seront livrées dans un délai de 5 jours ouvrés après la séance.')}
  `, { preheader: `Séance photo confirmée — ${dateStr}` });
  return send(clientEmail, '✅ Votre séance photo est confirmée', html);
}

async function sendMissionReminderJ1(clientEmail, clientName, mission, photographer) {
  const html = layout(`
    ${badge('⏰ Rappel séance', '#C4785A')}
    ${h1('Votre séance photo est demain !')}
    ${p(`Bonjour ${clientName || ''},`)}
    ${p('Rappel : votre photographe sera chez vous demain. Voici les informations :')}
    ${infoTable(`
      ${infoRow('Photographe', `${photographer.first_name} ${photographer.last_name}`)}
      ${infoRow('Heure', mission.scheduled_time || '—')}
      ${infoRow('Adresse', mission.address + ', ' + mission.city)}
    `)}
    ${p('Conseils de dernière minute : ouvrez les volets, allumez les lumières, rangez les objets personnels dans les pièces.')}
    ${divider()}
    ${muted('En cas d\'imprévu, contactez-nous à <a href="mailto:contact@venduparmoi.fr" style="color:#3D5A47;">contact@venduparmoi.fr</a>')}
  `, { preheader: 'Rappel — votre photographe arrive demain.' });
  return send(clientEmail, '⏰ Rappel — Votre séance photo est demain', html);
}

// ─────────────────────────────────────────────────────────────
// 10. NUDGES VENDEURS (automatisations)
// ─────────────────────────────────────────────────────────────

async function sendNewOfferEmail({ sellerEmail, sellerFirstName, buyerName, amount, city, offersUrl }) {
  const amountFmt = Number(amount).toLocaleString('fr-FR') + ' €';
  const html = layout(`
    ${badge('💰 Nouvelle offre', '#C4603A')}
    ${h1(`${buyerName} vous a fait une offre`)}
    ${p(`Bonjour ${sellerFirstName || ''},`)}
    ${p(`Vous venez de recevoir une offre d'achat pour votre bien${city ? ` à <strong>${city}</strong>` : ''} :`)}
    ${infoTable([
      ['Acheteur', buyerName],
      ['Montant proposé', `<strong style="color:#C4603A;font-size:1.1em;">${amountFmt}</strong>`],
    ])}
    ${p('Connectez-vous à votre espace vendeur pour consulter l\'offre, répondre ou faire une contre-offre.')}
    ${btn('Voir l\'offre', offersUrl || `${BASE_URL}/mes-offres`, '#C4603A')}
    ${divider()}
    ${muted('Cette notification vous a été envoyée car vous avez reçu une offre sur votre bien via Vendu Par Moi.')}
  `, { preheader: `${buyerName} propose ${amountFmt} pour votre bien.` });
  return send(sellerEmail, `💰 Nouvelle offre de ${buyerName} — ${amountFmt}`, html);
}

async function sendProspectNudge({ name, email }) {
  const html = layout(`
    ${h1(`Vendre entre particuliers, c'est possible.`)}
    ${p(`Bonjour ${name || ''},`)}
    ${p('Vous avez demandé des informations sur Vendu Par Moi. Voici en quelques mots ce que nous vous proposons :')}
    <ul style="font-size:15px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Un dossier acheteur automatiquement envoyé à chaque contact</li>
      <li>Un agenda en ligne pour les réservations de visites</li>
      <li>Un numéro de téléphone dédié à votre bien</li>
      <li>Un coach IA disponible 7j/7</li>
    </ul>
    ${p('Des milliers de particuliers ont déjà vendu leur bien sans payer de commission d\'agence. Vous pouvez le faire aussi.')}
    ${btn('Découvrir nos offres', `${BASE_URL}/tarifs`)}
  `, { preheader: 'Vendez votre bien entre particuliers, accompagné professionnellement.' });
  return send(email, 'Vendez votre bien sans agence — Vendu Par Moi', html);
}

async function sendNoPropertyNudge({ email }) {
  const html = layout(`
    ${badge('🏠 Étape 1', '#3D5A47')}
    ${h1('Créez votre fiche bien pour commencer')}
    ${p('Votre compte est activé mais votre fiche bien n\'est pas encore créée. C\'est la première étape pour que votre dossier acheteur soit prêt à être envoyé.')}
    ${p('Cela prend environ 10 minutes. Notre formulaire vous guide étape par étape.')}
    ${btn('Créer ma fiche bien', `${BASE_URL}/mon-bien`)}
    ${divider()}
    ${muted('Une question ? Répondez à cet email, nous vous aidons.')}
  `, { preheader: 'Créez votre fiche bien — première étape vers la publication.' });
  return send(email, 'Première étape : créez votre fiche bien', html);
}

async function sendNoPhotosNudge({ email }) {
  const html = layout(`
    ${badge('📷 Photos manquantes', '#C4785A')}
    ${h1('Ajoutez vos photos pour attirer les acheteurs')}
    ${p('Les biens avec des photos reçoivent en moyenne 3× plus de contacts que ceux sans visuels. Votre bien est bien renseigné, mais il manque encore des photos.')}
    ${p('Ajoutez au minimum 5 photos pour maximiser votre visibilité. Si vous avez besoin d\'un photographe professionnel, nous pouvons vous en proposer un.')}
    ${btn('Ajouter mes photos', `${BASE_URL}/mon-bien`)}
  `, { preheader: 'Vos photos sont manquantes — ajoutez-les pour attirer plus d\'acheteurs.' });
  return send(email, '📷 Ajoutez vos photos pour attirer plus d\'acheteurs', html);
}

async function sendNotPublishedNudge({ email, score }) {
  const html = layout(`
    ${badge(`✨ Dossier prêt à ${score}%`, '#3D5A47')}
    ${h1('Votre bien est prêt — publiez-le !')}
    ${p('Votre dossier est bien avancé. Il ne vous reste qu\'une chose à faire : publier votre annonce pour qu\'elle soit visible par les acheteurs et que votre numéro dédié soit activé.')}
    ${btn('Publier mon annonce', `${BASE_URL}/mon-bien`)}
    ${p('Une fois publié, les acheteurs pourront consulter votre dossier, réserver une visite et vous contacter directement.')}
  `, { preheader: 'Votre bien est prêt à être publié — une dernière étape.' });
  return send(email, '🚀 Publiez votre annonce — votre dossier est prêt', html);
}

async function sendMissingDocNudge({ email, missingDocs }) {
  const docList = (missingDocs || []).map(d => `<li>${d}</li>`).join('');
  const html = layout(`
    ${badge('📋 Documents manquants', '#C4785A')}
    ${h1('Quelques documents à ajouter')}
    ${p('Les acheteurs sérieux vérifient toujours les informations réglementaires avant de visiter. Les éléments suivants manquent encore dans votre dossier :')}
    <ul style="font-size:15px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 20px;">${docList}</ul>
    ${p('Ajoutez-les dès maintenant pour rassurer vos acheteurs et éviter les questions répétées lors des visites.')}
    ${btn('Compléter mon dossier', `${BASE_URL}/mon-bien`)}
  `, { preheader: 'Quelques documents manquent dans votre dossier — complétez-le.' });
  return send(email, '📋 Documents manquants dans votre dossier', html);
}

async function sendPhotographerAvailabilityRequest({ email, firstName }) {
  const html = layout(`
    ${badge('📸 Photos professionnelles', '#3D5A47')}
    ${h1(`${firstName || ''}, avez-vous pensé aux photos pro ?`)}
    ${p('Les annonces avec des photos professionnelles se vendent en moyenne 2× plus vite. Vendu Par Moi vous propose des photographes partenaires locaux à partir de quelques centaines d\'euros.')}
    ${p('Le photographe se déplace chez vous, prend en charge toute la session et livre vos photos en 5 jours ouvrés.')}
    ${btn('Réserver une séance photo', `${BASE_URL}/booking`)}
    ${divider()}
    ${muted('Cette séance est facultative — vos propres photos sont tout à fait acceptées.')}
  `, { preheader: 'Valorisez votre bien avec des photos professionnelles.' });
  return send(email, '📸 Valorisez votre bien avec des photos professionnelles', html);
}

async function sendPostFirstVisitFeedbackSeller({ email, firstName }) {
  const html = layout(`
    ${badge('🏡 Après la visite', '#3D5A47')}
    ${h1(`Comment s'est passée votre première visite ?`)}
    ${p(`Bonjour ${firstName || ''},`)}
    ${p('Vous avez réalisé votre première visite ! C\'est une étape importante. Voici quelques conseils pour les prochaines visites :')}
    <ul style="font-size:14px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 16px;">
      <li>Relancez l'acheteur 24 à 48h après la visite</li>
      <li>Envoyez-lui le dossier acheteur sérieux si ce n'est pas encore fait</li>
      <li>Notez ses remarques pour ajuster votre discours aux prochaines visites</li>
      <li>N'attendez pas — les acheteurs décident vite</li>
    </ul>
    ${btn('Voir mes contacts acheteurs', `${BASE_URL}/mes-communications`)}
    ${divider()}
    ${muted('Une question sur la négociation ou la suite ? Votre coach IA est disponible 7j/7 depuis votre espace.')}
  `, { preheader: 'Félicitations pour votre première visite — quelques conseils pour la suite.' });
  return send(email, '🏡 Après votre première visite — conseils', html);
}

async function sendCheckInNoOffer({ email, firstName, daysPublished }) {
  const html = layout(`
    ${badge(`📊 Bilan J+${daysPublished}`, '#C4785A')}
    ${h1('Comment évolue votre vente ?')}
    ${p(`Bonjour ${firstName || ''},`)}
    ${p(`Votre bien est en ligne depuis <strong>${daysPublished} jours</strong> et aucune offre n'a encore été reçue. C'est normal à ce stade, mais voici quelques pistes pour accélérer.`)}
    <ul style="font-size:14px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 16px;">
      <li><strong>Prix :</strong> comparez avec les biens vendus récemment dans votre ville</li>
      <li><strong>Photos :</strong> la première photo est-elle attirante ?</li>
      <li><strong>Description :</strong> met-elle en valeur les points forts ?</li>
      <li><strong>Visibilité :</strong> votre annonce est-elle sur tous les portails ?</li>
    </ul>
    ${btn('Analyser mon annonce', `${BASE_URL}/mes-performances`)}
    ${divider()}
    ${muted('Votre coach IA peut vous aider à identifier les points d\'amélioration.')}
  `, { preheader: `${daysPublished} jours en ligne — quelques pistes pour obtenir des offres.` });
  return send(email, `📊 Bilan de votre vente après ${daysPublished} jours`, html);
}

// ─────────────────────────────────────────────────────────────
// 11. RELANCE ACHETEUR POST-VISITE
// ─────────────────────────────────────────────────────────────

async function sendPostVisitBuyerNudge({ buyerEmail, buyerName, propertyCity, propertyType, propertySlug, price }) {
  const typeLabel = propertyType === 'appartement' ? 'l\'appartement' : propertyType === 'maison' ? 'la maison' : 'le bien';
  const priceFormatted = price ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price) : '';
  const dossierUrl = `${BASE_URL}/bien/${propertySlug}`;
  const html = layout(`
    ${h1(`Avez-vous des questions, ${buyerName || ''} ?`)}
    ${p(`Vous avez visité ${typeLabel} à <strong>${propertyCity || ''}</strong>${priceFormatted ? ` affiché à ${priceFormatted}` : ''}. Nous espérons que la visite vous a plu.`)}
    ${p('Le propriétaire est disponible pour répondre à vos questions ou vous faire parvenir des informations complémentaires.')}
    ${p('Si ce bien vous intéresse, vous pouvez soumettre une offre directement en ligne :')}
    ${btn('Soumettre une offre d\'achat', dossierUrl, '#C4785A')}
    ${divider()}
    ${muted('Ce message vous est envoyé suite à votre visite. Vente entre particuliers accompagnée par Vendu Par Moi.')}
  `, { preheader: `Avez-vous des questions sur le bien visité à ${propertyCity} ?` });
  return send(buyerEmail, `Suite à votre visite — ${typeLabel} à ${propertyCity || ''}`, html);
}

// ─────────────────────────────────────────────────────────────
// 12. RAPPORT HEBDOMADAIRE ADMIN
// ─────────────────────────────────────────────────────────────

async function sendWeeklyAdminReport({ to, stats }) {
  const { newClients = 0, newOffers = 0, newVisits = 0, publishedProps = 0, totalRevenue = 0, totalActive = 0 } = stats;
  const revenueFormatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalRevenue);
  const html = layout(`
    ${badge('📊 Rapport hebdomadaire', '#3D5A47')}
    ${h1('Rapport Vendu Par Moi — semaine écoulée')}
    ${infoTable(`
      ${infoRow('Nouveaux clients', newClients)}
      ${infoRow('Biens publiés', publishedProps)}
      ${infoRow('Nouvelles visites', newVisits)}
      ${infoRow('Nouvelles offres', newOffers)}
      ${infoRow('Revenus semaine', revenueFormatted)}
      ${infoRow('Clients actifs total', totalActive)}
    `)}
    ${btn('Voir le tableau de bord admin', `${BASE_URL}/admin`)}
  `, { preheader: `Rapport hebdo — ${newClients} nouveaux clients, ${revenueFormatted} de revenus.` });
  return send(to, '📊 Rapport hebdomadaire Vendu Par Moi', html);
}

// ─────────────────────────────────────────────────────────────
// 13. RAPPORT HEBDOMADAIRE VENDEUR
// ─────────────────────────────────────────────────────────────

async function sendWeeklySellerReport({ email, firstName, stats }) {
  const { views = 0, viewsPrev = 0, contacts = 0, contactsAll = 0, visits = 0, visitsAll = 0, upcoming = 0, offers = 0, offersAll = 0, daysOnline = 0 } = stats;

  // Tendance vues
  const viewsTrend = viewsPrev === 0
    ? null
    : views > viewsPrev
      ? `↑ +${views - viewsPrev} vs semaine dernière`
      : views < viewsPrev
        ? `↓ ${views - viewsPrev} vs semaine dernière`
        : `= stable vs semaine dernière`;

  // Conseil personnalisé selon le stade du funnel
  let conseil = '';
  if (offersAll > 0) {
    conseil = `Vous avez reçu ${offersAll} offre${offersAll > 1 ? 's' : ''} au total. Répondez rapidement pour maintenir l'intérêt des acheteurs — une contre-proposition bien rédigée augmente vos chances de conclure.`;
  } else if (visitsAll > 0 && offersAll === 0) {
    conseil = `Vous avez reçu des visites mais pas encore d'offre. Pensez à relancer les visiteurs via votre agenda et à activer le dossier acheteur sérieux pour renforcer leur confiance.`;
  } else if (contactsAll > 0 && visitsAll === 0) {
    conseil = `Vous avez des contacts mais aucune visite planifiée. Assurez-vous que votre agenda est bien renseigné et que le lien de réservation est partagé dans vos messages.`;
  } else if (views > 0 && contactsAll === 0) {
    conseil = `Votre dossier est consulté mais ne génère pas encore de contacts. Vérifiez que votre prix est cohérent avec le marché et que vos photos sont suffisamment attractives.`;
  } else {
    conseil = `Votre bien est en ligne — continuez à diffuser votre dossier et à partager le lien de réservation. L'activité viendra progressivement.`;
  }

  const html = layout(`
    ${badge('📊 Bilan de la semaine', '#3D5A47')}
    ${h1(`Bonjour ${firstName || ''}, voici votre bilan`)}
    ${p(`Votre bien est en ligne depuis <strong>${daysOnline} jour${daysOnline > 1 ? 's' : ''}</strong>.`)}
    ${infoTable(`
      ${infoRow('Vues cette semaine', views > 0
        ? `<strong style="color:#3D5A47;">${views}</strong>${viewsTrend ? `<span style="font-size:0.75em;color:#888;margin-left:6px;">${viewsTrend}</span>` : ''}`
        : `${views}`)}
      ${infoRow('Nouveaux contacts', contacts > 0 ? `<strong style="color:#C4785A;">${contacts}</strong>` : `${contacts}`)}
      ${infoRow('Visites réalisées', visits > 0 ? `<strong style="color:#3D5A47;">${visits}</strong>` : `${visits}`)}
      ${upcoming > 0 ? infoRow('Visites à venir', `<strong style="color:#1565c0;">${upcoming} cette semaine</strong>`) : ''}
      ${infoRow('Offres reçues', offers > 0 ? `<strong style="color:#C4785A;">${offers}</strong>` : `${offers}`)}
      ${infoRow('Total contacts', contactsAll)}
      ${infoRow('Total visites', visitsAll)}
    `)}
    ${h2('Conseil de la semaine')}
    ${p(conseil)}
    ${btn('Voir mon espace vendeur', `${BASE_URL}/dashboard`)}
    ${divider()}
    ${muted('Rapport envoyé automatiquement chaque lundi. Consultez votre coach IA pour des conseils personnalisés.')}
  `, { preheader: `Bilan semaine — ${views} vues, ${contacts} contacts, ${visits} visites${upcoming > 0 ? `, ${upcoming} visite(s) à venir` : ''}` });
  return send(email, `📊 Votre bilan — semaine du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`, html);
}

// ─────────────────────────────────────────────────────────────
// 14. NUDGE POST-VISITE J+1 VERS ACHETEUR (dossier sérieux)
// ─────────────────────────────────────────────────────────────

async function sendPostVisitDossierNudge({ buyerEmail, buyerName, propertyCity, propertyType, dossierUrl, sellerFirstName }) {
  const typeLabel = propertyType === 'appartement' ? 'l\'appartement' : propertyType === 'maison' ? 'la maison' : 'le bien';
  const html = layout(`
    ${h1(`Suite à votre visite — ${buyerName ? buyerName.split(' ')[0] : ''}`)}
    ${p(`Merci d'avoir visité ${typeLabel} à <strong>${propertyCity || ''}</strong>.`)}
    ${p(`${sellerFirstName || 'Le propriétaire'} souhaite vous donner accès à des informations complémentaires réservées aux acheteurs sérieux : diagnostics complets, documents techniques et informations de voisinage.`)}
    ${btn('Accéder au dossier complémentaire', dossierUrl, '#C4785A')}
    ${p('Si vous souhaitez soumettre une offre d\'achat, vous pouvez le faire directement depuis ce dossier.')}
    ${divider()}
    ${muted('Vente entre particuliers accompagnée par <strong>Vendu Par Moi</strong>.')}
  `, { preheader: `Suite à votre visite — documents complémentaires disponibles` });
  return send(buyerEmail, `Documents complémentaires — ${typeLabel} à ${propertyCity || ''}`, html);
}

// ─────────────────────────────────────────────────────────────
// 15. RELANCE POST-VISITE J+3 VERS ACHETEUR
// ─────────────────────────────────────────────────────────────

async function sendPostVisitJ3Nudge({ buyerEmail, buyerName, propertyCity, propertyType, dossierUrl, sellerFirstName }) {
  const typeLabel = propertyType === 'appartement' ? 'l\'appartement' : propertyType === 'maison' ? 'la maison' : 'le bien';
  const firstName = buyerName ? buyerName.split(' ')[0] : '';
  const html = layout(`
    ${h1(`${firstName ? firstName + ', ' : ''}avez-vous eu le temps de réfléchir ?`)}
    ${p(`Vous avez visité ${typeLabel} à <strong>${propertyCity || ''}</strong> il y a quelques jours.`)}
    ${p(`${sellerFirstName || 'Le propriétaire'} reste disponible pour répondre à vos questions ou vous fournir des informations supplémentaires.`)}
    ${p('Si ce bien vous intéresse, vous pouvez soumettre une offre directement en ligne ou relire le dossier complet :')}
    ${btn('Revoir le dossier et faire une offre', dossierUrl, '#3D5A47')}
    ${divider()}
    ${muted('Vente entre particuliers accompagnée par <strong>Vendu Par Moi</strong>.')}
  `, { preheader: `${firstName ? firstName + ', vous avez visité' : 'Vous avez visité'} ${typeLabel} à ${propertyCity} — des questions ?` });
  return send(buyerEmail, `Avez-vous eu le temps de réfléchir ? — ${typeLabel} à ${propertyCity || ''}`, html);
}

// ─────────────────────────────────────────────────────────────
// 16. NUDGE BAISSE DE PRIX (J+45 sans offre)
// ─────────────────────────────────────────────────────────────

async function sendPriceDropNudge({ email, firstName, daysPublished, currentPrice, propertyCity }) {
  const priceFormatted = currentPrice ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(currentPrice) : '';
  const html = layout(`
    ${badge('💡 Conseil stratégique', '#C4785A')}
    ${h1(`${firstName ? firstName + ', ' : ''}une piste à envisager`)}
    ${p(`Votre bien${propertyCity ? ` à <strong>${propertyCity}</strong>` : ''} est en ligne depuis <strong>${daysPublished} jours</strong>${priceFormatted ? ` affiché à ${priceFormatted}` : ''} et n'a pas encore reçu d'offre.`)}
    ${p('Dans cette situation, une légère baisse de prix peut relancer l\'intérêt des acheteurs et générer de nouvelles visites. Même une réduction de 2 à 5 % peut faire passer votre bien au-dessus d\'un seuil psychologique important.')}
    ${h2('Quelques pistes à explorer')}
    <ul style="font-size:15px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Vérifiez le prix au m² des biens vendus dans votre secteur (DVF)</li>
      <li>Actualisez vos photos ou votre description si possible</li>
      <li>Consultez votre coach IA pour une analyse personnalisée</li>
    </ul>
    ${btn('Accéder à mon espace', `${BASE_URL}/dashboard`)}
    ${divider()}
    ${muted('Ce message est envoyé automatiquement dans le cadre du suivi de votre vente. Si vous avez déjà ajusté votre prix, ignorez ce message.')}
  `, { preheader: `Votre bien est en ligne depuis ${daysPublished} jours sans offre — quelques conseils.` });
  return send(email, `💡 Bilan J+${daysPublished} — Votre bien à ${propertyCity || ''}`, html);
}

// ─────────────────────────────────────────────────────────────
// 16. EMAIL ADMIN DIRECT
// ─────────────────────────────────────────────────────────────

async function sendAdminDirectEmail({ to, subject, html: customHtml, text }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn(`[EMAIL] SENDGRID_API_KEY manquant — email admin non envoyé à ${to}`);
    return false;
  }
  try {
    const wrappedHtml = customHtml
      ? layout(`<div style="font-size:15px;color:#3a3530;line-height:1.7;">${customHtml}</div>`)
      : layout(p(text || ''));
    await sgMail.send({
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: subject || 'Message de Vendu Par Moi',
      html: wrappedHtml,
    });
    console.log(`[EMAIL] ✓ Admin direct → ${to} : ${subject}`);
    return true;
  } catch (e) {
    console.error(`[EMAIL] ✗ Admin direct error → ${to} : ${e?.response?.body?.errors?.[0]?.message || e.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// 14. PRÉVISUALISATION (admin marketing)
// ─────────────────────────────────────────────────────────────

async function previewEmail(templateName) {
  const fakeProp = { type: 'maison', address: '12 rue des Lilas', city: 'Lyon', slug: 'maison-lyon-preview', price: 320000 };
  const fakeSellerEmail = 'sophie.martin@exemple.fr';
  const fakeBuyerEmail = 'thomas.durand@exemple.fr';
  const fakeDossierUrl = `${BASE_URL}/dossier/acheteur/preview-token`;

  const fns = {
    welcome:               () => sendWelcomeEmail({ email: fakeSellerEmail, firstName: 'Sophie' }),
    welcome_v2:            () => sendWelcomeImproved({ email: fakeSellerEmail, firstName: 'Sophie' }),
    password_reset:        () => sendPasswordResetEmail({ email: fakeSellerEmail, firstName: 'Sophie', resetUrl: `${BASE_URL}/reset-password?token=preview` }),
    invoice:               () => sendInvoiceEmail({ email: fakeSellerEmail, firstName: 'Sophie', amount: 49900, pack: 'serenite', invoiceNumber: 'SER-2026-00042-V1', date: new Date() }),
    published:             () => sendPublishedConfirmation({ email: fakeSellerEmail, firstName: 'Sophie', property: fakeProp }),
    visit_confirmation:    () => sendVisitConfirmation(fakeBuyerEmail, 'Thomas Durand', fakeProp, '2026-06-20', '14:00', false),
    new_visit_request:     () => sendNewVisitRequest({ sellerEmail: fakeSellerEmail, buyerName: 'Thomas Durand', visitDate: '20 juin 2026 à 14:00', notes: '📞 06 12 34 56 78' }),
    visit_reminder_seller: () => sendVisitConfirmation(fakeBuyerEmail, 'Thomas Durand', fakeProp, '2026-06-21', '10:00', false),
    dossier:               () => sendDossierEmail({ to: fakeBuyerEmail, buyerName: 'Thomas Durand', dossierUrl: fakeDossierUrl, propertyCity: 'Lyon', propertyType: 'maison' }),
    prospect_nudge:        () => sendProspectNudge({ name: 'Thomas', email: fakeBuyerEmail }),
    no_property:           () => sendNoPropertyNudge({ email: fakeSellerEmail }),
    no_photos:             () => sendNoPhotosNudge({ email: fakeSellerEmail }),
    not_published:         () => sendNotPublishedNudge({ email: fakeSellerEmail, score: 82 }),
    missing_doc:           () => sendMissingDocNudge({ email: fakeSellerEmail, missingDocs: ['DPE', 'Taxe foncière'] }),
    photographer_request:  () => sendPhotographerAvailabilityRequest({ email: fakeSellerEmail, firstName: 'Sophie' }),
    post_first_visit:      () => sendPostFirstVisitFeedbackSeller({ email: fakeSellerEmail, firstName: 'Sophie' }),
    check_in_no_offer:     () => sendCheckInNoOffer({ email: fakeSellerEmail, firstName: 'Sophie', daysPublished: 18 }),
    contract_renewal:      () => sendContractRenewal({ email: fakeSellerEmail, firstName: 'Sophie', expiryDate: new Date(Date.now() + 14 * 86400000).toISOString(), daysLeft: 14 }),
    post_visit_dossier:    () => sendPostVisitDossierNudge({ buyerEmail: fakeBuyerEmail, buyerName: 'Thomas Durand', propertyCity: 'Lyon', propertyType: 'maison', dossierUrl: fakeDossierUrl, sellerFirstName: 'Sophie' }),
    post_visit_j3:         () => sendPostVisitJ3Nudge({ buyerEmail: fakeBuyerEmail, buyerName: 'Thomas Durand', propertyCity: 'Lyon', propertyType: 'maison', dossierUrl: fakeDossierUrl, sellerFirstName: 'Sophie' }),
    post_visit_buyer:      () => sendPostVisitBuyerNudge({ buyerEmail: fakeBuyerEmail, buyerName: 'Thomas Durand', propertyCity: 'Lyon', propertyType: 'maison', propertySlug: 'maison-lyon-preview', price: 320000 }),
    price_drop:            () => sendPriceDropNudge({ email: fakeSellerEmail, firstName: 'Sophie', daysPublished: 47, currentPrice: 320000, propertyCity: 'Lyon' }),
    weekly_seller:         () => sendWeeklySellerReport({ email: fakeSellerEmail, firstName: 'Sophie', stats: { views: 24, viewsPrev: 18, contacts: 3, contactsAll: 11, visits: 2, visitsAll: 5, upcoming: 1, offers: 0, offersAll: 0, daysOnline: 32 } }),
    weekly_admin:          () => sendWeeklyAdminReport({ to: fakeSellerEmail, stats: { newClients: 4, newOffers: 2, newVisits: 9, publishedProps: 3, totalRevenue: 249600, totalActive: 47 } }),
    review_request:        () => sendReviewRequest({ email: fakeSellerEmail, firstName: 'Sophie' }),
    sold_congrats:         () => sendSoldCongrats({ email: fakeSellerEmail, firstName: 'Sophie', property: fakeProp }),
  };

  // Ces fonctions envoient vraiment l'email — on intercepte via un wrapper sans envoi
  // On appelle sgMail.send en mode "dry run" en lisant juste le HTML généré
  const originalSend = sgMail.send.bind(sgMail);
  let capturedHtml = null;
  sgMail.send = async (msg) => { capturedHtml = msg.html; };

  const fn = fns[templateName];
  if (!fn) return `<p style="font-family:sans-serif;padding:20px;color:#c00;">Template inconnu : <strong>${templateName}</strong></p>`;

  try {
    await fn();
  } finally {
    sgMail.send = originalSend;
  }

  return capturedHtml || `<p style="font-family:sans-serif;padding:20px;color:#c00;">Rendu indisponible pour ce template.</p>`;
}

// ─────────────────────────────────────────────────────────────
// 17. AVANT PREMIER RENDEZ-VOUS
// ─────────────────────────────────────────────────────────────

async function sendFirstMeetingEmail({ email, firstName }) {
  const html = layout(`
    <div style="background:#0F1E13;border-radius:10px;padding:24px 28px;margin-bottom:28px;">
      <div style="font-size:10px;font-weight:700;color:#6BBF82;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">Vendu Par Moi</div>
      <div style="font-size:21px;font-weight:700;color:#F5F0E8;line-height:1.35;margin-bottom:8px;">Préparons votre dossier,<br><span style="font-style:italic;color:#6BBF82;">ensemble.</span></div>
      <div style="font-size:13px;color:rgba(212,228,216,0.60);">Quelques éléments utiles avant notre premier rendez-vous</div>
    </div>

    ${p(`Bonjour${firstName ? ` ${firstName}` : ''},`)}
    ${p('Nous sommes ravis de vous accompagner dans la vente de votre bien, de particulier à particulier. Notre objectif : vous donner toutes les clés pour vendre vous-même, sereinement, en limitant les frais habituellement liés à une vente immobilière. <strong>Vous restez maître de votre vente, nous sommes simplement à vos côtés.</strong>')}
    ${p('Pour que notre premier rendez-vous soit le plus efficace possible, voici quelques éléments qu\'il serait utile d\'avoir sous la main. <strong>Rien d\'urgent ni de figé</strong> : ce que nous n\'aurons pas, nous le peaufinerons ensemble.')}

    ${h2('À réunir si possible')}
    <ul style="font-size:14px;color:#4a4540;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Dernier avis de taxe foncière</li>
      <li>Liste des travaux réalisés <em style="color:#9a9087;">(même approximative, cela nous aide à valoriser le bien)</em></li>
      <li>Déclarations de travaux ou permis de construire <em style="color:#9a9087;">(si des travaux ont nécessité une autorisation)</em></li>
      <li>Diagnostics techniques complets <em style="color:#9a9087;">(DPE, amiante, plomb… pour une estimation précise)</em></li>
      <li>Charges de copropriété <em style="color:#9a9087;">(si applicable)</em></li>
      <li>Plans du bien <em style="color:#9a9087;">(si vous en disposez)</em></li>
      <li>Garanties et factures des travaux récents <em style="color:#9a9087;">(si des travaux ont été réalisés dans les 10 dernières années)</em></li>
      <li>Un intérieur bien rangé <em style="color:#9a9087;">(pour visualiser ensemble le potentiel de chaque pièce)</em></li>
    </ul>

    ${divider()}
    ${h2('Pour vos diagnostics')}
    ${p('Nous travaillons habituellement avec un diagnostiqueur de confiance :')}
    <div style="background:#F4F1EC;border-radius:10px;padding:16px 20px;margin:0 0 12px;">
      <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">PL Diagnostic — M. Leroy</div>
      <div style="font-size:14px;color:#3D5A47;font-weight:600;">06 07 99 25 10</div>
    </div>
    ${muted('<em>Vous n\'avez bien sûr aucune obligation de passer par lui : c\'est une recommandation, pas une condition.</em>')}

    ${divider()}
    <div style="background:#0F1E13;border-radius:10px;padding:16px 24px;text-align:center;">
      <div style="font-size:13px;font-weight:700;color:#F5F0E8;margin-bottom:4px;">Vendu Par Moi</div>
      <div style="font-size:12px;color:rgba(212,228,216,0.55);font-style:italic;">À très bientôt — nous préparons la suite ensemble.</div>
    </div>
  `, { preheader: 'Quelques éléments à réunir avant notre premier rendez-vous — rien d\'urgent.' });
  return send(email, 'Avant notre premier rendez-vous — quelques éléments à préparer', html);
}

// ─────────────────────────────────────────────────────────────
// Contact form — notification admin
// ─────────────────────────────────────────────────────────────
async function sendContactNotification({ name, phone, email, offer, city, message }) {
  const adminEmail = process.env.ADMIN_EMAIL || FROM_EMAIL;
  const row = (label, value) => value ? `<tr><td style="padding:6px 0;font-size:14px;color:#666;width:140px;vertical-align:top;">${label}</td><td style="padding:6px 0;font-size:14px;color:#1a1a1a;font-weight:600;">${value}</td></tr>` : '';
  const html = layout(`
    ${h1('Nouveau contact')}
    ${p('Un visiteur a rempli le formulaire de contact.')}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${row('Nom', name)}
      ${row('Téléphone', phone)}
      ${row('Email', email)}
      ${row('Offre', offer)}
      ${row('Ville', city)}
      ${row('Message', message)}
    </table>
  `, { preheader: `Nouveau contact de ${name} — ${phone}` });
  return send(adminEmail, `Nouveau contact — ${name}`, html);
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────
module.exports = {
  // Auth
  sendPasswordResetEmail,
  // Contact
  sendContactNotification,
  // Bienvenue / Paiement
  sendWelcomeEmail,
  sendWelcomeImproved,
  sendInvoiceEmail,
  // Bien
  sendPublishedConfirmation,
  sendSoldCongrats,
  sendPropertySoldToBuyer,
  // Dossier
  sendDossierEmail,
  sendDossierToNotaire,
  // Visites
  sendVisitConfirmation,
  sendNewVisitRequest,
  sendVisitRequestReceived,
  sendNewOfferEmail,
  // Contrat
  sendContractRenewal,
  // Avis
  sendReviewRequest,
  // Missions photographes
  sendMissionAssigned,
  sendMissionConfirmed,
  sendMissionReminderJ1,
  // Nudges vendeurs
  sendProspectNudge,
  sendNoPropertyNudge,
  sendNoPhotosNudge,
  sendNotPublishedNudge,
  sendMissingDocNudge,
  sendPhotographerAvailabilityRequest,
  sendPostFirstVisitFeedbackSeller,
  sendCheckInNoOffer,
  // Nudges acheteurs
  sendPostVisitBuyerNudge,
  sendPostVisitDossierNudge,
  sendPostVisitJ3Nudge,
  // Nudge prix
  sendPriceDropNudge,
  // Rapport vendeur
  sendWeeklySellerReport,
  // Avant premier RDV
  sendFirstMeetingEmail,
  // Admin
  sendAdminDirectEmail,
  sendWeeklyAdminReport,
  previewEmail,
};
