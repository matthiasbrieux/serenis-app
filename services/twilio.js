const db = require('../database');

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Assigne un numéro depuis le pool admin en priorité, sinon achète via Twilio
async function assignTwilioNumber(sellerId) {
  // 1. Cherche un numéro disponible dans le pool admin
  const poolNumber = db.prepare(
    "SELECT * FROM phone_numbers WHERE status='available' ORDER BY added_at ASC LIMIT 1"
  ).get();

  if (poolNumber) {
    db.prepare(
      "UPDATE phone_numbers SET status='assigned', seller_id=?, assigned_at=datetime('now') WHERE id=?"
    ).run(sellerId, poolNumber.id);
    db.prepare('UPDATE sellers SET twilio_number=? WHERE id=?')
      .run(poolNumber.number, sellerId);
    console.log(`[POOL] Numéro ${poolNumber.number} attribué au vendeur ${sellerId}`);
    return poolNumber.number;
  }

  // 2. Fallback : achat Twilio à la volée
  const client = getTwilioClient();
  if (!client) { console.log('[TWILIO SKIPPED] No credentials'); return null; }

  const numbers = await client.availablePhoneNumbers('FR').local.list({
    areaCode: '09', voiceEnabled: true, smsEnabled: true, limit: 1,
  });

  if (!numbers.length) {
    const all = await client.availablePhoneNumbers('FR').local.list({ limit: 1 });
    if (!all.length) throw new Error('No Twilio numbers available');
    numbers.push(all[0]);
  }

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: numbers[0].phoneNumber,
    voiceUrl: `${process.env.BASE_URL}/webhook/voice`,
    smsUrl: `${process.env.BASE_URL}/webhook/sms`,
    voiceMethod: 'POST',
    smsMethod: 'POST',
  });

  // Enregistre dans le pool et attribue
  db.prepare(
    "INSERT INTO phone_numbers (number, status, provider, seller_id, assigned_at) VALUES (?,?,?,?,datetime('now'))"
  ).run(purchased.phoneNumber, 'assigned', 'Twilio (auto)', sellerId);

  db.prepare('UPDATE sellers SET twilio_number=?, twilio_number_sid=? WHERE id=?')
    .run(purchased.phoneNumber, purchased.sid, sellerId);

  return purchased.phoneNumber;
}

async function sendSmsNotification(to, body) {
  const client = getTwilioClient();
  if (!client) { console.log('[SMS SKIPPED]', to, body); return; }
  const fromNumber = process.env.TWILIO_FROM_NUMBER || null;
  if (!fromNumber) { console.log('[SMS SKIPPED] No from number'); return; }
  await client.messages.create({ to, from: fromNumber, body });
}

module.exports = { assignTwilioNumber, sendSmsNotification };
