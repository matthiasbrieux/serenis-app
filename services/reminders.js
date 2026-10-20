const { deliverOnce } = require('./delivery');
const { parisDay } = require('./validation');
const db = require('../database');
const { sendVisitConfirmation, sendMissionReminderJ1, sendPostFirstVisitFeedbackSeller, sendCheckInNoOffer, sendFirstVisitReminderSeller, sendCompromisMilestoneEmail } = require('./email');

async function sendVisitReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = parisDay(tomorrow);

  const visits = db.prepare(`
    SELECT v.*, p.address, p.city, p.type, p.slug, s.phone as seller_phone, s.first_name as seller_name
    FROM visits v
    JOIN properties p ON p.id = v.property_id
    JOIN sellers s ON s.id = v.seller_id
    WHERE v.status = 'confirmed' AND v.visit_date = ? AND v.reminder_sent = 0
  `).all(tomorrowStr);

  for (const visit of visits) {
    try {
      const property = { type: visit.type, address: visit.address, city: visit.city, slug: visit.slug };

      // Notification in-app — créée une seule fois (idempotent par visit_id)
      const notifExists = db.prepare(
        "SELECT id FROM notifications WHERE seller_id=? AND type='visit_reminder' AND visit_id=?"
      ).get(visit.seller_id, visit.id);
      if (!notifExists) {
        db.prepare("INSERT INTO notifications (seller_id, type, title, body, visit_id) VALUES (?,?,?,?,?)")
          .run(visit.seller_id, 'visit_reminder', '📅 Rappel visite demain', `${visit.buyer_name} — ${visit.visit_date} à ${visit.visit_time}`, visit.id);
      }

      // Email — reminder_sent posé APRÈS livraison confirmée (A2)
      const delivered = await deliverOnce(`visit-reminder:${visit.id}:${visit.visit_date}:${visit.visit_time}`, () => sendVisitConfirmation(
        visit.buyer_email, visit.buyer_name, property,
        visit.visit_date, visit.visit_time, true
      ));
      if (delivered) {
        db.prepare('UPDATE visits SET reminder_sent = 1 WHERE id = ?').run(visit.id);
        console.log(`Reminder sent for visit ${visit.id}`);
      }
    } catch (e) {
      console.error(`Reminder error for visit ${visit.id}:`, e.message);
    }
  }
}

async function sendMissionReminders() {
  const { sendMissionReminderJ1Photographer } = require('./email');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = parisDay(tomorrow);

  const missions = db.prepare(`
    SELECT m.*, p.first_name as phot_first, p.last_name as phot_last, p.email as phot_email, p.phone as phot_phone
    FROM missions m
    JOIN photographers p ON p.id = m.photographer_id
    WHERE m.scheduled_date = ? AND m.status = 'confirmed'
  `).all(tomorrowStr);

  for (const m of missions) {
    try {
      const photographer = { first_name: m.phot_first, last_name: m.phot_last, email: m.phot_email };
      const delivered=await deliverOnce(`mission-reminder:${m.uuid}:${m.scheduled_date}`,()=>sendMissionReminderJ1(m.client_email,m.client_name,m,photographer));
      if(!delivered)continue;
      console.log(`Mission reminder J-1 sent for mission ${m.uuid}`);
    } catch(e) {
      console.error(`Mission reminder error for ${m.uuid}:`, e.message);
    }

    if (m.phot_email) {
      try {
        await deliverOnce(
          `mission-reminder-phot:${m.uuid}:${m.scheduled_date}`,
          () => sendMissionReminderJ1Photographer({
            photographerEmail: m.phot_email,
            photographerFirstName: m.phot_first,
            mission: m,
            clientName: m.client_name,
            clientPhone: m.client_phone,
          })
        );
      } catch(e) {
        console.error(`Mission reminder photographer error for ${m.uuid}:`, e.message);
      }
    }
  }
}

