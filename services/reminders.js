const db = require('../database');
const { sendVisitConfirmation } = require('./email');
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

module.exports = { sendVisitReminders };
