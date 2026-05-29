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

// ── Renseignements manquants sur la fiche (admin → vendeur) ──────────────────
async function sendInfoNeededEmail({ email, firstName, missingFields }) {
  const name = firstName || 'Vendeur';
  const fieldList = (missingFields || []).map(f => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#1A1A16;border-bottom:1px solid #e8e0d6;">
        <span style="color:#C4785A;margin-right:10px;">→</span>${f}
      </td>
    </tr>`).join('');
  const msg = {
    to: email, from: FROM,
    subject: 'Nous avons besoin de renseignements sur votre bien',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:28px;margin:0 0 6px;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:14px;margin:0;">Vendez votre bien. Sereinement.</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Bonjour ${name},</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 20px;">Nous avons examiné votre fiche bien et il nous manque quelques informations importantes pour la compléter correctement. Un dossier complet rassure les acheteurs et augmente vos chances de vendre rapidement.</p>
    <div style="background:#F5F0E8;border-left:4px solid #C4785A;border-radius:4px;padding:20px;margin:0 0 28px;">
      <p style="font-size:13px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 14px;">Informations manquantes</p>
      <table width="100%" cellpadding="0" cellspacing="0">${fieldList || '<tr><td style="padding:8px 0;font-size:14px;color:#1A1A16;">Certaines informations clés sont incomplètes.</td></tr>'}</table>
    </div>
    <p style="color:#444;line-height:1.7;margin:0 0 28px;">Connectez-vous à votre espace pour compléter ces informations. Si vous avez la moindre question, répondez directement à cet email — Matthias vous répond personnellement.</p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/mon-bien" style="background:#C4785A;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Compléter ma fiche →</a>
    </div>
    <p style="font-size:13px;color:#999;margin:0;">Une question ? Contactez Matthias au <strong>06 95 44 36 54</strong> ou par email.</p>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
    <p style="color:#D4E4D8;font-size:13px;margin:0 0 6px;">Une question ? Matthias répond personnellement.</p>
    <p style="color:#5C7A65;font-size:12px;margin:0;">06 95 44 36 54 — contact@serenis.fr — Douai (59)</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] InfoNeeded:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendInfoNeededEmail:', e.message); return false; }
}

// ── Notification vendeur : un acheteur a laissé ses coordonnées ──────────────
async function sendBuyerContactedSeller({ email, firstName, buyerName, buyerPhone, propertyAddress }) {
  const name = firstName || 'Vendeur';
  const msg = {
    to: email, from: FROM,
    subject: `Un acheteur vous a contacté via votre annonce`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:28px;margin:0 0 6px;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:14px;margin:0;">Un acheteur vous a contacté !</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Bonjour ${name},</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 20px;">Bonne nouvelle — un acheteur a consulté votre annonce et souhaite vous contacter directement. Voici ses coordonnées :</p>
    <div style="background:#D4E4D8;border-radius:10px;padding:24px;margin:0 0 28px;">
      <p style="font-size:13px;font-weight:bold;color:#3D5A47;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 14px;">Coordonnées de l'acheteur</p>
      <p style="margin:6px 0;font-size:15px;color:#1A1A16;"><strong>Nom :</strong> ${buyerName}</p>
      ${buyerPhone ? `<p style="margin:6px 0;font-size:15px;color:#1A1A16;"><strong>Téléphone :</strong> <a href="tel:${buyerPhone}" style="color:#C4785A;text-decoration:none;font-weight:bold;">${buyerPhone}</a></p>` : ''}
      ${propertyAddress ? `<p style="margin:10px 0 0;font-size:14px;color:#3D5A47;"><strong>Annonce concernée :</strong> ${propertyAddress}</p>` : ''}
    </div>
    <p style="color:#444;line-height:1.7;margin:0 0 12px;">Nous vous recommandons de le rappeler dans les <strong>24 heures</strong> — la réactivité est un facteur clé pour convertir un contact en visite.</p>
    <p style="color:#444;line-height:1.7;margin:0 0 28px;">Pensez à qualifier l'acheteur : financement, délai d'achat, situation actuelle. Ces informations vous aideront à prioriser vos visites.</p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${BASE}/serenis-connect" style="background:#C4785A;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Gérer mes contacts →</a>
    </div>
    <p style="font-size:13px;color:#999;margin:0;">Un doute sur la marche à suivre ? Répondez à cet email — Matthias vous conseille.</p>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
    <p style="color:#D4E4D8;font-size:13px;margin:0 0 6px;">Une question ? Matthias répond personnellement.</p>
    <p style="color:#5C7A65;font-size:12px;margin:0;">06 95 44 36 54 — contact@serenis.fr — Douai (59)</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] BuyerContactedSeller:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendBuyerContactedSeller:', e.message); return false; }
}

// ── Demande de retour visite à l'acheteur ────────────────────────────────────
async function sendVisitFeedbackRequest({ email, firstName, visitDate, buyerName }) {
  const name = firstName || buyerName || 'Madame, Monsieur';
  const msg = {
    to: email, from: FROM,
    subject: `Comment s'est passée votre visite ?`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:28px;margin:0 0 6px;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:14px;margin:0;">Votre expérience nous intéresse</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Bonjour ${name},</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Vous avez visité un bien le <strong>${visitDate}</strong> via la plateforme Serenis. Nous espérons que cette visite s'est déroulée dans les meilleures conditions.</p>
    <p style="color:#444;line-height:1.7;margin:0 0 24px;">Votre retour est précieux — il nous aide à améliorer l'expérience pour tous et à conseiller le vendeur si besoin. Quelques questions rapides :</p>
    <div style="background:#F5F0E8;border-radius:10px;padding:24px;margin:0 0 28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:10px 0;font-size:14px;color:#1A1A16;border-bottom:1px solid #e8e0d6;"><span style="color:#C4785A;margin-right:10px;">1.</span>Le bien correspondait-il à la description de l'annonce ?</td></tr>
        <tr><td style="padding:10px 0;font-size:14px;color:#1A1A16;border-bottom:1px solid #e8e0d6;"><span style="color:#C4785A;margin-right:10px;">2.</span>Le vendeur était-il disponible et arrangeant ?</td></tr>
        <tr><td style="padding:10px 0;font-size:14px;color:#1A1A16;border-bottom:1px solid #e8e0d6;"><span style="color:#C4785A;margin-right:10px;">3.</span>Ce bien vous intéresse-t-il encore ?</td></tr>
        <tr><td style="padding:10px 0;font-size:14px;color:#1A1A16;"><span style="color:#C4785A;margin-right:10px;">4.</span>Y a-t-il autre chose que vous souhaiteriez nous dire ?</td></tr>
      </table>
    </div>
    <p style="color:#444;line-height:1.7;margin:0 0 28px;">Répondez simplement à cet email — un membre de l'équipe Serenis lit chaque retour et peut vous aider si vous avez des questions sur la suite.</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="mailto:contact@serenis.fr?subject=Retour%20visite%20du%20${encodeURIComponent(visitDate)}" style="background:#C4785A;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Donner mon avis →</a>
    </div>
    <p style="font-size:13px;color:#999;margin:0;">Si ce bien ne vous correspond plus, d'autres annonces sont disponibles sur Serenis.</p>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
    <p style="color:#D4E4D8;font-size:13px;margin:0 0 6px;">Serenis — plateforme de vente immobilière entre particuliers</p>
    <p style="color:#5C7A65;font-size:12px;margin:0;">contact@serenis.fr — Douai (59)</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] VisitFeedbackRequest:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendVisitFeedbackRequest:', e.message); return false; }
}