async function sendAutomatedNudges() {
  const { sendProspectNudge, sendNoPropertyNudge, sendNoPhotosNudge, sendNotPublishedNudge, sendMissingDocNudge } = require('./email');

  // Helper: check if email was sent for trigger within N hours
  function alreadySent(email, triggerType, withinHours) {
    const row = db.prepare(
      "SELECT id FROM email_log WHERE recipient_email=? AND trigger_type=? AND sent_at > datetime('now', ?)"
    ).get(email, triggerType, `-${withinHours} hours`);
    return !!row;
  }
  function deliveryKey(email, triggerType) {
    const last=db.prepare('SELECT MAX(sent_at) AS at FROM email_log WHERE recipient_email=? AND trigger_type=?').get(email,triggerType);
    return `nudge:${triggerType}:${email}:${last.at||'initial'}`;
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
      const ok = await deliverOnce(deliveryKey(p.email, 'prospect_nudge'),()=>sendProspectNudge({ name: p.name, email: p.email }));
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
      const ok = await deliverOnce(deliveryKey(s.email, 'no_property_nudge'),()=>sendNoPropertyNudge({ email: s.email }));
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
      const ok = await deliverOnce(deliveryKey(s.email, 'no_photos_nudge'),()=>sendNoPhotosNudge({ email: s.email }));
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
      const ok = await deliverOnce(deliveryKey(s.email, 'not_published_nudge'),()=>sendNotPublishedNudge({ email: s.email, score }));
      if (ok) { logEmail(s.email, 'not_published_nudge'); console.log('[NUDGE] not_published_nudge sent:', s.email); }
    }
  } catch (e) { console.error('[NUDGE] Trigger 4 error:', e.message); }

  // Trigger 7 (weekly missing docs): sellers with property where taxe_fonciere or dpe_class is null, not sent in 7 days
  try {
    const sellers = db.prepare(`
      SELECT s.email, s.first_name, p.taxe_fonciere, p.dpe_class
      FROM sellers s
      JOIN properties p ON p.seller_id = s.id
      WHERE (p.taxe_fonciere IS NULL OR p.dpe_class IS NULL)
    `).all();
    for (const s of sellers) {
      if (alreadySent(s.email, 'missing_doc_nudge', 168)) continue;
      const missingDocs = [];
      if (!s.dpe_class) missingDocs.push('Diagnostics techniques complets — un doute sur lesquels réaliser ? Votre espace formation vous guide');
      if (!s.taxe_fonciere) missingDocs.push('Montant de la taxe foncière annuelle');
      const ok = await deliverOnce(deliveryKey(s.email, 'missing_doc_nudge'),()=>sendMissingDocNudge({ email: s.email, firstName: s.first_name, missingDocs }));
      if (ok) { logEmail(s.email, 'missing_doc_nudge'); console.log('[NUDGE] missing_doc_nudge sent:', s.email); }
    }
  } catch (e) { console.error('[NUDGE] Trigger 7 error:', e.message); }
}

