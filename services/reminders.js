const db = require('../database');
const { sendVisitConfirmation, sendMissionReminderJ1, sendPhotographerAvailabilityRequest, sendPostFirstVisitFeedbackSeller, sendCheckInNoOffer } = require('./email');
const { sendSmsNotification } = require('./twilio');

async function sendVisitReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const visits = db.prepare(`
    SELECT v.*, p.address, p.city, p.type, p.slug, s.phone as seller_phone, s.first_name as seller_name
    FROM visits v
    JOIN properties p ON p.id = v.property_id
    JOIN sellers s ON s.id = v.seller_id
    WHERE v.visit_date = ? AND v.status = 'confirmed' AND v.reminder_sent = 0
  `).all(tomorrowStr);

  for (const visit of visits) {
    try {
      const property = { type: visit.type, address: visit.address, city: visit.city, slug: visit.slug };

      await sendVisitConfirmation(
        visit.buyer_email, visit.buyer_name, property,
        visit.visit_date, visit.visit_time, false
      );

      if (visit.seller_phone) {
        await sendSmsNotification(
          visit.seller_phone,
          `Rappel visite demain ${visit.visit_date} à ${visit.visit_time}\nAcquéreur : ${visit.buyer_name} — ${visit.buyer_email}`
        );
      }

      db.prepare('UPDATE visits SET reminder_sent = 1 WHERE id = ?').run(visit.id);
      console.log(`Reminder sent for visit ${visit.id}`);
    } catch (e) {
      console.error(`Reminder error for visit ${visit.id}:`, e.message);
    }
  }
}

async function sendMissionReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const missions = db.prepare(`
    SELECT m.*, p.first_name as phot_first, p.last_name as phot_last, p.email as phot_email
    FROM missions m
    JOIN photographers p ON p.id = m.photographer_id
    WHERE m.scheduled_date = ? AND m.status = 'confirmed'
  `).all(tomorrowStr);

  for (const m of missions) {
    try {
      const photographer = { first_name: m.phot_first, last_name: m.phot_last, email: m.phot_email };
      await sendMissionReminderJ1(m.client_email, m.client_name, m, photographer);
      console.log(`Mission reminder J-1 sent for mission ${m.uuid}`);
    } catch(e) {
      console.error(`Mission reminder error for ${m.uuid}:`, e.message);
    }
  }
}

