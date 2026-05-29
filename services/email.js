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
      <p style="font-size:13px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Vos identifiants de connexion</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1A16;"><strong>Email :</strong> ${to}</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1A16;"><strong>Mot de passe :</strong> celui que vous avez choisi lors de votre inscription.</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 36px;">
      <a href="${BASE}/booking" style="background:#C4785A;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;letter-spacing:0.02em;">Accéder à mon espace →</a>
      <p style="font-size:12px;color:#aaa;margin:10px 0 0;">Réservez votre séance photo · Remplissez votre fiche bien</p>
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
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Welcome:', to); return; }
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

// ── Notification mission au photographe ───────────────────────────────────────
async function sendMissionAssigned(photographer, mission) {
  const msg = {
    to: photographer.email,
    from: FROM,
    subject: `Nouvelle mission Serenis — ${mission.scheduled_date} à ${mission.city}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#1C1C1A;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#F5F0E8;font-family:Georgia,serif;font-size:24px;margin:0 0 4px;">Serenis · Partenaires</h1>
    <p style="color:rgba(245,240,232,0.5);font-size:13px;margin:0;">Nouvelle mission photo</p>
  </td></tr>
  <tr><td style="background:#fff;padding:36px 40px;">
    <h2 style="color:#1C1C1A;font-family:Georgia,serif;font-size:20px;margin:0 0 8px;">Bonjour ${photographer.first_name},</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Une nouvelle mission vous a été assignée. Connectez-vous à votre espace partenaire pour l'accepter ou la refuser.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F5F0E8;border-radius:8px;margin-bottom:24px;">
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;width:120px;">Date</td><td style="font-weight:600;font-size:14px;">${mission.scheduled_date} à ${mission.scheduled_time}</td></tr>
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Adresse</td><td style="font-weight:600;font-size:14px;">${mission.address}, ${mission.postal_code} ${mission.city}</td></tr>
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Type</td><td style="font-size:14px;">${mission.property_type || '—'} · ${mission.surface ? mission.surface + ' m²' : '?'} · ${mission.rooms || '?'} pièces</td></tr>
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Rémunération</td><td style="font-weight:600;font-size:14px;color:#059669;">${mission.photographer_fee || 150} €</td></tr>
      ${mission.access_notes ? `<tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Accès</td><td style="font-size:14px;">${mission.access_notes}</td></tr>` : ''}
    </table>
    <div style="text-align:center;">
      <a href="${BASE}/partner/mission/${mission.uuid}" style="display:inline-block;background:#C4603A;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Voir la mission →</a>
    </div>
    <p style="color:#8C8880;font-size:12px;margin:24px 0 0;text-align:center;">Répondez dans les 24h. Sans réponse, la mission sera réassignée.</p>
  </td></tr>
  <tr><td style="padding:20px;text-align:center;font-size:12px;color:#8C8880;">Serenis · Espace Partenaires</td></tr>
</table></td></tr></table>
</body></html>`
  };
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Mission assigned to:', photographer.email); return; }
  await sgMail.send(msg);
}

// ── Confirmation mission au client ────────────────────────────────────────────
async function sendMissionConfirmed(clientEmail, clientName, mission, photographer) {
  const msg = {
    to: clientEmail,
    from: FROM,
    subject: `Votre séance photo est confirmée — ${mission.scheduled_date}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#059669;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;font-size:24px;margin:0 0 4px;">Serenis</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">Séance photo confirmée ✓</p>
  </td></tr>
  <tr><td style="background:#fff;padding:36px 40px;">
    <h2 style="color:#1C1C1A;font-family:Georgia,serif;font-size:20px;margin:0 0 8px;">Bonjour ${clientName || 'Madame, Monsieur'},</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Votre photographe partenaire a confirmé votre rendez-vous. Voici les informations de votre séance :</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F5F0E8;border-radius:8px;margin-bottom:24px;">
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;width:140px;">Date & heure</td><td style="font-weight:600;font-size:15px;color:#1C1C1A;">${mission.scheduled_date} à ${mission.scheduled_time}</td></tr>
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Adresse</td><td style="font-size:14px;">${mission.address}, ${mission.postal_code} ${mission.city}</td></tr>
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Photographe</td><td style="font-size:14px;font-weight:500;">${photographer.first_name} ${photographer.last_name}</td></tr>
    </table>
    <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 20px;">Veillez à être présent(e) ou à laisser un accès au bien. Le photographe vous contactera si nécessaire avant le rendez-vous.</p>
    <div style="text-align:center;">
      <a href="${BASE}/dashboard" style="display:inline-block;background:#1C1C1A;color:#F5F0E8;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Mon espace Serenis →</a>
    </div>
  </td></tr>
  <tr><td style="padding:20px;text-align:center;font-size:12px;color:#8C8880;">Serenis — Vendez votre bien. Sereinement.</td></tr>
</table></td></tr></table>
</body></html>`
  };
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Mission confirmed to:', clientEmail); return; }
  await sgMail.send(msg);
}

