const db = require('../database');

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function assignTwilioNumber(sellerId) {
  const client = getTwilioClient();
  if (!client) { console.log('[TWILIO SKIPPED] No credentials'); return null; }

  const numbers = await client.availablePhoneNumbers('FR').local.list({
    areaCode: '09',
    voiceEnabled: true,
    smsEnabled: true,
    limit: 1
  });

  if (!numbers.length) {
    const allNumbers = await client.availablePhoneNumbers('FR').local.list({ limit: 1 });
    if (!allNumbers.length) throw new Error('No Twilio numbers available');
    numbers.push(allNumbers[0]);
  }

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: numbers[0].phoneNumber,
    voiceUrl: `${process.env.BASE_URL}/webhook/voice`,
    smsUrl: `${process.env.BASE_URL}/webhook/sms`,
    voiceMethod: 'POST',
    smsMethod: 'POST',
  });

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