// ── Félicitations vente conclue ───────────────────────────────────────────────
async function sendSoldCongrats({ email, firstName, address, price }) {
  const name = firstName || 'Vendeur';
  const priceStr = price ? Number(price).toLocaleString('fr-FR') + ' €' : null;
  const msg = {
    to: email, from: FROM,
    subject: `Félicitations, votre bien est vendu !`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#3D5A47;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:28px;margin:0 0 6px;">Serenis</h1>
    <p style="color:#D4E4D8;font-size:14px;margin:0;">Vendez votre bien. Sereinement.</p>
  </td></tr>
  <tr><td style="background:#FDFCF8;padding:40px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#D4E4D8;border-radius:50%;width:80px;height:80px;line-height:80px;font-size:40px;margin-bottom:16px;">🎉</div>
      <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:26px;margin:0 0 8px;">Félicitations ${name} !</h2>
      <p style="color:#C4785A;font-size:16px;font-weight:bold;margin:0;">Votre bien est officiellement vendu.</p>
    </div>
    ${address || priceStr ? `
    <div style="background:#D4E4D8;border-radius:10px;padding:24px;margin:0 0 28px;text-align:center;">
      ${address ? `<p style="font-size:15px;font-weight:bold;color:#2a4030;margin:0 0 6px;">${address}</p>` : ''}
      ${priceStr ? `<p style="font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#3D5A47;margin:0;">${priceStr}</p>` : ''}
    </div>` : ''}
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">C'est une réussite dont vous pouvez être fier(e). Vous avez choisi de vendre sans agence, avec les bons outils et la bonne méthode — et vous y êtes arrivé(e).</p>
    <p style="color:#444;line-height:1.7;margin:0 0 16px;">Il ne reste plus qu'à finaliser la signature chez le notaire. Si vous avez des questions sur les dernières étapes, notre équipe est là pour vous accompagner jusqu'au bout.</p>
    <div style="background:#F5F0E8;border-left:4px solid #C4785A;border-radius:4px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0;font-size:14px;color:#1A1A16;"><strong>Et maintenant ?</strong> Pensez à partager votre expérience — votre témoignage aide d'autres particuliers à se lancer. Répondez à cet email pour nous laisser votre avis.</p>
    </div>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="mailto:contact@serenis.fr?subject=Mon%20témoignage%20Serenis" style="background:#C4785A;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">Laisser mon témoignage →</a>
    </div>
    <p style="font-size:13px;color:#999;margin:0;text-align:center;">Merci de nous avoir fait confiance. À bientôt peut-être pour un prochain projet !</p>
  </td></tr>
  <tr><td style="background:#3D5A47;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
    <p style="color:#D4E4D8;font-size:13px;margin:0 0 6px;">Une question ? Matthias répond personnellement.</p>
    <p style="color:#5C7A65;font-size:12px;margin:0;">06 95 44 36 54 — contact@serenis.fr — Douai (59)</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] SoldCongrats:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendSoldCongrats:', e.message); return false; }
}

