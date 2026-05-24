const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = { email: process.env.SENDGRID_FROM_EMAIL || 'contact@serenis.fr', name: 'Serenis' };
const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function sendWelcomeEmail(to, tempPassword, pack) {
  const isSerenite = pack === 'serenite';
  const packLabel = isSerenite ? 'Pack Sérénité' : 'Pack Autonome';
  const packColor = isSerenite ? '#3D5A47' : '#5a8a6a';
  const features = isSerenite
    ? ['Fiche bien numérique complète', 'Numéro 09 dédié pour votre annonce', 'Agenda de réservation de visites', 'Coach IA immobilier personnel', 'Formation complète (15 modules)', 'Dossier acheteur automatique']
    : ['Fiche bien numérique', 'Guide vendeur complet', 'Templates emails acheteurs', 'Formation de base (5 modules)'];

  const featureList = features.map(f => `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#3D5A47;">
        <span style="color:#C4785A;margin-right:8px;">✓</span>${f}
      </td>
    </tr>`).join('');

  const msg = {
    to, from: FROM,
    subject: `Bienvenue sur Serenis — vos accès ${packLabel}`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:${packColor};border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:28px;margin:0 0 6px;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:14px;margin:0;">Vendez votre bien. Sereinement.</p>
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 16px;margin-top:16px;">
      <span style="color:#fff;font-size:12px;font-weight:bold;">${packLabel}</span>
    </div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Votre espace est prêt 🎉</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Paiement confirmé. Vous pouvez dès maintenant commencer à préparer votre vente immobilière avec Serenis.</p>

    <!-- Identifiants -->
    <div style="background:#F5F0E8;border-left:4px solid #C4785A;border-radius:4px;padding:20px;margin:0 0 28px;">
      <p style="font-size:13px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Vos identifiants</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1A16;"><strong>Email :</strong> ${to}</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1A16;"><strong>Mot de passe :</strong> <code style="background:#fff;border:1px solid #ddd;padding:2px 10px;border-radius:4px;font-family:monospace;">${tempPassword}</code></p>
      <p style="font-size:12px;color:#C4785A;margin:12px 0 0;font-weight:bold;">→ Changez ce mot de passe à votre première connexion.</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 36px;">
      <a href="${BASE}/onboarding" style="background:#C4785A;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;letter-spacing:0.02em;">Démarrer mon onboarding →</a>
      <p style="font-size:12px;color:#aaa;margin:10px 0 0;">5 étapes · 3 minutes · pour lancer votre vente</p>
    </div>

    <!-- Features -->
    <div style="border-top:1px solid #e8e0d6;padding-top:28px;">
      <p style="font-size:13px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px;">Inclus dans votre ${packLabel}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${featureList}</table>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
    <p style="color:#D4E4D8;font-size:13px;margin:0 0 6px;">Une question ? Matthias répond personnellement.</p>
    <p style="color:#5C7A65;font-size:12px;margin:0;">06 95 44 36 54 — contact@serenis.fr — Douai (59)</p>
    <p style="color:#4a6e55;font-size:11px;margin:12px 0 0;line-height:1.5;">Serenis est une plateforme numérique d'outils et de formation.<br>Le vendeur reste seul responsable de sa vente.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
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
