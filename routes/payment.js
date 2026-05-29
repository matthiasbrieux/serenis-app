const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { sendWelcomeEmail, sendInvoiceEmail } = require('../services/email');

// Checkout session creation
router.post('/create-checkout', async (req, res) => {
  const { pack, email, plan } = req.body;
  let { password } = req.body;
  if (!['serenite', 'autonome'].includes(pack)) return res.json({ error: 'Pack invalide' });
  if (!email) return res.json({ error: 'Email requis' });
  // Si aucun mot de passe fourni (certains formulaires ne l'incluent pas), on en génère un temporaire
  if (!password || password.length < 8) {
    if (!password) {
      password = require('crypto').randomBytes(12).toString('base64url');
    } else {
      return res.json({ error: 'Mot de passe trop court (8 caractères minimum).' });
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ error: 'Paiement non configuré. Contactez Matthias au 06 95 44 36 54.' });
  }

  const isSerenite = pack === 'serenite';
  const is4x = plan === '4x' && isSerenite; // paiement 4x uniquement pour Sérénité

  let amount, productName, productDesc;
  if (isSerenite) {
    amount = is4x ? 24900 : 99900; // 249€ × 4 ou 999€
    productName = is4x ? 'Pack Sérénité — Serenis (1er paiement sur 4)' : 'Pack Sérénité — Serenis';
    productDesc = is4x
      ? '1er versement sur 4 · 249€ × 4 = 996€ · sans frais ni intérêts'
      : 'Photographe pro · Numéro dédié · Dossiers automatisés · Coach IA';
  } else {
    amount = 49900; // 499€
    productName = 'Pack Autonome — Serenis';
    productDesc = 'Numéro dédié · Dossiers automatisés · Agenda visites · Coach IA · Formation vidéo';
  }

  try {
    const hashed = await bcrypt.hash(password, 12);
    const uuid = uuidv4();
    const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      db.prepare('UPDATE sellers SET password=?, pack=? WHERE id=?').run(hashed, pack, existing.id);
    } else {
      db.prepare('INSERT INTO sellers (uuid, email, password, pack) VALUES (?,?,?,?)').run(uuid, email.toLowerCase(), hashed, pack);
    }
    const seller = db.prepare('SELECT id FROM sellers WHERE email=?').get(email.toLowerCase());

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: productName, description: productDesc },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      success_url: `${process.env.BASE_URL}/paiement-succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/#offres`,
      metadata: { pack, email, seller_id: String(seller.id), plan: plan || 'unique', installment: '1', total_installments: is4x ? '4' : '1' },
      locale: 'fr',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.json({ error: 'Erreur paiement. Réessayez ou contactez le 06 95 44 36 54.' });
  }
});

// Page succès paiement — auto-login + redirect /booking
router.get('/paiement-succes', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.redirect('/?error=session');

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') return res.redirect('/?error=payment');

    const seller = await activateSeller(session);
    if (!seller) return res.redirect('/dashboard');

    // Auto-login
    const token = jwt.sign({ id: seller.id, uuid: seller.uuid, email: seller.email, pack: seller.pack }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
    res.redirect('/booking');
  } catch (err) {
    console.error('Payment success error:', err.message);
    res.redirect('/login?welcome=1');
  }
});

// Stripe webhook handler
async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      try { await activateSeller(session); }
      catch (e) { console.error('Webhook activate error:', e.message); }
    }
  }
  res.json({ received: true });
}