async function sendAutomatedNudges() {
  const { sendProspectNudge, sendNoPropertyNudge, sendNoPhotosNudge, sendNotPublishedNudge, sendMissingDocNudge } = require('./email');

  // Helper: check if email was sent for trigger within N hours
  function alreadySent(email, triggerType, withinHours) {
    const row = db.prepare(
      'SELECT id FROM email_log WHERE recipient_email=? AND trigger_type=? AND sent_at > datetime("now", ?)'
    ).get(email, triggerType, `-${withinHours} hours`);
    return !!row;
  }
  function logEmail(email, triggerType) {
    db.prepare('INSERT INTO email_log (recipient_email, trigger_type) VALUES (?,?)').run(email, triggerType);
  }

  // Trigger 1: contact_requests submitted >48h ago, no seller with same email, not already sent
  try {
    const prospects = db.prepare(`
      SELECT cr.name, cr.email
      FROM contact_requests cr
      WHERE cr.email IS NOT NULL
        AND cr.created_at < datetime('now', '-48 hours')
        AND NOT EXISTS (SELECT 1 FROM sellers s WHERE s.email = cr.email)
    `).all();
    for (const p of prospects) {
      if (!p.email) continue;
      if (alreadySent(p.email, 'prospect_nudge', 9999)) continue;
      const ok = await sendProspectNudge({ name: p.name, email: p.email });
      if (ok) { logEmail(p.email, 'prospect_nudge'); console.log('[NUDGE] prospect_nudge sent:', p.email); }
    }
  } catch (e) { console.error('[NUDGE] Trigger 1 error:', e.message); }

  // Trigger 2: paid sellers with no property, paid >24h ago, send once only
  try {
    const sellers = db.prepare(`
      SELECT s.email
      FROM sellers s
      WHERE s.paid_at IS NOT NULL
        AND s.paid_at < datetime('now', '-24 hours')
        AND NOT EXISTS (SELECT 1 FROM properties p WHERE p.seller_id = s.id)
    `).all();
    for (const s of sellers) {
      if (alreadySent(s.email, 'no_property_nudge', 9999)) continue;
      const ok = await sendNoPropertyNudge({ email: s.email });
      if (ok) { logEmail(s.email, 'no_property_nudge'); console.log('[NUDGE] no_property_nudge sent:', s.email); }
    }
  } catch (e) { console.error('[NUDGE] Trigger 2 error:', e.message); }

  // Trigger 3: sellers with property (price>0) but 0 photos, updated_at >48h ago, not sent in 7 days
  try {
    const sellers = db.prepare(`
      SELECT s.email, p.id as property_id
      FROM sellers s
      JOIN properties p ON p.seller_id = s.id
      WHERE p.price > 0
        AND p.updated_at < datetime('now', '-48 hours')
        AND NOT EXISTS (SELECT 1 FROM property_photos ph WHERE ph.property_id = p.id)
    `).all();
    for (const s of sellers) {
      if (alreadySent(s.email, 'no_photos_nudge', 168)) continue;
      const ok = await sendNoPhotosNudge({ email: s.email });
      if (ok) { logEmail(s.email, 'no_photos_nudge'); console.log('[NUDGE] no_photos_nudge sent:', s.email); }
    }
  } catch (e) { console.error('[NUDGE] Trigger 3 error:', e.message); }

  // Trigger 4: sellers with property (published=0, price>0, description and dpe_class filled), updated_at >72h, not sent in 7 days
  try {
    const sellers = db.prepare(`
      SELECT s.email, p.price, p.description, p.dpe_class
      FROM sellers s
      JOIN properties p ON p.seller_id = s.id
      WHERE p.published = 0
        AND p.price > 0
        AND p.description IS NOT NULL
        AND p.dpe_class IS NOT NULL
        AND p.updated_at < datetime('now', '-72 hours')
    `).all();
    for (const s of sellers) {
      if (alreadySent(s.email, 'not_published_nudge', 168)) continue;
      // Compute a rough score: photos, description, price, dpe
      const propRow = db.prepare(`
        SELECT p.*, (SELECT COUNT(*) FROM property_photos ph WHERE ph.property_id=p.id) as photo_count,
                    (SELECT COUNT(*) FROM property_documents pd WHERE pd.property_id=p.id) as doc_count
        FROM properties p
        JOIN sellers sel ON sel.id=p.seller_id
        WHERE sel.email=?
      `).get(s.email);
      let score = 0;
      if (propRow) {
        score += propRow.photo_count >= 10 ? 20 : propRow.photo_count >= 5 ? 15 : propRow.photo_count >= 1 ? 8 : 0;
        score += (propRow.description?.length || 0) >= 150 ? 20 : (propRow.description?.length || 0) >= 50 ? 10 : 0;
        score += propRow.price ? 15 : 0;
        score += propRow.doc_count >= 3 ? 15 : propRow.doc_count >= 1 ? 5 : 0;
        score += propRow.dpe_class ? 10 : 0;
      }
      if (score < 70) continue;
      const ok = await sendNotPublishedNudge({ email: s.email, score });
      if (ok) { logEmail(s.email, 'not_published_nudge'); console.log('[NUDGE] not_published_nudge sent:', s.email); }
    }
  } catch (e) { console.error('[NUDGE] Trigger 4 error:', e.message); }

  // Trigger 7 (weekly missing docs): sellers with property where taxe_fonciere or dpe_class is null, not sent in 7 days
  try {
    const sellers = db.prepare(`
      SELECT s.email, p.taxe_fonciere, p.dpe_class
      FROM sellers s
      JOIN properties p ON p.seller_id = s.id
      WHERE (p.taxe_fonciere IS NULL OR p.dpe_class IS NULL)
    `).all();
    for (const s of sellers) {
      if (alreadySent(s.email, 'missing_doc_nudge', 168)) continue;
      const missingDocs = [];
      if (!s.dpe_class) missingDocs.push('Diagnostic de Performance Energétique (DPE) — classe énergie');
      if (!s.taxe_fonciere) missingDocs.push('Montant de la taxe foncière annuelle');
      const ok = await sendMissingDocNudge({ email: s.email, missingDocs });
      if (ok) { logEmail(s.email, 'missing_doc_nudge'); console.log('[NUDGE] missing_doc_nudge sent:', s.email); }
    }
  } catch (e) { console.error('[NUDGE] Trigger 7 error:', e.message); }
}

