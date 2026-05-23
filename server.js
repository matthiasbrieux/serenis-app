require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com", "fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "*.cloudinary.com", "res.cloudinary.com"],
      connectSrc: ["'self'", "api.stripe.com"],
      frameSrc: ["js.stripe.com"],
    }
  }
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── Stripe webhook : raw body AVANT le middleware json ──
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), require('./routes/payment').stripeWebhook);

// ── Twilio webhooks : urlencoded ──
app.post('/webhook/sms', express.urlencoded({ extended: false }), require('./routes/buyer').smsWebhook);
app.post('/webhook/voice', express.urlencoded({ extended: false }), require('./routes/buyer').voiceWebhook);

// ── Middleware corps JSON/form pour le reste ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ──
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/payment').router);
app.use('/', require('./routes/seller'));
app.use('/', require('./routes/buyer').router);
app.use('/admin', require('./routes/admin'));

// Contact form
app.post('/api/contact', async (req, res) => {
  const { name, phone, email, offer, city, message } = req.body;
  if (!name || !phone || !email) return res.json({ error: 'Champs requis manquants' });
  const db = require('./database');
  db.prepare('INSERT INTO contact_requests (name, phone, email, offer, city, message) VALUES (?,?,?,?,?,?)')
    .run(name, phone, email, offer || '', city || '', message || '');
  try {
    await require('./services/email').sendContactNotification({ name, phone, email, offer, city, message });
  } catch (e) {
    console.error('Contact email error:', e.message);
  }
  res.json({ success: true });
});

// Téléchargement guide (protégé)
app.get('/download/guide-vendeur', require('./middleware/auth').requireAuth, (req, res) => {
  res.download(path.join(__dirname, 'content', 'guide_vendeur_final.docx'), 'Guide_Vendeur_Serenis.docx');
});

// 404
app.use((req, res) => {
  res.status(404).sendFile('404.html', { root: './public' });
});

// Erreurs serveur
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur. Réessayez dans un instant.' });
});

app.listen(PORT, () => {
  console.log(`✓ Serenis démarré — http://localhost:${PORT}`);

  // Rappels visites — tourne chaque jour à 18h
  const { sendVisitReminders } = require('./services/reminders');
  function scheduleReminders() {
    const now = new Date();
    const next18h = new Date();
    next18h.setHours(18, 0, 0, 0);
    if (now >= next18h) next18h.setDate(next18h.getDate() + 1);
    const msUntil18h = next18h - now;
    setTimeout(() => {
      sendVisitReminders().catch(e => console.error('Reminder job error:', e.message));
      setInterval(() => {
        sendVisitReminders().catch(e => console.error('Reminder job error:', e.message));
      }, 24 * 60 * 60 * 1000);
    }, msUntil18h);
  }
  scheduleReminders();
});