// ── Attribution de numéro dédié ──────────────────────────────
async function assignPhoneNumber(seller) {
  // 1. Chercher dans la réserve locale
  const poolNum = db.prepare("SELECT id, number FROM phone_numbers WHERE status='available' ORDER BY added_at ASC LIMIT 1").get();
  if (poolNum) {
    db.prepare("UPDATE phone_numbers SET status='assigned', seller_id=?, assigned_at=datetime('now') WHERE id=?").run(seller.id, poolNum.id);
    db.prepare('UPDATE sellers SET twilio_number=? WHERE id=?').run(poolNum.number, seller.id);
    console.log(`✓ Numéro ${poolNum.number} attribué depuis la réserve → ${seller.email}`);
    return poolNum.number;
  }

  // 2. Provisionner via API Twilio si réserve vide
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const base = process.env.BASE_URL || 'https://venduparmo.fr';

    // Chercher un numéro disponible (France en priorité, sinon international)
    let availables = [];
    try { availables = await twilio.availablePhoneNumbers('FR').local.list({ limit: 1, voiceEnabled: true, smsEnabled: true }); } catch(e) {}
    if (!availables.length) {
      try { availables = await twilio.availablePhoneNumbers('FR').mobile.list({ limit: 1 }); } catch(e) {}
    }
    if (!availables.length) return null;

    // Acheter le numéro
    const purchased = await twilio.incomingPhoneNumbers.create({
      phoneNumber: availables[0].phoneNumber,
      voiceUrl: `${base}/webhook/voice`,
      voiceMethod: 'POST',
      smsUrl: `${base}/webhook/sms`,
      smsMethod: 'POST',
      friendlyName: `Serenis — ${seller.email}`,
    });

    const num = purchased.phoneNumber;
    const sid = purchased.sid;

    // Sauvegarder en réserve + assigner
    db.prepare("INSERT INTO phone_numbers (number, status, provider, notes, seller_id, assigned_at) VALUES (?,?,?,?,?,datetime('now'))")
      .run(num, 'assigned', 'twilio', `Provisionné auto pour ${seller.email}`, seller.id);
    db.prepare('UPDATE sellers SET twilio_number=?, twilio_number_sid=? WHERE id=?').run(num, sid, seller.id);

    console.log(`✓ Numéro Twilio ${num} provisionné et attribué → ${seller.email}`);
    return num;
  } catch(e) {
    console.error('Twilio provisioning error:', e.message);
    return null;
  }
}

async function activateSeller(session) {
  const { email, pack, seller_id } = session.metadata || {};

  // Chercher le compte par seller_id, email ou session_id
  let seller = seller_id ? db.prepare('SELECT * FROM sellers WHERE id=?').get(Number(seller_id)) : null;
  if (!seller && email) seller = db.prepare('SELECT * FROM sellers WHERE email=?').get(email.toLowerCase());

  if (seller && seller.paid_at) return null; // déjà activé

  if (seller) {
    // Activer le compte existant
    db.prepare('UPDATE sellers SET paid_at=CURRENT_TIMESTAMP, stripe_session_id=?, stripe_customer_id=?, pack=? WHERE id=?')
      .run(session.id, session.customer || null, pack || seller.pack, seller.id);
  } else {
    // Créer le compte (cas webhook sans pré-création)
    const uuid = uuidv4();
    const tempPwd = await bcrypt.hash(Math.random().toString(36).slice(2, 10), 12);
    db.prepare('INSERT OR IGNORE INTO sellers (uuid, email, password, pack, stripe_session_id, stripe_customer_id, paid_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)')
      .run(uuid, (email || '').toLowerCase(), tempPwd, pack || 'serenite', session.id, session.customer || null);
    seller = db.prepare('SELECT * FROM sellers WHERE email=?').get((email || '').toLowerCase());
  }

  if (!seller) return null;

  // Auto-assigner un numéro dédié
  if (!seller.twilio_number) {
    const assigned = await assignPhoneNumber(seller);
    if (!assigned) {
      // Notifier l'admin qu'un numéro doit être attribué manuellement
      try {
        db.prepare(`INSERT INTO notifications (seller_id, type, title, body) VALUES (0,'admin_alert','Numéro à attribuer',?)`)
          .run(`Aucun numéro disponible pour ${seller.email} (id=${seller.id}). Ajoutez un numéro dans l'admin.`);
      } catch(e) {}
      console.warn(`⚠️  Aucun numéro Twilio disponible pour ${seller.email}`);
    }
  }

  // Email de bienvenue
  try { await sendWelcomeEmail(seller.email, null, pack || 'serenite'); } catch(e) {}

  // Facture automatique
  try {
    const amount = session.amount_total || (pack === 'serenite' ? 99900 : 49900);
    const invoiceNumber = `SER-${new Date().getFullYear()}-${String(seller.id).padStart(5, '0')}`;
    await sendInvoiceEmail({ email: seller.email, firstName: seller.first_name, amount, pack: pack || 'serenite', invoiceNumber, date: new Date() });
  } catch(e) { console.error('Invoice email error:', e.message); }

  return db.prepare('SELECT * FROM sellers WHERE id=?').get(seller.id);
}

module.exports = { router, stripeWebhook, assignPhoneNumber };
