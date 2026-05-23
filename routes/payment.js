const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { sendWelcomeEmail } = require('../services/email');

// Checkout session creation
router.post('/create-checkout', async (req, res) => {
  const { pack, email } = req.body;
  if (!['autonome', 'serenite'].includes(pack)) return res.json({ error: 'Pack invalide' });
  if (!email) return res.json({ error: 'Email requis' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ error: 'Paiement non configuré. Contactez Matthias au 06 95 44 36 54.' });
  }

  const priceId = pack === 'autonome' ? process.env.STRIPE_PRICE_AUTONOME : process.env.STRIPE_PRICE_SERENITE;
  if (!priceId) return res.json({ error: 'Prix Stripe manquant. Contactez le support.' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      customer_email: email,
      success_url: `${process.env.BASE_URL}/paiement-succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/#offres`,
      metadata: { pack, email },
      locale: 'fr',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.json({ error: 'Erreur paiement. Réessayez ou contactez le 06 95 44 36 54.' });
  }
});

// Page succès paiement
router.get('/paiement-succes', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.redirect('/?error=session');

  const existing = db.prepare('SELECT * FROM sellers WHERE stripe_session_id = ?').get(session_id);
  if (existing) return res.redirect('/dashboard');

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') return res.redirect('/?error=payment');

    await createSellerFromSession(session);
    res.sendFile('payment-success.html', { root: './public' });
  } catch (err) {
    console.error('Payment success error:', err.message);
    res.redirect('/?error=server');
  }
});

// Stripe webhook handler (exporté séparément pour le raw body)
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
      const existing = db.prepare('SELECT id FROM sellers WHERE stripe_session_id = ?').get(session.id);
      if (!existing) {
        try { await createSellerFromSession(session); }
        catch (e) { console.error('Webhook seller creation error:', e.message); }
      }
    }
  }
  res.json({ received: true });
}

async function createSellerFromSession(session) {
  const { pack, email } = session.metadata;
  const tempPassword = Math.random().toString(36).slice(2, 10);
  const hashed = await bcrypt.hash(tempPassword, 12);
  const uuid = uuidv4();

  db.prepare(`
    INSERT OR IGNORE INTO sellers (uuid, email, password, pack, stripe_session_id, stripe_customer_id, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(uuid, email.toLowerCase(), hashed, pack, session.id, session.customer || null);

  await sendWelcomeEmail(email, tempPassword, pack);
}

module.exports = { router, stripeWebhook };