// ── Rappel J-1 mission ────────────────────────────────────────────────────────
async function sendMissionReminderJ1(clientEmail, clientName, mission, photographer) {
  const msg = {
    to: [clientEmail, photographer.email],
    from: FROM,
    subject: `Rappel — Séance photo demain à ${mission.scheduled_time} · ${mission.city}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#1C1C1A;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
    <h1 style="color:#F5F0E8;font-family:Georgia,serif;font-size:22px;margin:0;">Rappel · Séance photo demain</h1>
  </td></tr>
  <tr><td style="background:#fff;padding:36px 40px;">
    <p style="color:#444;line-height:1.7;margin:0 0 20px;">Votre séance photo est prévue <strong>demain</strong> :</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F5F0E8;border-radius:8px;margin-bottom:24px;">
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;width:140px;">Date & heure</td><td style="font-weight:700;font-size:16px;color:#C4603A;">${mission.scheduled_date} à ${mission.scheduled_time}</td></tr>
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Adresse</td><td style="font-size:14px;font-weight:500;">${mission.address}, ${mission.postal_code} ${mission.city}</td></tr>
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#8C8880;">Photographe</td><td style="font-size:14px;">${photographer.first_name} ${photographer.last_name}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px;text-align:center;font-size:12px;color:#8C8880;">Serenis</td></tr>
</table></td></tr></table>
</body></html>`
  };
  if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Reminder J-1 for mission:', mission.uuid); return; }
  await sgMail.send(msg);
}

// ── Nurturing automatique — 8 fonctions email ─────────────────────────────────

async function sendProspectNudge({ name, email }) {
  const msg = {
    to: email,
    from: FROM,
    subject: 'Votre projet de vente Serenis — nous gardons votre dossier',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:13px;margin:6px 0 0;">Vendez votre bien. Sereinement.</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Bonjour ${name || 'Madame, Monsieur'},</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Vous avez récemment exprimé votre intérêt pour vendre votre bien avec Serenis. Nous gardons votre dossier et sommes disponibles pour vous accompagner.</p>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Chez Serenis, nous aidons les particuliers à vendre leur bien <strong>sans agence</strong> — avec les outils, la formation et le suivi d'un professionnel, mais en gardant la maîtrise.</p>
    <div style="background:#F5F0E8;border-left:4px solid #C4785A;border-radius:4px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0;font-size:14px;color:#1A1A16;"><strong>Une question ?</strong> Matthias répond personnellement — <a href="mailto:contact@serenis.fr" style="color:#C4785A;">contact@serenis.fr</a> ou 06 95 44 36 54.</p>
    </div>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/tarifs" style="background:#C4785A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Voir nos offres →</a>
    </div>
    <p style="font-size:13px;color:#999;margin:0;">Si vous n'êtes plus intéressé(e), ignorez simplement cet email.</p>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — Douai (59) — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] ProspectNudge:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendProspectNudge:', e.message);
    return false;
  }
}

async function sendNoPropertyNudge({ email }) {
  const msg = {
    to: email,
    from: FROM,
    subject: 'Votre espace vous attend — créez votre fiche en 10 min',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:13px;margin:6px 0 0;">Votre espace est prêt</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Votre espace vous attend</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Votre accès Serenis est actif, mais votre fiche bien n'a pas encore été créée. C'est l'étape la plus importante pour démarrer votre vente.</p>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Comptez <strong>10 à 15 minutes</strong> pour renseigner les informations essentielles : type de bien, surface, prix, description. Vous pourrez compléter et modifier à tout moment.</p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/mon-bien" style="background:#C4785A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Créer ma fiche bien →</a>
    </div>
    <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">Besoin d'aide ? Matthias est disponible pour vous guider — <a href="mailto:contact@serenis.fr" style="color:#C4785A;">contact@serenis.fr</a></p>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] NoPropertyNudge:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendNoPropertyNudge:', e.message);
    return false;
  }
}

async function sendNoPhotosNudge({ email }) {
  const msg = {
    to: email,
    from: FROM,
    subject: 'Vos photos font vendre — ajoutez-les maintenant',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Les photos, c'est ce qui fait cliquer</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Votre fiche bien est créée — c'est une excellente base. Il manque cependant les photos, qui sont <strong>le facteur n°1</strong> pour attirer des acquéreurs.</p>
    <p style="color:#444;line-height:1.7;margin:0 0 8px;">Quelques conseils rapides :</p>
    <ul style="color:#444;line-height:1.9;margin:0 0 24px;padding-left:20px;">
      <li>Minimum 5 photos, idéalement 10 à 15</li>
      <li>Photographiez en journée, lumière naturelle</li>
      <li>Commencez par les pièces de vie (salon, cuisine)</li>
      <li>Finissez par l'extérieur et les espaces extérieurs</li>
    </ul>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/mon-bien" style="background:#C4785A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Ajouter mes photos →</a>
    </div>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] NoPhotosNudge:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendNoPhotosNudge:', e.message);
    return false;
  }
}