// ── Relances contrats J-14 ────────────────────────────────────
async function sendContractExpiryReminders() {
  const { sendContractRenewal } = require('./email');

  // Sellers whose contract expires in 13-15 days (window to avoid duplicates)
  const sellers = db.prepare(`
    SELECT s.id, s.email, s.first_name, s.twilio_number, s.contrat_signe_at, s.relance_extension_at
    FROM sellers s
    WHERE s.contrat_signe_at IS NOT NULL
      AND s.vente_realisee = 0
      AND date(s.contrat_signe_at, '+6 months') BETWEEN date('now', '+13 days') AND date('now', '+15 days')
      AND (s.relance_extension_at IS NULL OR s.relance_extension_at < date('now', '-30 days'))
  `).all();

  for (const s of sellers) {
    try {
      const expiryDate = new Date(s.contrat_signe_at);
      expiryDate.setMonth(expiryDate.getMonth() + 6);
      const daysLeft = Math.round((expiryDate - new Date()) / (1000 * 3600 * 24));
      const ok = await deliverOnce(`contract-expiry:${s.id}:${s.contrat_signe_at}`,()=>sendContractRenewal({ email: s.email, firstName: s.first_name, twilioNumber: s.twilio_number, expiryDate: expiryDate.toISOString(), daysLeft }));
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
    SELECT v.visit_date, v.buyer_email, v.buyer_name, p.slug, p.city, p.type, p.price, p.acheteur_token
    FROM visits v
    JOIN properties p ON p.id = v.property_id
    WHERE v.visit_date <= date('now', '-7 days')
      AND v.visit_date >= date('now', '-8 days')
      AND v.status IN ('confirmed','done')
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
      const ok = await deliverOnce(`post-visit:${v.slug}:${v.buyer_email}:${v.visit_date}`,()=>sendPostVisitBuyerNudge({ buyerEmail: v.buyer_email, buyerName: v.buyer_name, propertyCity: v.city, propertyType: v.type, propertySlug: v.slug, price: v.price, acheteurToken: v.acheteur_token }));
      if (ok) {
        db.prepare('INSERT INTO email_log (recipient_email, trigger_type) VALUES (?,?)').run(v.buyer_email, `post_visit_${v.slug}`);
        console.log(`[NUDGE] post_visit sent → ${v.buyer_email} (${v.slug})`);
      }
    } catch(e) { console.error('[NUDGE] post_visit error:', e.message); }
  }
}

