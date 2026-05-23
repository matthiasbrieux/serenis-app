require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security
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

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Stripe webhook (raw body required before json middleware)
const paymentRoutes = require('./routes/payment');
app.use('/webhook/stripe', express.raw({ type: 'application/json' }), (req, res, next) => {
  paymentRoutes(req, res, next);
});

// Twilio webhooks
const buyerRoutes = require('./routes/buyer');
app.use('/webhook', express.urlencoded({ extended: false }), buyerRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const authRoutes = require('./routes/auth');
const sellerRoutes = require('./routes/seller');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/', paymentRoutes);
app.use('/', sellerRoutes);
app.use('/', buyerRoutes);
app.use('/admin', adminRoutes);

// Contact form
app.post('/api/contact', express.json(), async (req, res) => {
  const { name, phone, email, offer, city, message } = req.body;
  if (!name || !phone || !email) return res.json({ error: 'Champs requis manquants' });
  const db = require('./database');
  db.prepare('INSERT INTO contact_requests (name, phone, email, offer, city, message) VALUES (?,?,?,?,?,?)')
    .run(name, phone, email, offer || '', city || '', message || '');
  try {
    const { sendContactNotification } = require('./services/email');
    await sendContactNotification({ name, phone, email, offer, city, message });
  } catch (e) { console.error('Contact email error:', e); }
  res.json({ success: true });
});

// SPA fallback for seller views
app.get('/dashboard', (req, res) => res.sendFile('dashboard.html', { root: './views/seller' }));
app.get('/mon-bien', (req, res) => res.sendFile('property.html', { root: './views/seller' }));
app.get('/ma-formation', (req, res) => res.sendFile('library.html', { root: './views/seller' }));
app.get('/mon-agenda', (req, res) => res.sendFile('agenda.html', { root: './views/seller' }));

// Guide PDF download (protected)
app.get('/download/guide-vendeur', require('./middleware/auth').requireAuth, (req, res) => {
  const guideFile = path.join(__dirname, 'content', 'guide_vendeur_final.docx');
  res.download(guideFile, 'Guide_Vendeur_Serenis.docx');
});

// 404
app.use((req, res) => {
  res.status(404).sendFile('404.html', { root: './public' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur. Réessayez dans un instant.' });
});

app.listen(PORT, () => {
  console.log(`Serenis démarré sur http://localhost:${PORT}`);
});