// ── Relances contrats J-14 ────────────────────────────────────
async function sendContractExpiryReminders() {
  const { sendContractRenewal } = require('./email');

  // Sellers whose contract expires in 13-15 days (window to avoid duplicates)
  const sellers = db.prepare(`
    SELECT s.id, s.email, s.first_name, s.contrat_signe_at, s.relance_extension_at
    FROM sellers s
    WHERE s.contrat_signe_at IS NOT NULL
      AND s.vente_realisee = 0
      AND date(s.contrat_signe_at, '+12 months') BETWEEN date('now', '+13 days') AND date('now', '+15 days')
      AND (s.relance_extension_at IS NULL OR s.relance_extension_at < date('now', '-30 days'))
  `).all();

  for (const s of sellers) {
    try {
      const expiryDate = new Date(s.contrat_signe_at);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const daysLeft = Math.round((expiryDate - new Date()) / (1000 * 3600 * 24));
      const ok = await sendContractRenewal({ email: s.email, firstName: s.first_name, expiryDate: expiryDate.toISOString(), daysLeft });
      if (ok) {
        db.prepare('UPDATE sellers SET relance_extension_at=CURRENT_TIMESTAMP WHERE id=?').run(s.id);
        console.log(`[CONTRAT] Relance extension envoyée → ${s.email} (J-${daysLeft})`);
      }
    } catch(e) { console.error(`[CONTRAT] Relance error ${s.email}:`, e.message); }
  }
}

// ── Relance acheteurs post-visite J+7 ────────────────────────
async function sendPostVisitBuyerNudges() {
  const { sendPostVisitBuyerNudge } = require('./email');

  const visits = db.prepare(`
    SELECT v.buyer_email, v.buyer_name, p.slug, p.city, p.type, p.price
    FROM visits v
    JOIN properties p ON p.id = v.property_id
    WHERE v.visit_date <= date('now', '-7 days')
      AND v.visit_date >= date('now', '-8 days')
      AND v.status = 'confirmed'
      AND NOT EXISTS (
        SELECT 1 FROM offers o WHERE o.property_id = v.property_id AND o.buyer_email = v.buyer_email
      )
  `).all();

  for (const v of visits) {
    try {
      const alreadySent = db.prepare(
        "SELECT id FROM email_log WHERE recipient_email=? AND trigger_type=? AND sent_at > datetime('now', '-30 days')"
      ).get(v.buyer_email, `post_visit_${v.slug}`);
      if (alreadySent) continue;
      const ok = await sendPostVisitBuyerNudge({ buyerEmail: v.buyer_email, buyerName: v.buyer_name, propertyCity: v.city, propertyType: v.type, propertySlug: v.slug, price: v.price });
      if (ok) {
        db.prepare('INSERT INTO email_log (recipient_email, trigger_type) VALUES (?,?)').run(v.buyer_email, `post_visit_${v.slug}`);
        console.log(`[NUDGE] post_visit sent → ${v.buyer_email} (${v.slug})`);
      }
    } catch(e) { console.error('[NUDGE] post_visit error:', e.message); }
  }
}

async function sendWeeklyAdminReportEmail() {
  const { sendWeeklyAdminReport } = require('./email');
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'matthiasbrieux260598@gmail.com';

  try {
    const newClients = db.prepare(`SELECT COUNT(*) as c FROM sellers WHERE paid_at >= date('now', '-7 days')`).get()?.c || 0;
    const newOffers  = db.prepare(`SELECT COUNT(*) as c FROM offers WHERE created_at >= date('now', '-7 days')`).get()?.c || 0;
    const newVisits  = db.prepare(`SELECT COUNT(*) as c FROM visits WHERE created_at >= date('now', '-7 days')`).get()?.c || 0;
    const publishedProps = db.prepare(`SELECT COUNT(*) as c FROM properties WHERE published_at >= date('now', '-7 days')`).get()?.c || 0;
    const totalActive = db.prepare(`SELECT COUNT(*) as c FROM sellers WHERE paid_at IS NOT NULL AND (archived IS NULL OR archived=0)`).get()?.c || 0;
    const revenueRow = db.prepare(`SELECT SUM(CASE WHEN pack='serenite' THEN 990 ELSE 290 END) as t FROM sellers WHERE paid_at >= date('now', '-7 days')`).get();
    const totalRevenue = revenueRow?.t || 0;

    await sendWeeklyAdminReport({
      to: adminEmail,
      stats: { newClients, newOffers, newVisits, publishedProps, totalRevenue, totalActive },
    });
    console.log('[WEEKLY] Rapport hebdo envoyé à', adminEmail);
  } catch(e) { console.error('[WEEKLY] Erreur rapport hebdo:', e.message); }
}