async function sendPostFirstVisitFeedbackNudges() {
  // Sellers whose first visit was between 2 and 4 days ago (A8: fenêtre élargie)
  const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const fourDaysAgo = new Date(); fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  const twoDaysAgoStr  = parisDay(twoDaysAgo);
  const fourDaysAgoStr = parisDay(fourDaysAgo);

  const sellers = db.prepare(`
    SELECT s.email, s.first_name, s.id
    FROM sellers s
    JOIN visits v ON v.seller_id = s.id
    WHERE v.status IN ('confirmed','done')
      AND (s.archived IS NULL OR s.archived = 0)
      AND COALESCE(s.vente_realisee,0)=0
      AND NOT EXISTS (SELECT 1 FROM properties sold WHERE sold.seller_id=s.id AND sold.status='vendu')
    GROUP BY s.id
    HAVING MIN(v.visit_date) BETWEEN ? AND ?
    LIMIT 20
  `).all(fourDaysAgoStr, twoDaysAgoStr);
  for (const s of sellers) {
    const key = `post_first_visit_seller:${s.id}`;
    const already = db.prepare(`SELECT id FROM email_log WHERE trigger_type=? AND recipient_email=?`).get(key, s.email);
    if (already) continue;
    try {
      const delivered=await deliverOnce(key,()=>sendPostFirstVisitFeedbackSeller({ email: s.email, firstName: s.first_name }));
      if(!delivered)continue;
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
      AND COALESCE(s.vente_realisee,0)=0
      AND NOT EXISTS (SELECT 1 FROM properties sold WHERE sold.seller_id=s.id AND sold.status='vendu')
      AND o.id IS NULL
      AND p.published_at <= date('now', '-14 days')
    LIMIT 20
  `).all();
  for (const s of sellers) {
    const key = `check_in_no_offer:${s.id}`;
    const already = db.prepare(`SELECT id FROM email_log WHERE trigger_type=? AND recipient_email=?`).get(key, s.email);
    if (already) continue;
    try {
      const delivered=await deliverOnce(key,()=>sendCheckInNoOffer({ email: s.email, firstName: s.first_name, daysPublished: s.days_published }));
      if(!delivered)continue;
      db.prepare(`INSERT INTO email_log (trigger_type, recipient_email) VALUES (?,?)`).run(key, s.email);
    } catch(e) { console.error('[NUDGE] check_in_no_offer error:', e.message); }
  }
}

// ── Nudge baisse de prix J+30 sans offre ─────────────────────
async function sendPriceDropNudges() {
  const { sendPriceDropNudge } = require('./email');

  const sellers = db.prepare(`
    SELECT s.email, s.first_name, s.id,
           p.published_at, p.price, p.city,
           CAST((julianday('now') - julianday(p.published_at)) AS INTEGER) as days_published
    FROM sellers s
    JOIN properties p ON p.seller_id = s.id
    LEFT JOIN offers o ON o.seller_id = s.id
    WHERE p.published_at IS NOT NULL
      AND p.published = 1
      AND (s.archived IS NULL OR s.archived = 0)
      AND COALESCE(s.vente_realisee,0)=0
      AND NOT EXISTS (SELECT 1 FROM properties sold WHERE sold.seller_id=s.id AND sold.status='vendu')
      AND o.id IS NULL
      AND p.published_at <= date('now', '-30 days')
    LIMIT 20
  `).all();

  for (const s of sellers) {
    const key = `price_drop_nudge:${s.id}`;
    const already = db.prepare(`SELECT id FROM email_log WHERE trigger_type=? AND recipient_email=?`).get(key, s.email);
    if (already) continue;
    // A9 : n'envoyer que si check_in_no_offer a déjà été envoyé depuis au moins 7 jours
    const checkInEntry = db.prepare(
      `SELECT sent_at FROM email_log WHERE trigger_type=? AND recipient_email=?`
    ).get(`check_in_no_offer:${s.id}`, s.email);
    if (!checkInEntry) continue;
    const checkInAge = Date.now() - new Date(checkInEntry.sent_at).getTime();
    if (checkInAge < 7 * 24 * 3600 * 1000) continue;
    try {
      const ok = await deliverOnce(key,()=>sendPriceDropNudge({ email: s.email, firstName: s.first_name, daysPublished: s.days_published, currentPrice: s.price, propertyCity: s.city }));
      if (ok) {
        db.prepare(`INSERT INTO email_log (trigger_type, recipient_email) VALUES (?,?)`).run(key, s.email);
        console.log(`[NUDGE] price_drop_nudge → ${s.email} (J+${s.days_published})`);
      }
    } catch(e) { console.error('[NUDGE] price_drop_nudge error:', e.message); }
  }
}

// ── Rappel vendeur avant première visite ─────────────────────
async function sendFirstVisitReminderNudges() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = parisDay(tomorrow);

  // Sellers whose very first confirmed visit is tomorrow
  const sellers = db.prepare(`
    SELECT s.id, s.email, s.first_name
    FROM sellers s
    WHERE s.paid_at IS NOT NULL
      AND (s.archived IS NULL OR s.archived = 0)
      AND COALESCE(s.vente_realisee, 0) = 0
      AND NOT EXISTS (SELECT 1 FROM properties sold WHERE sold.seller_id = s.id AND sold.status = 'vendu')
      AND EXISTS (
        SELECT 1 FROM visits v
        WHERE v.seller_id = s.id
          AND v.status = 'confirmed'
          AND v.visit_date = ?
      )
      AND NOT EXISTS (
        SELECT 1 FROM visits v2
        WHERE v2.seller_id = s.id
          AND v2.status IN ('confirmed', 'done')
          AND v2.visit_date < ?
      )
    LIMIT 20
  `).all(tomorrowStr, tomorrowStr);

  for (const s of sellers) {
    const key = `first_visit_reminder:${s.id}`;
    const already = db.prepare(`SELECT id FROM email_log WHERE trigger_type=? AND recipient_email=?`).get(key, s.email);
    if (already) continue;
    try {
      const delivered = await deliverOnce(key, () => sendFirstVisitReminderSeller({ email: s.email, firstName: s.first_name }));
      if (!delivered) continue;
      db.prepare(`INSERT INTO email_log (trigger_type, recipient_email) VALUES (?,?)`).run(key, s.email);
      console.log(`[NUDGE] first_visit_reminder → ${s.email}`);
    } catch(e) { console.error('[NUDGE] first_visit_reminder error:', e.message); }
  }
}

async function sendCompromisMilestoneReminders() {
  const milestones = [
    { col: 'compromis_retraction_date', label: 'Fin de rétractation', icon: '📋' },
    { col: 'compromis_conditions_date', label: 'Levée des conditions suspensives', icon: '📋' },
    { col: 'compromis_acte_date', label: "Signature de l'acte authentique", icon: '🏠' },
  ];
  const alertDays = [7, 3, 1];

  for (const { col, label, icon } of milestones) {
    for (const days of alertDays) {
      const target = new Date();
      target.setDate(target.getDate() + days);
      const targetStr = parisDay(target);

      // Joins sellers to stop reminders when sale is closed (vente_realisee=1)
      // status='compromis' already stops reminders when property moves to 'vendu'
      const props = db.prepare(`
        SELECT p.id, p.seller_id, p.${col} AS due_date,
               s.email AS seller_email, s.first_name AS seller_first_name
        FROM properties p
        JOIN sellers s ON s.id = p.seller_id
        WHERE p.${col} = ? AND p.compromis_dates_explicit = 1 AND p.status = 'compromis'
          AND (s.vente_realisee IS NULL OR s.vente_realisee = 0)
      `).all(targetStr);

      for (const prop of props) {
        // Notification — independent key: retried without affecting email key
        try {
          await deliverOnce(`compromis-milestone:${prop.seller_id}:${col}:${prop.due_date}:J-${days}`, () => {
            db.prepare("INSERT INTO notifications (seller_id, type, title, body) VALUES (?,?,?,?)")
              .run(prop.seller_id, 'compromis_reminder',
                `${icon} Échéance dans ${days} jour${days > 1 ? 's' : ''}`,
                `${label} — ${prop.due_date}`
              );
            return true;
          });
        } catch (e) {
          console.error(`[COMPROMIS] Notification error (${col} J-${days}):`, e.message);
        }

        // Email — independent key: if send fails, retried next cron run without recreating notification
        if (prop.seller_email) {
          try {
            await deliverOnce(`compromis-milestone-email:${prop.seller_id}:${col}:${prop.due_date}:J-${days}`, () =>
              sendCompromisMilestoneEmail({
                email: prop.seller_email,
                firstName: prop.seller_first_name,
                label,
                dueDate: prop.due_date,
                daysLeft: days,
              })
            );
          } catch (e) {
            console.error(`[COMPROMIS] Email error (${col} J-${days}):`, e.message);
          }
        }
      }
    }
  }
}

// ── Demande d'avis post-vente (A6) ───────────────────────────
// Déclenché automatiquement J+3 après vente_date, si avis_demande_at IS NULL.
// Compatible avec l'envoi manuel admin (qui pose aussi avis_demande_at).
async function sendReviewRequestNudges() {
  const { sendReviewRequest } = require('./email');

  const sellers = db.prepare(`
    SELECT s.id, s.email, s.first_name,
           p.city AS property_city
    FROM sellers s
    LEFT JOIN properties p ON p.seller_id = s.id
    WHERE s.vente_realisee = 1
      AND s.avis_demande_at IS NULL
      AND s.vente_date IS NOT NULL
      AND s.vente_date <= date('now', '-3 days')
      AND (s.archived IS NULL OR s.archived = 0)
    LIMIT 10
  `).all();

  for (const s of sellers) {
    const key = `review_request:${s.id}`;
    try {
      const ok = await deliverOnce(key, () =>
        sendReviewRequest({ email: s.email, firstName: s.first_name, propertyCity: s.property_city })
      );
      if (ok) {
        db.prepare('UPDATE sellers SET avis_demande_at=CURRENT_TIMESTAMP WHERE id=?').run(s.id);
        console.log(`[NUDGE] review_request → ${s.email}`);
      }
    } catch(e) { console.error('[NUDGE] review_request error:', e.message); }
  }
}

module.exports = { sendVisitReminders, sendMissionReminders, sendAutomatedNudges, sendContractExpiryReminders, sendPostVisitBuyerNudges, sendPostFirstVisitFeedbackNudges, sendCheckInNoOfferNudges, sendPriceDropNudges, sendFirstVisitReminderNudges, sendCompromisMilestoneReminders, sendReviewRequestNudges };