async function sendNotPublishedNudge({ email, score }) {
  const msg = {
    to: email,
    from: FROM,
    subject: 'Votre annonce est prête à être publiée',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Votre dossier est solide — publiez !</h2>
    ${score ? `<div style="background:#D4E4D8;border-radius:8px;padding:16px 20px;margin:0 0 24px;text-align:center;"><p style="margin:0;font-size:28px;font-weight:bold;color:#2a4030;">${score}/100</p><p style="margin:4px 0 0;font-size:13px;color:#3D5A47;">Score de votre dossier</p></div>` : ''}
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Votre fiche bien est bien avancée. Il ne manque plus qu'une chose : la rendre visible aux acquéreurs.</p>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">En publiant aujourd'hui, vous démarrez votre vente sans perdre de temps. Chaque semaine de visibilité compte sur le marché immobilier.</p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/mon-bien" style="background:#C4785A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Publier mon annonce →</a>
    </div>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] NotPublishedNudge:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendNotPublishedNudge:', e.message);
    return false;
  }
}

async function sendNewVisitRequest({ sellerEmail, buyerName, visitDate, notes }) {
  const msg = {
    to: sellerEmail,
    from: FROM,
    subject: `Nouvelle demande de visite — ${buyerName}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:13px;margin:6px 0 0;">Nouvelle demande de visite</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Un acquéreur souhaite visiter votre bien</h2>
    <div style="background:#F5F0E8;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:14px;color:#1A1A16;"><strong>Acquéreur :</strong> ${buyerName}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#1A1A16;"><strong>Date souhaitée :</strong> ${visitDate}</p>
      ${notes ? `<p style="margin:0;font-size:14px;color:#1A1A16;"><strong>Message :</strong> ${notes}</p>` : ''}
    </div>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Connectez-vous à votre espace Serenis pour confirmer ou proposer un autre créneau.</p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/serenis-connect" style="background:#C4785A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Gérer mes visites →</a>
    </div>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] NewVisitRequest:', sellerEmail); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendNewVisitRequest:', e.message);
    return false;
  }
}

async function sendVisitReminderSeller({ sellerEmail, buyerName, visitDate }) {
  const msg = {
    to: sellerEmail,
    from: FROM,
    subject: `Rappel visite demain — ${buyerName}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#1C1C1A;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#F5F0E8;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:rgba(245,240,232,0.6);font-size:13px;margin:6px 0 0;">Rappel visite</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Visite demain — préparez-vous !</h2>
    <div style="background:#D4E4D8;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#1C1C1A;">${buyerName}</p>
      <p style="margin:0;font-size:14px;color:#3D5A47;">Visite prévue le <strong>${visitDate}</strong></p>
    </div>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Pour préparer votre visite :</p>
    <ul style="color:#444;line-height:1.9;margin:0 0 24px;padding-left:20px;">
      <li>Aérez et rangez toutes les pièces</li>
      <li>Préparez les documents importants (diagnostics, taxe foncière)</li>
      <li>Notez les points forts à mettre en avant</li>
      <li>Prévoyez 45 à 60 minutes pour la visite</li>
    </ul>
    <div style="text-align:center;">
      <a href="${BASE}/serenis-connect" style="background:#1C1C1A;color:#F5F0E8;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Voir mes visites →</a>
    </div>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] VisitReminderSeller:', sellerEmail); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendVisitReminderSeller:', e.message);
    return false;
  }
}

async function sendMissingDocNudge({ email, missingDocs }) {
  const docList = (missingDocs || []).map(d => `<li style="margin-bottom:6px;">${d}</li>`).join('');
  const msg = {
    to: email,
    from: FROM,
    subject: 'Documents manquants dans votre dossier Serenis',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Des documents manquent à votre dossier</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Un dossier complet rassure les acquéreurs et accélère la vente. Voici ce qui manque encore :</p>
    ${docList ? `<ul style="color:#444;line-height:1.8;margin:0 0 24px;padding-left:20px;">${docList}</ul>` : '<p style="color:#444;margin:0 0 24px;">Certaines informations clés (DPE, taxe foncière) sont manquantes.</p>'}
    <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 24px;">Ces informations sont souvent demandées lors des premières questions d'acquéreurs. Les avoir prêts à l'avance vous fait gagner du temps.</p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/mon-bien" style="background:#C4785A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Compléter mon dossier →</a>
    </div>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] MissingDocNudge:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendMissingDocNudge:', e.message);
    return false;
  }
}