async function sendPhotographerAvailabilityNudges() {
  // Sellers paid but no photos yet, sent 3+ days after payment
  const sellers = db.prepare(`
    SELECT s.email, s.first_name, s.id
    FROM sellers s
    LEFT JOIN properties p ON p.seller_id = s.id
    LEFT JOIN (SELECT seller_id, COUNT(*) as cnt FROM photos GROUP BY seller_id) ph ON ph.seller_id = s.id
    WHERE s.paid_at IS NOT NULL
      AND (s.archived IS NULL OR s.archived = 0)
      AND (ph.cnt IS NULL OR ph.cnt = 0)
      AND s.paid_at <= date('now', '-3 days')
    LIMIT 20
  `).all();
  for (const s of sellers) {
    const key = `photographer_request:${s.id}`;
    const already = db.prepare(`SELECT id FROM email_log WHERE trigger_type=? AND recipient_email=?`).get(key, s.email);
    if (already) continue;
    try {
      await sendPhotographerAvailabilityRequest({ email: s.email, firstName: s.first_name });
      db.prepare(`INSERT INTO email_log (trigger_type, recipient_email) VALUES (?,?)`).run(key, s.email);
    } catch(e) { console.error('[NUDGE] photographer_request error:', e.message); }
  }
}

async function sendPostFirstVisitFeedbackNudges() {
  // Sellers who had their first visit 2 days ago
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

  const sellers = db.prepare(`
    SELECT s.email, s.first_name, s.id
    FROM sellers s
    JOIN visits v ON v.seller_id = s.id
    WHERE v.visit_date = ? AND v.status = 'confirmed'
      AND (s.archived IS NULL OR s.archived = 0)
    GROUP BY s.id
    HAVING MIN(v.visit_date) = ?
    LIMIT 20
  `).all(twoDaysAgoStr, twoDaysAgoStr);
  for (const s of sellers) {
    const key = `post_first_visit_seller:${s.id}`;
    const already = db.prepare(`SELECT id FROM email_log WHERE trigger_type=? AND recipient_email=?`).get(key, s.email);
    if (already) continue;
    try {
      await sendPostFirstVisitFeedbackSeller({ email: s.email, firstName: s.first_name });
      db.prepare(`INSERT INTO email_log (trigger_type, recipient_email) VALUES (?,?)`).run(key, s.email);
    } catch(e) { console.error('[NUDGE] post_first_visit_seller error:', e.message); }
  }
}

async function sendCheckInNoOfferNudges() {
  // Sellers published 14+ days ago with no offer
  const sellers = db.prepare(`
    SELECT s.email, s.first_name, s.id, p.published_at,
           CAST((julianday('now') - julianday(p.published_at)) AS INTEGER) as days_published
    FROM sellers s
    JOIN properties p ON p.seller_id = s.id
    LEFT JOIN offers o ON o.seller_id = s.id
    WHERE p.published_at IS NOT NULL
      AND (s.archived IS NULL OR s.archived = 0)
      AND o.id IS NULL
      AND p.published_at <= date('now', '-14 days')
    LIMIT 20
  `).all();
  for (const s of sellers) {
    const key = `check_in_no_offer:${s.id}`;
    const already = db.prepare(`SELECT id FROM email_log WHERE trigger_type=? AND recipient_email=?`).get(key, s.email);
    if (already) continue;
    try {
      await sendCheckInNoOffer({ email: s.email, firstName: s.first_name, daysPublished: s.days_published });
      db.prepare(`INSERT INTO email_log (trigger_type, recipient_email) VALUES (?,?)`).run(key, s.email);
    } catch(e) { console.error('[NUDGE] check_in_no_offer error:', e.message); }
  }
}

module.exports = { sendVisitReminders, sendMissionReminders, sendAutomatedNudges, sendContractExpiryReminders, sendPostVisitBuyerNudges, sendWeeklyAdminReportEmail, sendPhotographerAvailabilityNudges, sendPostFirstVisitFeedbackNudges, sendCheckInNoOfferNudges };
