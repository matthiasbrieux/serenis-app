const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { sendWelcomeImproved, sendInvoiceEmail } = require('../services/email');
const crypto = require('crypto');

const checkoutLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 8,
  keyGenerator: (req) => (req.body?.email || req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Trop de tentatives. Réessayez dans une heure ou appelez le 06 95 44 36 54.' }),
});

// Checkout session creation
router.post('/create-checkout', express.json(), checkoutLimit, async (req, res) => {
  const { pack, email, plan, first_name, last_name, phone } = req.body;
  let { password } = req.body;
  if (!['serenite', 'autonome'].includes(pack)) return res.json({ error: 'Pack invalide' });
  if (!email) return res.json({ error: 'Email requis' });
  // Si aucun mot de passe fourni (certains formulaires ne l'incluent pas), on en génère un temporaire
  let needsPasswordReset = false;
  if (!password || password.length < 8) {
    if (!password) {
      password = crypto.randomBytes(12).toString('base64url');
      needsPasswordReset = true;
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
    amount = is4x ? 39000 : 154800; // 390€ × 4 ou 1548€
    productName = is4x ? 'Vendu Par Moi — 1er versement sur 4' : 'Vendu Par Moi — Paiement intégral';
    productDesc = is4x
      ? '1er versement sur 4 · 390€ × 4 = 1 560€ TTC · sans frais ni intérêts'
      : 'Fiche descriptive · Agenda intelligent · SMS automatiques · Formation complète · Coach IA';
  } else {
    amount = 154800; // 1548€
    productName = 'Vendu Par Moi';
    productDesc = 'Fiche descriptive · Agenda intelligent · SMS automatiques · Formation complète · Coach IA';
  }

  try {
    const hashed = await bcrypt.hash(password, 12);
    const uuid = uuidv4();
    const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      db.prepare('UPDATE sellers SET password=?, pack=?, first_name=COALESCE(NULLIF(?,\'\'), first_name), last_name=COALESCE(NULLIF(?,\'\'), last_name), phone=COALESCE(NULLIF(?,\'\'), phone) WHERE id=?').run(hashed, pack, first_name||'', last_name||'', phone||'', existing.id);
    } else {
      db.prepare('INSERT INTO sellers (uuid, email, password, pack, first_name, last_name, phone) VALUES (?,?,?,?,?,?,?)').run(uuid, email.toLowerCase(), hashed, pack, first_name||'', last_name||'', phone||'');
    }
    const seller = db.prepare('SELECT id FROM sellers WHERE email=?').get(email.toLowerCase());

    const sessionParams = {
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
      metadata: { pack, email, seller_id: String(seller.id), plan: plan || 'unique', installment: '1', total_installments: is4x ? '4' : '1', needs_password_reset: needsPasswordReset ? 'true' : 'false' },
      locale: 'fr',
    };
    // Pour le 4x : sauvegarder la carte pour les 3 versements suivants
    if (is4x) {
      sessionParams.payment_intent_data = { setup_future_usage: 'off_session' };
    }
    const session = await stripe.checkout.sessions.create(sessionParams);
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
      catch (e) {
        console.error('Webhook activate error:', e.message, '| session:', session.id, '| email:', session.customer_email || session.metadata?.email || '?');
      }
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
    const base = process.env.BASE_URL || 'https://venduparmoi.fr';

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
      friendlyName: `Vendu Par Moi — ${seller.email}`,
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
    // Activer le compte existant — AND paid_at IS NULL pour idempotence (P2-6)
    const result = db.prepare('UPDATE sellers SET paid_at=CURRENT_TIMESTAMP, stripe_session_id=?, stripe_customer_id=?, pack=? WHERE id=? AND paid_at IS NULL')
      .run(session.id, session.customer || null, pack || seller.pack, seller.id);
    if (result.changes === 0) return null; // déjà activé (double webhook / double appel)
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
      console.warn(`⚠️  Aucun numéro Twilio disponible pour ${seller.email} (id=${seller.id}). Ajoutez un numéro dans l'admin.`);
    }
  }

  // Gestion plan 4x — sauvegarder la carte + initialiser le suivi des mensualités
  const is4xPlan = session.metadata?.total_installments === '4';
  if (is4xPlan) {
    try {
      const customerId = session.customer || seller.stripe_customer_id;
      if (customerId) {
        const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
        const pmId = pms.data[0]?.id;
        if (pmId) {
          const _nd = new Date(Date.now() + 30 * 24 * 3600 * 1000);
          const nextDate = `${_nd.getFullYear()}-${String(_nd.getMonth()+1).padStart(2,'0')}-${String(_nd.getDate()).padStart(2,'0')}`;
          db.prepare('UPDATE sellers SET stripe_payment_method_id=?, installments_paid=1, installments_total=4, next_installment_date=? WHERE id=?')
            .run(pmId, nextDate, seller.id);
          console.log(`✓ Carte sauvegardée pour paiement 4x — seller ${seller.id}`);
        }
      }
    } catch(e) { console.error('4x setup error:', e.message); }
  }

  // Email de bienvenue — avec lien reset si mot de passe auto-généré
  try {
    const needsReset = session.metadata?.needs_password_reset === 'true';
    if (needsReset) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      db.prepare('INSERT INTO password_reset_tokens (seller_id, token, expires_at) VALUES (?,?,?)').run(seller.id, resetToken, expires);
      const base = process.env.BASE_URL || 'https://venduparmoi.fr';
      await sendWelcomeImproved({ to: seller.email, firstName: seller.first_name, pack: pack || 'serenite', resetUrl: `${base}/reset-password?token=${resetToken}` });
    } else {
      await sendWelcomeImproved({ to: seller.email, firstName: seller.first_name, pack: pack || 'serenite' });
    }
  } catch(e) { console.error('Welcome email error:', e.message); }

  // Facture automatique
  try {
    const amount = session.amount_total || (pack === 'serenite' ? 99900 : 49900);
    const invoiceNumber = `VPM-${new Date().getFullYear()}-${String(seller.id).padStart(5, '0')}-${Date.now().toString(36).toUpperCase()}`;
    await sendInvoiceEmail({ email: seller.email, firstName: seller.first_name, amount, pack: pack || 'serenite', invoiceNumber, date: new Date() });
  } catch(e) { console.error('Invoice email error:', e.message); }

  return db.prepare('SELECT * FROM sellers WHERE id=?').get(seller.id);
}

module.exports = { router, stripeWebhook, assignPhoneNumber };
