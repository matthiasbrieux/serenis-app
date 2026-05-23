const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = { email: process.env.SENDGRID_FROM_EMAIL || 'contact@serenis.fr', name: 'Serenis' };
const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function sendWelcomeEmail(to, tempPassword, pack) {
  const packLabel = pack === 'serenite' ? 'Pack Sérénité — 999 €' : 'Pack Autonome — 99 €';
  const msg = {
    to, from: FROM,
    subject: 'Bienvenue sur Serenis — vos accès',
    html: `
<div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A16;">
  <div style="background: #3D5A47; padding: 32px; text-align: center;">
    <h1 style="color: #FDFCF8; font-family: Georgia, serif; margin: 0;">Serenis</h1>
    <p style="color: #D4E4D8; margin: 8px 0 0;">Vendez votre bien. Sereinement.</p>
  </div>
  <div style="padding: 32px; background: #FDFCF8;">
    <h2 style="color: #3D5A47;">Votre accès est prêt</h2>
    <p>Bonjour,</p>
    <p>Votre paiement pour le <strong>${packLabel}</strong> a bien été reçu. Voici vos identifiants de connexion :</p>
    <div style="background: #F5F0E8; border-left: 4px solid #C4785A; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>Email :</strong> ${to}</p>
      <p style="margin: 4px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #fff; padding: 2px 8px; border-radius: 3px;">${tempPassword}</code></p>
    </div>
    <p style="color: #C4785A; font-weight: bold;">→ Changez ce mot de passe dès votre première connexion.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${BASE}/login" style="background: #C4785A; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accéder à mon espace vendeur</a>
    </div>
    <p>Des questions ? Répondez à cet email ou appelez Matthias au <strong>06 95 44 36 54</strong>.</p>
  </div>
  <div style="background: #3D5A47; padding: 20px; text-align: center;">
    <p style="color: #D4E4D8; font-size: 12px; margin: 0;">Serenis est une plateforme numérique d'outils et de formation. Le vendeur reste seul responsable de sa vente.</p>
    <p style="color: #5C7A65; font-size: 11px; margin: 8px 0 0;">Matthias Brieux — 06 95 44 36 54 — Douai (59)</p>
  </div>
</div>`,
  };
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Welcome:', to, tempPassword); return; }
  await sgMail.send(msg);
}

async function sendDossierEmail(to, property, photos) {
  const photoHtml = photos.slice(0, 3).map(p => `<img src="${p.url}" style="width:180px; height:120px; object-fit:cover; border-radius:6px; margin:4px;" />`).join('');
  const msg = {
    to, from: FROM,
    subject: `Dossier complet — ${property.type || 'Bien'} ${property.city || ''}`,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A16;">
  <div style="background: #3D5A47; padding: 24px; text-align: center;">
    <h1 style="color: #FDFCF8; font-family: Georgia, serif; margin: 0;">Serenis</h1>
  </div>
  <div style="padding: 32px; background: #FDFCF8;">
    <h2 style="color: #3D5A47;">Votre dossier complet</h2>
    <p>Bonjour,</p>
    <p>Comme demandé, voici le dossier complet du bien :</p>
    <div style="background: #F5F0E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #3D5A47; margin-top: 0;">${property.type || ''} — ${property.city || ''} (${property.postal_code || ''})</h3>
      ${property.surface_habitable ? `<p><strong>Surface :</strong> ${property.surface_habitable} m²</p>` : ''}
      ${property.rooms ? `<p><strong>Pièces :</strong> ${property.rooms} pièces — ${property.bedrooms || ''} chambres</p>` : ''}
      ${property.price ? `<p><strong>Prix :</strong> ${Number(property.price).toLocaleString('fr-FR')} €</p>` : ''}
      ${property.dpe_class ? `<p><strong>DPE :</strong> Classe ${property.dpe_class}</p>` : ''}
    </div>
    ${photoHtml ? `<div style="margin: 20px 0;">${photoHtml}</div>` : ''}
    <div style="text-align: center; margin: 32px 0;">
      <a href="${BASE}/bien/${property.slug}" style="background: #C4785A; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Voir le dossier complet & réserver une visite</a>
    </div>
    <p style="font-size: 13px; color: #666;">Ce dossier a été généré automatiquement par la plateforme Serenis. Le vendeur reste seul responsable de la vente.</p>
  </div>
  <div style="background: #3D5A47; padding: 16px; text-align: center;">
    <p style="color: #D4E4D8; font-size: 11px; margin: 0;">Serenis — plateforme numérique d'outils et de formation pour vendeurs particuliers</p>
  </div>
</div>`,
  };
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Dossier:', to); return; }
  await sgMail.send(msg);
}

async function sendVisitConfirmation(to, name, property, date, time, isSeller = false) {
  const subject = isSeller
    ? `Nouvelle visite confirmée — ${date} à ${time}`
    : `Votre visite est confirmée — ${date} à ${time}`;

  const msg = {
    to, from: FROM, subject,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #3D5A47; padding: 24px; text-align: center;">
    <h1 style="color: #FDFCF8; font-family: Georgia, serif; margin: 0;">Serenis</h1>
  </div>
  <div style="padding: 32px; background: #FDFCF8;">
    <h2 style="color: #3D5A47;">Visite confirmée ✓</h2>
    <p>Bonjour ${name},</p>
    <p>La visite est bien confirmée :</p>
    <div style="background: #D4E4D8; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Bien :</strong> ${property.type || ''} — ${property.address || ''}, ${property.city || ''}</p>
      <p><strong>Date :</strong> ${date}</p>
      <p><strong>Heure :</strong> ${time}</p>
    </div>
    ${!isSeller ? '<p>L\'adresse exacte vous sera communiquée directement par le vendeur.</p>' : ''}
    <p style="font-size: 13px; color: #666;">Serenis — plateforme numérique d'outils et de formation</p>
  </div>
</div>`,
  };
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Visit confirm:', to); return; }
  await sgMail.send(msg);
}

async function sendContactNotification(data) {
  const msg = {
    to: process.env.ADMIN_EMAIL,
    from: FROM,
    subject: `Nouveau contact — ${data.name} — ${data.offer || 'non précisé'}`,
    html: `<div style="font-family:Arial;padding:20px;">
      <h2>Nouveau contact depuis Serenis</h2>
      <p><strong>Nom :</strong> ${data.name}</p>
      <p><strong>Téléphone :</strong> ${data.phone}</p>
      <p><strong>Email :</strong> ${data.email}</p>
      <p><strong>Offre souhaitée :</strong> ${data.offer}</p>
      <p><strong>Ville du bien :</strong> ${data.city}</p>
      <p><strong>Message :</strong> ${data.message || 'Aucun'}</p>
    </div>`,
  };
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Contact:', data.email); return; }
  await sgMail.send(msg);
}

module.exports = { sendWelcomeEmail, sendDossierEmail, sendVisitConfirmation, sendContactNotification };