async function sendPublishedConfirmation({ email, propertySlug }) {
  const msg = {
    to: email,
    from: FROM,
    subject: '🎉 Votre bien est en ligne !',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#059669;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">Votre bien est en ligne !</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Félicitations — votre annonce est publiée 🎉</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Votre bien est maintenant visible sur votre espace Serenis. C'est une grande étape !</p>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Pensez à diffuser le lien de votre fiche sur LeBonCoin, PAP ou dans votre réseau pour maximiser votre visibilité. Chaque plateforme supplémentaire multiplie vos chances de trouver rapidement un acquéreur.</p>
    ${propertySlug ? `
    <div style="background:#F5F0E8;border-radius:8px;padding:16px 20px;margin:0 0 28px;text-align:center;">
      <p style="font-size:13px;color:#888;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Lien de votre fiche</p>
      <a href="${BASE}/bien/${propertySlug}" style="color:#C4785A;font-size:14px;word-break:break-all;">${BASE}/bien/${propertySlug}</a>
    </div>` : ''}
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/mes-publications" style="background:#C4785A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Diffuser mon annonce →</a>
    </div>
    <p style="color:#666;font-size:13px;margin:0;">Suivez vos performances (vues, contacts, visites) depuis votre tableau de bord Serenis.</p>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="color:#5C7A65;font-size:12px;margin:0;">Serenis — contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] PublishedConfirmation:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('[EMAIL ERROR] sendPublishedConfirmation:', e.message);
    return false;
  }
}

// ── Email direct admin → vendeur ──────────────────────────────
async function sendAdminDirectEmail({ to, subject, body, firstName }) {
  const name = firstName || '';
  const htmlBody = body.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const msg = {
    to, from: FROM,
    subject,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF8;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#1C1C1A;padding:24px 40px;text-align:center;">
    <span style="font-family:Georgia,serif;font-size:22px;color:#C4603A;font-weight:bold;">Serenis</span>
  </td></tr>
  <tr><td style="padding:36px 40px;">
    <p style="color:#555;line-height:1.75;font-size:15px;margin:0;">${htmlBody}</p>
    <hr style="border:none;border-top:1px solid #f0ebe3;margin:28px 0;">
    <p style="color:#aaa;font-size:12px;margin:0;">Serenis · 06 95 44 36 54 · matthiasbrieux260598@gmail.com</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
    text: body,
  };
  try { await sgMail.send(msg); return true; }
  catch(e) { console.error('[EMAIL ERROR] sendAdminDirectEmail:', e.message); return false; }
}