// ── Welcome amélioré avec checklist numérotée ─────────────────────────────────
async function sendWelcomeImproved({ to, firstName, pack, tempPassword }) {
  const name = firstName || '';
  const isSerenite = pack === 'serenite';
  const packLabel = isSerenite ? 'Pack Sérénité' : 'Pack Autonome';
  const packColor = isSerenite ? '#3D5A47' : '#5a8a6a';

  const steps = [
    { num: '1', title: 'Compléter votre fiche bien', desc: 'Renseignez type de bien, surface, nombre de pièces, description et prix. Comptez 15 minutes.', link: `${BASE}/mon-bien`, cta: 'Remplir ma fiche' },
    { num: '2', title: 'Ajouter vos photos', desc: 'Minimum 5 photos en haute résolution. Commencez par le salon et la cuisine, en journée pour profiter de la lumière naturelle.', link: `${BASE}/mon-bien`, cta: 'Ajouter mes photos' },
    { num: '3', title: 'Ajouter vos diagnostics', desc: 'DPE obligatoire, plus tous les diagnostics disponibles. Un dossier complet rassure les acheteurs et accélère la vente.', link: `${BASE}/mon-bien`, cta: 'Déposer mes documents' },
    { num: '4', title: 'Publier votre annonce', desc: 'Une fois la fiche validée par notre équipe, publiez en un clic et diffusez votre lien sur LeBonCoin, PAP, et votre réseau.', link: `${BASE}/mon-bien`, cta: 'Publier mon annonce' },
  ];

  const stepRows = steps.map(s => `
    <tr>
      <td style="padding:0 0 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#C4785A;width:48px;min-width:48px;text-align:center;vertical-align:top;padding:20px 0;">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#fff;">${s.num}</span>
            </td>
            <td style="padding:16px 20px;vertical-align:top;">
              <p style="font-size:15px;font-weight:bold;color:#2a4030;margin:0 0 6px;">${s.title}</p>
              <p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 12px;">${s.desc}</p>
              <a href="${s.link}" style="font-size:13px;color:#C4785A;font-weight:bold;text-decoration:none;">${s.cta} →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('');

  const msg = {
    to, from: FROM,
    subject: `Bienvenue sur Serenis — vos 4 premières étapes`,
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
    <p style="color:#D4E4D8;font-size:14px;margin:0 0 16px;">Vendez votre bien. Sereinement.</p>
    <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:20px;padding:5px 18px;">
      <span style="color:#fff;font-size:13px;font-weight:bold;">${packLabel}</span>
    </div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#FDFCF8;padding:40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:22px;margin:0 0 8px;">Bienvenue${name ? ' ' + name : ''} !</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 28px;">Votre espace est actif. Pour bien démarrer votre vente, suivez ces <strong>4 étapes dans l'ordre</strong> — chacune est simple et guidée.</p>

    <!-- Identifiants -->
    <div style="background:#F5F0E8;border-left:4px solid #C4785A;border-radius:4px;padding:18px 20px;margin:0 0 32px;">
      <p style="font-size:12px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Vos identifiants de connexion</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1A16;"><strong>Email :</strong> ${to}</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1A16;"><strong>Mot de passe temporaire :</strong> <code style="background:#e8e0d6;padding:2px 6px;border-radius:4px;font-size:13px;">${tempPassword || '(celui reçu lors de votre inscription)'}</code></p>
      <p style="font-size:12px;color:#aaa;margin:10px 0 0;">Changez votre mot de passe dès votre première connexion.</p>
    </div>

    <!-- Étapes -->
    <p style="font-size:13px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px;">Vos 4 premières étapes</p>
    <table width="100%" cellpadding="0" cellspacing="0">${stepRows}</table>

    <!-- CTA principal -->
    <div style="text-align:center;margin:8px 0 32px;">
      <a href="${BASE}/dashboard" style="background:#C4785A;color:#fff;padding:16px 44px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;letter-spacing:0.02em;">Accéder à mon espace →</a>
    </div>

    <p style="font-size:13px;color:#999;margin:0;">Une question sur la marche à suivre ? Répondez à cet email — Matthias vous répond personnellement.</p>
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
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] WelcomeImproved:', to); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendWelcomeImproved:', e.message); return false; }
}

async function sendDossierToNotaire({ notaireEmail, notaireName, sellerName, property, dossierUrl }) {
  const msg = {
    to: notaireEmail,
    from: { email: FROM.email, name: 'Serenis Immobilier' },
    subject: `Dossier complet — ${property.type ? property.type.charAt(0).toUpperCase()+property.type.slice(1) : 'Bien'} ${property.city || ''}`,
    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

  <tr><td style="background:#1A1A16;padding:28px 40px;">
    <p style="color:#C4785A;font-family:Georgia,serif;font-size:22px;margin:0;">Sere<em style="color:#C4785A;">nis</em></p>
    <p style="color:rgba(196,120,90,0.7);font-size:12px;margin:4px 0 0;">Dossier notaire · Document confidentiel</p>
  </td></tr>

  <tr><td style="background:#FDFCF8;padding:40px;">
    <p style="color:#888;font-size:13px;margin:0 0 8px;">Bonjour${notaireName ? ' ' + notaireName : ''},</p>
    <h2 style="color:#1A1A16;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Votre client ${sellerName} vous transmet son dossier de vente</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">Ce dossier contient l'ensemble des documents et informations nécessaires à la rédaction des actes : diagnostics techniques, titre de propriété, informations sur le bien et les éventuelles offres reçues.</p>

    <div style="background:#f5f0e8;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="font-size:12px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Bien concerné</p>
      <p style="margin:4px 0;font-size:15px;color:#1A1A16;"><strong>${property.address || '—'}</strong></p>
      <p style="margin:4px 0;font-size:14px;color:#555;">${property.city || ''} ${property.postal_code || ''}</p>
      ${property.price ? `<p style="margin:8px 0 0;font-size:15px;color:#C4785A;font-weight:bold;">Prix de vente : ${Number(property.price).toLocaleString('fr-FR')} €</p>` : ''}
    </div>

    <div style="text-align:center;margin:0 0 32px;">
      <a href="${dossierUrl}" style="background:#1A1A16;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">⚖️ Accéder au dossier complet →</a>
      <p style="font-size:12px;color:#aaa;margin:10px 0 0;">${dossierUrl}</p>
    </div>

    <div style="background:#fef3cd;border:1px solid #ffc107;border-radius:8px;padding:14px 18px;">
      <p style="font-size:13px;color:#856404;margin:0;">🔒 <strong>Document confidentiel</strong> — Ce lien est réservé à votre usage exclusif en tant que notaire en charge de la transaction. Ne pas diffuser.</p>
    </div>
  </td></tr>

  <tr><td style="background:#3D5A47;padding:22px 40px;text-align:center;">
    <p style="color:#D4E4D8;font-size:13px;margin:0 0 4px;">Serenis · Plateforme de vente immobilière entre particuliers</p>
    <p style="color:#5C7A65;font-size:12px;margin:0;">contact@serenis.fr</p>
  </td></tr>

</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] sendDossierToNotaire:', notaireEmail); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendDossierToNotaire:', e.message); return false; }
}

// ── Prévisualisation email (capture HTML sans envoyer) ─────────
async function previewEmail(type) {
  const DEMO = {
    email: 'marie.lambert@exemple.fr',
    firstName: 'Marie',
    lastName: 'Lambert',
    property: { type: 'Maison', city: 'Toulouse', address: '45 Boulevard des Pins', price: 385000, slug: 'maison-toulouse' },
  };

  let capturedHtml = null;
  // Forcer le passage du check SENDGRID_API_KEY dans chaque fonction
  const savedKey = process.env.SENDGRID_API_KEY;
  if (!savedKey) process.env.SENDGRID_API_KEY = 'SG.preview_only_not_a_real_key';
  const originalSend = sgMail.send.bind(sgMail);
  sgMail.send = async (msg) => { capturedHtml = Array.isArray(msg) ? msg[0].html : msg.html; return [{ statusCode: 202 }]; };

  try {
    switch (type) {
      case 'welcome':          await sendWelcomeEmail(DEMO.email, 'MotDePasse123', 'serenite'); break;
      case 'welcome_v2':       await sendWelcomeImproved({ to: DEMO.email, firstName: DEMO.firstName, pack: 'serenite', tempPassword: 'MotDePasse123' }); break;
      case 'no_property':      await sendNoPropertyNudge({ email: DEMO.email }); break;
      case 'no_photos':        await sendNoPhotosNudge({ email: DEMO.email }); break;
      case 'photographer_request': await sendPhotographerAvailabilityRequest({ email: DEMO.email, firstName: DEMO.firstName }); break;
      case 'missing_doc':      await sendMissingDocNudge({ email: DEMO.email, firstName: DEMO.firstName, missingDocs: ['Amiante', 'Électricité', 'ERP'] }); break;
      case 'not_published':    await sendNotPublishedNudge({ email: DEMO.email, firstName: DEMO.firstName }); break;
      case 'post_first_visit': await sendPostFirstVisitFeedbackSeller({ email: DEMO.email, firstName: DEMO.firstName }); break;
      case 'check_in_no_offer': await sendCheckInNoOffer({ email: DEMO.email, firstName: DEMO.firstName, daysPublished: 14 }); break;
      case 'contract_renewal': await sendContractRenewal({ email: DEMO.email, firstName: DEMO.firstName, daysLeft: 30 }); break;
      case 'review_request':   await sendReviewRequest({ email: DEMO.email, firstName: DEMO.firstName, propertyCity: 'Toulouse' }); break;
      case 'visit_confirmation': await sendVisitConfirmation(DEMO.email, DEMO.firstName, DEMO.property, '2026-06-07', '10:30', false); break;
      case 'visit_reminder_seller': await sendVisitReminderSeller({ sellerEmail: DEMO.email, buyerName: 'Jean Dupont', visitDate: '2026-06-07' }); break;
      case 'new_visit_request': await sendNewVisitRequest({ sellerEmail: DEMO.email, buyerName: 'Jean Dupont', visitDate: '2026-06-07 à 10:30' }); break;
      case 'contact_notification': await sendBuyerContactedSeller({ email: DEMO.email, firstName: DEMO.firstName, buyerName: 'Jean Dupont', buyerPhone: '06 12 34 56 78', propertyAddress: '45 Bd des Pins, Toulouse' }); break;
      case 'offer_notification': await sendOfferNotification({ sellerEmail: DEMO.email, sellerFirstName: DEMO.firstName, buyerName: 'Jean Dupont', buyerEmail: 'jean.dupont@gmail.com', buyerPhone: '06 12 34 56 78', amount: 375000, conditions: 'Financement confirmé', propertyCity: 'Toulouse', propertyType: 'Maison' }); break;
      case 'prospect_nudge':   await sendProspectNudge({ name: DEMO.firstName, email: DEMO.email }); break;
      case 'info_needed':      await sendInfoNeededEmail({ email: DEMO.email, firstName: DEMO.firstName, missingFields: ['Superficie terrain', 'Type de chauffage', 'Année de construction'] }); break;
      case 'buyer_contacted':  await sendBuyerContactedSeller({ email: DEMO.email, firstName: DEMO.firstName, buyerName: 'Jean Dupont', buyerPhone: '06 12 34 56 78', propertyAddress: '45 Bd des Pins, Toulouse' }); break;
      case 'visit_feedback_buyer': await sendVisitFeedbackRequest({ email: DEMO.email, firstName: DEMO.firstName, visitDate: '7 juin 2026', buyerName: 'Jean Dupont' }); break;
      case 'sold_congrats':    await sendSoldCongrats({ email: DEMO.email, firstName: DEMO.firstName, address: '45 Bd des Pins, Toulouse', price: 375000 }); break;
      case 'mission_assigned': await sendMissionAssigned({ email: 'photographe@exemple.fr', firstName: 'Lucas' }, { address: '45 Bd des Pins', city: 'Toulouse', scheduled_date: '2026-06-07', scheduled_time: '09:00', client_name: 'Marie Lambert', client_phone: '06 95 44 36 54' }); break;
      default: capturedHtml = `<p style="font-family:Arial;padding:32px;color:#888;">Prévisualisation non disponible pour ce type d'email (${type}).</p>`; break;
    }
  } finally {
    sgMail.send = originalSend;
    process.env.SENDGRID_API_KEY = savedKey;
  }

  return capturedHtml || `<p style="font-family:Arial;padding:32px;color:#888;">Aucun contenu généré pour "${type}".</p>`;
}

