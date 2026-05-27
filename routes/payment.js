const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { sendWelcomeEmail } = require('../services/email');

// Checkout session creation
router.post('/create-checkout', async (req, res) => {
  const { pack, email, password, plan } = req.body;
  if (pack !== 'serenite') return res.json({ error: 'Pack invalide' });
  if (!email) return res.json({ error: 'Email requis' });
  if (!password || password.length < 8) return res.json({ error: 'Mot de passe trop court (8 caractères minimum).' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ error: 'Paiement non configuré. Contactez Matthias au 06 95 44 36 54.' });
  }

  const is4x = plan === '4x';
  const amount = is4x ? 24900 : 99900; // 249€ ou 999€ en centimes
  const productName = is4x
    ? 'Pack Sérénité — Serenis (1er paiement sur 4)'
    : 'Pack Sérénité — Serenis';
  const productDesc = is4x
    ? '1er versement sur 4 · 249€ × 4 = 996€ · sans frais ni intérêts'
    : 'Photographe pro · Visite virtuelle · Numéro Serenis · Dossiers automatisés';

  try {
    const hashed = await bcrypt.hash(password, 12);
    const uuid = uuidv4();
    const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      db.prepare('UPDATE sellers SET password=? WHERE id=?').run(hashed, existing.id);
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
      metadata: { pack, email, seller_id: String(seller.id), plan: plan || 'unique', installment: is4x ? '1' : '1', total_installments: is4x ? '4' : '1' },
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
    const token = jwt.sign({ id: seller.id, email: seller.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
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

  // Auto-assigner le premier numéro disponible
  const phone = db.prepare("SELECT id, number FROM phone_numbers WHERE status='available' ORDER BY added_at ASC LIMIT 1").get();
  if (phone && !seller.twilio_number) {
    db.prepare("UPDATE phone_numbers SET status='assigned', seller_id=?, assigned_at=datetime('now') WHERE id=?").run(seller.id, phone.id);
    db.prepare('UPDATE sellers SET twilio_number=? WHERE id=?').run(phone.number, seller.id);
  }

  // Email de bienvenue (sans mot de passe — ils le connaissent déjà)
  try { await sendWelcomeEmail(seller.email, null, pack || 'serenite'); } catch(e) {}

  return db.prepare('SELECT * FROM sellers WHERE id=?').get(seller.id);
}

module.exports = { router, stripeWebhook };