// ── Relance extension contrat (J-14 avant échéance) ───────────
async function sendContractRenewal({ email, firstName, expiryDate, daysLeft }) {
  const name = firstName || 'Vendeur';
  const dateStr = new Date(expiryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const urgency = daysLeft <= 7 ? '#dc2626' : '#d97706';
  const msg = {
    to: email, from: FROM,
    subject: `⏳ Votre contrat Serenis expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} — prolongez votre accompagnement`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF8;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#1C1C1A;padding:32px 40px;text-align:center;">
    <h1 style="color:#C4603A;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:#9a9a8e;font-size:13px;margin:6px 0 0;">Vendez votre bien. Sereinement.</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <div style="background:${urgency};border-radius:8px;padding:16px 20px;margin-bottom:28px;text-align:center;">
      <p style="color:#fff;font-weight:bold;font-size:16px;margin:0;">Votre contrat expire dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong></p>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0;">Date d'échéance : ${dateStr}</p>
    </div>
    <h2 style="color:#1C1C1A;font-family:Georgia,serif;font-size:20px;margin:0 0 14px;">Bonjour ${name},</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Votre mandat de vente avec Serenis arrive bientôt à échéance. Si votre bien est toujours en vente, nous vous recommandons de prolonger votre accompagnement pour continuer à bénéficier de :</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#1C1C1A;"><span style="color:#C4603A;margin-right:8px;">✓</span>Votre numéro dédié actif</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#1C1C1A;"><span style="color:#C4603A;margin-right:8px;">✓</span>L'agenda de visites en ligne</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#1C1C1A;"><span style="color:#C4603A;margin-right:8px;">✓</span>Le suivi des contacts acheteurs</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#1C1C1A;"><span style="color:#C4603A;margin-right:8px;">✓</span>L'accompagnement personnalisé de Matthias</td></tr>
    </table>
    <p style="color:#555;line-height:1.7;margin:0 0 28px;">Contactez-nous pour discuter des modalités de renouvellement adaptées à votre situation.</p>
    <div style="text-align:center;">
      <a href="mailto:matthiasbrieux260598@gmail.com?subject=Renouvellement%20contrat%20Serenis" style="display:inline-block;background:#C4603A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">Contacter Matthias pour renouveler</a>
    </div>
    <p style="color:#aaa;font-size:12px;text-align:center;margin:24px 0 0;">Serenis — 06 95 44 36 54 — matthiasbrieux260598@gmail.com</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try { await sgMail.send(msg); return true; } catch(e) { console.error('[EMAIL ERROR] sendContractRenewal:', e.message); return false; }
}

// ── Demande d'avis après vente réalisée ───────────────────────
async function sendReviewRequest({ email, firstName, daysToSell, propertyCity }) {
  const name = firstName || 'Vendeur';
  const city = propertyCity || 'votre bien';
  const daysStr = daysToSell ? `en seulement <strong>${daysToSell} jour${daysToSell > 1 ? 's' : ''}</strong>` : 'avec succès';
  const msg = {
    to: email, from: FROM,
    subject: `🎉 Félicitations pour la vente — partagez votre expérience Serenis`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF8;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#1C1C1A;padding:32px 40px;text-align:center;">
    <h1 style="color:#C4603A;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:#9a9a8e;font-size:13px;margin:6px 0 0;">Vendez votre bien. Sereinement.</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <h2 style="color:#1C1C1A;font-family:Georgia,serif;font-size:22px;margin:0 0 8px;">Félicitations ${name} !</h2>
      <p style="color:#C4603A;font-weight:bold;font-size:15px;margin:0;">Votre bien à ${city} est vendu ${daysStr} !</p>
    </div>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Nous sommes ravis d'avoir accompagné votre projet de vente. Votre retour d'expérience est précieux pour nous et pour les futurs vendeurs qui hésitent encore à se lancer.</p>
    <p style="color:#555;line-height:1.7;margin:0 0 28px;">Pourriez-vous prendre 2 minutes pour partager votre expérience avec Serenis ? Votre avis aide d'autres particuliers à prendre la bonne décision.</p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="mailto:matthiasbrieux260598@gmail.com?subject=Mon%20avis%20Serenis&body=Mon%20expérience%20avec%20Serenis%20:%0A%0AJ'ai%20vendu%20mon%20bien%20en%20${daysToSell || ''}%20jours.%0A%0ANote%20globale%20(1-5)%20:%0A%0ACe%20que%20j'ai%20le%20plus%20apprécié%20:%0A%0AConseils%20pour%20améliorer%20le%20service%20:" style="display:inline-block;background:#C4603A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">Laisser mon avis</a>
    </div>
    <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">Merci d'avoir choisi Serenis pour votre vente immobilière.<br>À bientôt peut-être pour un prochain projet !</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try { await sgMail.send(msg); return true; } catch(e) { console.error('[EMAIL ERROR] sendReviewRequest:', e.message); return false; }
}

// ── Relance acheteur post-visite (J+7, pas d'offre) ──────────
async function sendPostVisitBuyerNudge({ buyerEmail, buyerName, propertyCity, propertyType, propertySlug, price }) {
  const priceStr = price ? Number(price).toLocaleString('fr-FR') + ' €' : null;
  const msg = {
    to: buyerEmail, from: FROM,
    subject: `Comment s'est passée votre visite ? — ${propertyType || 'Bien'} ${propertyCity || ''}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF8;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#3D5A47;padding:28px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:24px;margin:0;">Serenis</h1>
  </td></tr>
  <tr><td style="padding:36px 40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Bonjour ${buyerName || ''},</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 16px;">Vous avez récemment visité un <strong>${propertyType || 'bien'} à ${propertyCity || ''}</strong>${priceStr ? ` affiché à <strong>${priceStr}</strong>` : ''}.</p>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">Si ce bien vous intéresse, sachez que vous pouvez soumettre une offre directement depuis la fiche. Le vendeur sera notifié immédiatement.</p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${BASE}/bien/${propertySlug}" style="display:inline-block;background:#C4603A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">Revoir le bien et faire une offre →</a>
    </div>
    <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">Serenis · Plateforme de vente entre particuliers</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] PostVisitBuyerNudge:', buyerEmail); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendPostVisitBuyerNudge:', e.message); return false; }
}

// ── Facture automatique après paiement ────────────────────────
async function sendInvoiceEmail({ email, firstName, amount, pack, invoiceNumber, date }) {
  const name = firstName || email;
  const packLabel = pack === 'serenite' ? 'Pack Sérénité' : 'Pack Autonome';
  const amountEur = (amount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  const tva = (amount * 0.20 / 120).toFixed(2); // TVA incluse 20%
  const ht = (amount / 100 - parseFloat(tva)).toFixed(2);
  const dateStr = new Date(date || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const msg = {
    to: email, from: FROM,
    subject: `Facture Serenis n° ${invoiceNumber} — ${packLabel}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF8;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#1C1C1A;padding:32px 40px;">
    <table width="100%"><tr>
      <td><span style="font-family:Georgia,serif;font-size:24px;color:#C4603A;font-weight:bold;">Serenis</span><br><span style="color:#9a9a8e;font-size:12px;">Vendez votre bien. Sereinement.</span></td>
      <td style="text-align:right;"><span style="color:#FDFCF8;font-size:13px;font-weight:bold;">FACTURE</span><br><span style="color:#9a9a8e;font-size:12px;">n° ${invoiceNumber}</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px 40px;">
    <table width="100%" style="margin-bottom:28px;">
      <tr>
        <td style="vertical-align:top;">
          <p style="font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Émetteur</p>
          <p style="font-size:14px;color:#1C1C1A;line-height:1.6;margin:0;">Matthias Brieux<br>Serenis<br>Douai (59), France<br>06 95 44 36 54<br>matthiasbrieux260598@gmail.com</p>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <p style="font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Destinataire</p>
          <p style="font-size:14px;color:#1C1C1A;line-height:1.6;margin:0;">${name}<br>${email}</p>
          <p style="font-size:12px;color:#aaa;margin:12px 0 0;">Date : ${dateStr}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
      <tr style="background:#F5F0E8;">
        <td style="padding:10px 14px;font-size:12px;font-weight:bold;color:#888;text-transform:uppercase;">Désignation</td>
        <td style="padding:10px 14px;font-size:12px;font-weight:bold;color:#888;text-transform:uppercase;text-align:right;">Montant TTC</td>
      </tr>
      <tr style="border-top:1px solid #e8e0d6;border-bottom:1px solid #e8e0d6;">
        <td style="padding:16px 14px;">
          <p style="font-size:15px;font-weight:bold;color:#1C1C1A;margin:0 0 4px;">${packLabel}</p>
          <p style="font-size:13px;color:#777;margin:0;">Accès à la plateforme Serenis — outils numériques, coaching, automatisations pour la vente immobilière entre particuliers</p>
        </td>
        <td style="padding:16px 14px;text-align:right;font-size:16px;font-weight:bold;color:#1C1C1A;white-space:nowrap;">${amountEur} €</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="text-align:right;padding:6px 14px;font-size:13px;color:#777;">Montant HT : <strong>${ht} €</strong></td></tr>
      <tr><td style="text-align:right;padding:6px 14px;font-size:13px;color:#777;">TVA 20% : <strong>${tva} €</strong></td></tr>
      <tr><td style="text-align:right;padding:10px 14px;">
        <div style="display:inline-block;background:#1C1C1A;color:#FDFCF8;padding:10px 20px;border-radius:6px;font-size:15px;font-weight:bold;">Total TTC : ${amountEur} €</div>
      </td></tr>
    </table>

    <div style="background:#D4E4D8;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="color:#2a4030;font-weight:bold;margin:0;">✓ Paiement reçu — Facture acquittée</p>
    </div>

    <p style="color:#aaa;font-size:11px;line-height:1.6;margin:0;">Serenis est une plateforme numérique d'outils et de formation. Le vendeur reste seul responsable de sa vente. TVA applicable selon réglementation en vigueur. Document faisant foi de paiement.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] Invoice:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendInvoiceEmail:', e.message); return false; }
}

// ── Notification offre d'achat au vendeur ─────────────────────
async function sendOfferNotification({ sellerEmail, sellerFirstName, buyerName, buyerEmail, buyerPhone, amount, conditions, propertyCity, propertyType }) {
  const name = sellerFirstName || 'Vendeur';
  const amountStr = Number(amount).toLocaleString('fr-FR');
  const msg = {
    to: sellerEmail, from: FROM,
    subject: `Nouvelle offre d'achat — ${amountStr} € — ${propertyType || 'Bien'} ${propertyCity || ''}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF8;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#059669;padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;font-size:26px;margin:0;">Serenis</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">Nouvelle offre d'achat reçue !</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:22px;margin:0 0 20px;">Bonjour ${name}, vous avez une offre !</h2>
    <div style="background:#D4E4D8;border-radius:10px;padding:24px;margin-bottom:28px;text-align:center;">
      <p style="font-size:13px;color:#3D5A47;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Montant de l'offre</p>
      <p style="font-size:36px;font-weight:bold;color:#1C1C1A;margin:0;font-family:Georgia,serif;">${amountStr} €</p>
    </div>
    <div style="background:#F5F0E8;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="font-size:12px;color:#aaa;text-transform:uppercase;margin:0 0 12px;">Coordonnées de l'acquéreur</p>
      <p style="margin:4px 0;font-size:14px;color:#1C1C1A;"><strong>Nom :</strong> ${buyerName}</p>
      <p style="margin:4px 0;font-size:14px;color:#1C1C1A;"><strong>Email :</strong> <a href="mailto:${buyerEmail}" style="color:#C4603A;">${buyerEmail}</a></p>
      ${buyerPhone ? `<p style="margin:4px 0;font-size:14px;color:#1C1C1A;"><strong>Téléphone :</strong> ${buyerPhone}</p>` : ''}
      ${conditions ? `<p style="margin:12px 0 0;font-size:14px;color:#1C1C1A;"><strong>Conditions :</strong> ${conditions}</p>` : ''}
    </div>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">Connectez-vous à votre espace Serenis pour consulter et répondre à cette offre.</p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${BASE}/dashboard" style="display:inline-block;background:#C4603A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">Voir l'offre et répondre →</a>
    </div>
    <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">Serenis · 06 95 44 36 54 · contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] OfferNotification:', sellerEmail); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendOfferNotification:', e.message); return false; }
}

async function sendWeeklyAdminReport({ to, stats }) {
  const { newClients, newOffers, newVisits, publishedProps, totalRevenue, totalActive } = stats;
  const msg = {
    to, from: FROM,
    subject: `📊 Rapport hebdo Serenis — semaine du ${new Date().toLocaleDateString('fr-FR')}`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;">
  <tr><td style="background:#1C1C1A;padding:28px 36px;">
    <div style="font-family:Georgia,serif;font-size:22px;color:#C4785A;">Serenis</div>
    <div style="color:rgba(253,252,248,0.6);font-size:13px;margin-top:4px;">Rapport hebdomadaire — semaine du ${new Date().toLocaleDateString('fr-FR')}</div>
  </td></tr>
  <tr><td style="padding:32px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:0 8px 16px 0;">
          <div style="background:#F5F0E8;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:36px;font-weight:bold;color:#3D5A47;">${newClients}</div>
            <div style="font-size:13px;color:#888;margin-top:4px;">Nouveaux clients</div>
          </div>
        </td>
        <td width="50%" style="padding:0 0 16px 8px;">
          <div style="background:#F5F0E8;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:36px;font-weight:bold;color:#C4785A;">${newOffers}</div>
            <div style="font-size:13px;color:#888;margin-top:4px;">Offres d'achat reçues</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:0 8px 16px 0;">
          <div style="background:#F5F0E8;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:36px;font-weight:bold;color:#2563eb;">${newVisits}</div>
            <div style="font-size:13px;color:#888;margin-top:4px;">Visites réservées</div>
          </div>
        </td>
        <td width="50%" style="padding:0 0 16px 8px;">
          <div style="background:#F5F0E8;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:36px;font-weight:bold;color:#7c3aed;">${publishedProps}</div>
            <div style="font-size:13px;color:#888;margin-top:4px;">Biens publiés</div>
          </div>
        </td>
      </tr>
    </table>
    <div style="background:#3D5A47;border-radius:10px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <div style="color:rgba(212,228,216,0.7);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">CA estimé cette semaine</div>
        <div style="font-family:Georgia,serif;font-size:28px;color:#fff;margin-top:4px;">${Number(totalRevenue||0).toLocaleString('fr-FR')} €</div>
      </div>
      <div style="text-align:right;">
        <div style="color:rgba(212,228,216,0.7);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Clients actifs</div>
        <div style="font-family:Georgia,serif;font-size:28px;color:#D4E4D8;margin-top:4px;">${totalActive}</div>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="${BASE}/admin" style="display:inline-block;background:#C4785A;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;">Voir le CRM complet →</a>
    </div>
  </td></tr>
  <tr><td style="background:#F5F0E8;padding:20px 36px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">Serenis · Rapport automatique hebdomadaire (lundi matin)</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] WeeklyAdminReport'); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendWeeklyAdminReport:', e.message); return false; }
}

async function sendPhotographerAvailabilityRequest({ email, firstName }) {
  const msg = {
    to: email, from: FROM,
    subject: '📸 Planifions votre séance photo — donnez-nous vos disponibilités',
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
  <tr><td style="background:#3D5A47;padding:32px 36px;">
    <div style="font-family:Georgia,serif;font-size:26px;color:#fff;">Serenis</div>
    <div style="color:#D4E4D8;font-size:13px;margin-top:4px;">Vente immobilière sereine</div>
  </td></tr>
  <tr><td style="padding:36px 36px 24px;">
    <h2 style="font-family:Georgia,serif;color:#3D5A47;margin:0 0 20px;">Bonjour ${firstName},</h2>
    <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 16px;">Votre bien est presque prêt à être présenté aux acheteurs — il ne manque plus que les photos professionnelles !</p>
    <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 24px;">Notre photographe partenaire se déplace directement chez vous pour réaliser des clichés valorisants. La séance dure environ 1h30 et inclut la retouche professionnelle.</p>
    <div style="background:#f0f7f2;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:14px;color:#3D5A47;font-weight:bold;margin-bottom:12px;">Pour organiser la séance :</div>
      <ul style="color:#4a5568;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Indiquez-nous 2 ou 3 créneaux qui vous conviennent</li>
        <li>Précisez si vous avez des contraintes (enfants, animaux, travaux en cours)</li>
        <li>La séance a lieu en journée, idéalement en milieu de journée pour la lumière</li>
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${BASE}/seller/agenda" style="display:inline-block;background:#C4785A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;">Proposer mes disponibilités →</a>
    </div>
    <p style="color:#4a5568;font-size:14px;line-height:1.7;margin:0;">Vous pouvez aussi répondre directement à cet email. Nous reviendrons vers vous sous 24h pour confirmer la date.</p>
  </td></tr>
  <tr><td style="background:#F5F0E8;padding:20px 36px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">Serenis · contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] PhotographerAvailability'); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendPhotographerAvailabilityRequest:', e.message); return false; }
}

async function sendPostFirstVisitFeedbackSeller({ email, firstName }) {
  const msg = {
    to: email, from: FROM,
    subject: '🏡 Comment s\'est passée votre première session de visites ?',
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
  <tr><td style="background:#3D5A47;padding:32px 36px;">
    <div style="font-family:Georgia,serif;font-size:26px;color:#fff;">Serenis</div>
    <div style="color:#D4E4D8;font-size:13px;margin-top:4px;">Vente immobilière sereine</div>
  </td></tr>
  <tr><td style="padding:36px 36px 24px;">
    <h2 style="font-family:Georgia,serif;color:#3D5A47;margin:0 0 20px;">Bonjour ${firstName},</h2>
    <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 16px;">Vous venez d'accueillir vos premiers acheteurs — félicitations pour cette étape importante !</p>
    <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 24px;">Nous aimerions savoir comment cela s'est passé pour vous. Votre retour nous aide à améliorer notre accompagnement et à vous conseiller au mieux pour la suite.</p>
    <div style="background:#f0f7f2;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:14px;color:#3D5A47;font-weight:bold;margin-bottom:12px;">Quelques questions rapides :</div>
      <ul style="color:#4a5568;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Les acheteurs ont-ils posé des questions auxquelles vous étiez difficile à répondre ?</li>
        <li>Y a-t-il des points de votre bien qui ont semblé les freiner ?</li>
        <li>Avez-vous reçu des retours positifs sur votre présentation ?</li>
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${BASE}/seller/property" style="display:inline-block;background:#C4785A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;">Consulter mon espace →</a>
    </div>
    <p style="color:#4a5568;font-size:14px;line-height:1.7;margin:0;">Répondez simplement à cet email — notre équipe lit tous les retours et vous répond personnellement.</p>
  </td></tr>
  <tr><td style="background:#F5F0E8;padding:20px 36px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">Serenis · contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] PostFirstVisitFeedbackSeller'); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendPostFirstVisitFeedbackSeller:', e.message); return false; }
}

async function sendCheckInNoOffer({ email, firstName, daysPublished }) {
  const msg = {
    to: email, from: FROM,
    subject: '💬 Des questions ? On est là pour vous aider',
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
  <tr><td style="background:#3D5A47;padding:32px 36px;">
    <div style="font-family:Georgia,serif;font-size:26px;color:#fff;">Serenis</div>
    <div style="color:#D4E4D8;font-size:13px;margin-top:4px;">Vente immobilière sereine</div>
  </td></tr>
  <tr><td style="padding:36px 36px 24px;">
    <h2 style="font-family:Georgia,serif;color:#3D5A47;margin:0 0 20px;">Bonjour ${firstName},</h2>
    <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 16px;">Votre bien est en ligne depuis ${daysPublished} jours — c'est une belle avancée !</p>
    <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 24px;">La vente immobilière entre particuliers peut parfois soulever des questions, et nous voulons être là pour vous. N'hésitez pas à nous solliciter sur n'importe quel aspect de votre projet.</p>
    <div style="background:#f0f7f2;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:14px;color:#3D5A47;font-weight:bold;margin-bottom:12px;">Nous pouvons vous aider sur :</div>
      <ul style="color:#4a5568;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
        <li>L'optimisation de votre annonce ou de vos photos</li>
        <li>Comment répondre aux acheteurs et qualifier les visites</li>
        <li>La négociation et la gestion des offres</li>
        <li>Les étapes chez le notaire</li>
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${BASE}/seller/property" style="display:inline-block;background:#C4785A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;">Accéder à mon espace →</a>
    </div>
    <p style="color:#4a5568;font-size:14px;line-height:1.7;margin:0;">Répondez à cet email ou utilisez le Coach IA dans votre espace — nous sommes là pour que votre vente se passe dans les meilleures conditions.</p>
  </td></tr>
  <tr><td style="background:#F5F0E8;padding:20px 36px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">Serenis · contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] CheckInNoOffer'); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendCheckInNoOffer:', e.message); return false; }
}

module.exports = { sendWelcomeEmail, sendDossierEmail, sendVisitConfirmation, sendContactNotification, sendMissionAssigned, sendMissionConfirmed, sendMissionReminderJ1, sendProspectNudge, sendNoPropertyNudge, sendNoPhotosNudge, sendNotPublishedNudge, sendNewVisitRequest, sendVisitReminderSeller, sendMissingDocNudge, sendPublishedConfirmation, sendContractRenewal, sendReviewRequest, sendAdminDirectEmail, sendInvoiceEmail, sendOfferNotification, sendPostVisitBuyerNudge, sendWeeklyAdminReport, sendPhotographerAvailabilityRequest, sendPostFirstVisitFeedbackSeller, sendCheckInNoOffer };