async function sendPropertySoldToBuyer({ buyerEmail, buyerName, propertyType, propertyCity }) {
  const name = buyerName || 'Bonjour';
  const msg = {
    to: buyerEmail, from: FROM,
    subject: `Le bien que vous avez visité est vendu — ${propertyType || 'Bien'} ${propertyCity || ''}`,
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFCF8;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#3D5A47;padding:28px 40px;text-align:center;">
    <h1 style="color:#FDFCF8;font-family:Georgia,serif;font-size:24px;margin:0;">Serenis</h1>
  </td></tr>
  <tr><td style="padding:36px 40px;">
    <h2 style="color:#2a4030;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Bonjour ${name},</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 16px;">Le <strong>${propertyType || 'bien'} à ${propertyCity || ''}</strong> que vous avez visité via Serenis vient d'être vendu.</p>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">Si vous êtes toujours à la recherche d'un bien, n'hésitez pas à consulter d'autres annonces de particuliers sur Serenis.</p>
    <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">Serenis · Plateforme de vente entre particuliers · contact@serenis.fr</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] PropertySoldToBuyer:', buyerEmail); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendPropertySoldToBuyer:', e.message); return false; }
}

async function sendPasswordResetEmail({ email, resetUrl }) {
  const msg = {
    to: email, from: FROM,
    subject: 'Réinitialisation de votre mot de passe — Serenis',
    html: `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#FDFCF8;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);">
  <div style="background:#1A1A16;padding:28px 36px;">
    <span style="font-family:Georgia,serif;font-size:1.4rem;color:#FDFCF8;">Sere<span style="color:#C4785A;">nis</span></span>
  </div>
  <div style="padding:36px;">
    <h2 style="font-family:Georgia,serif;font-size:1.4rem;color:#1A1A16;margin:0 0 16px;">Réinitialisation de mot de passe</h2>
    <p style="font-size:.92rem;color:#444;line-height:1.7;margin:0 0 24px;">
      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#C4785A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:.95rem;">
      Choisir un nouveau mot de passe
    </a>
    <p style="font-size:.8rem;color:#999;margin:24px 0 0;line-height:1.6;">
      Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>
  </div>
  <div style="background:#f5f0e8;padding:16px 36px;text-align:center;">
    <p style="font-size:.75rem;color:#aaa;margin:0;">Serenis · contact@serenis.fr · 06 95 44 36 54</p>
  </div>
</div>
</body></html>`,
  };
  try {
    if (!process.env.SENDGRID_API_KEY) { console.log('[EMAIL SKIPPED] PasswordReset:', email); return true; }
    await sgMail.send(msg);
    return true;
  } catch(e) { console.error('[EMAIL ERROR] sendPasswordResetEmail:', e.message); return false; }
}

module.exports = { sendWelcomeEmail, sendDossierEmail, sendVisitConfirmation, sendContactNotification, sendMissionAssigned, sendMissionConfirmed, sendMissionReminderJ1, sendProspectNudge, sendNoPropertyNudge, sendNoPhotosNudge, sendNotPublishedNudge, sendNewVisitRequest, sendVisitReminderSeller, sendMissingDocNudge, sendPublishedConfirmation, sendContractRenewal, sendReviewRequest, sendAdminDirectEmail, sendInvoiceEmail, sendOfferNotification, sendPostVisitBuyerNudge, sendWeeklyAdminReport, sendPhotographerAvailabilityRequest, sendPostFirstVisitFeedbackSeller, sendCheckInNoOffer, sendInfoNeededEmail, sendBuyerContactedSeller, sendVisitFeedbackRequest, sendSoldCongrats, sendPropertySoldToBuyer, sendWelcomeImproved, sendDossierToNotaire, previewEmail, sendPasswordResetEmail };
