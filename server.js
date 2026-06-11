require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1); // Render / reverse proxy → req.protocol retourne https

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com", "fonts.googleapis.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "*.cloudinary.com", "res.cloudinary.com", "images.unsplash.com", "api.qrserver.com"],
      connectSrc: ["'self'", "api.stripe.com"],
      frameSrc: ["'self'", "js.stripe.com"],
      mediaSrc: ["'self'"],
    }
  }
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// Rate limit ciblé sur le webhook SMS (anti-spam)
const smsLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keyGenerator: (req) => req.body?.From || req.ip });
app.use(cookieParser());

// Serve index.html with no-cache so browsers always get the latest version
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Pages publiques statiques (avant les autres routes pour éviter interception)
app.get('/cgv', (req, res) => res.sendFile('cgv.html', { root: './public' }));
app.get('/tarifs', (req, res) => res.sendFile('tarifs.html', { root: './public' }));
app.get('/faq', (req, res) => res.sendFile('faq.html', { root: './public' }));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  },
}));

// ── Stripe webhook : raw body AVANT le middleware json ──
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), require('./routes/payment').stripeWebhook);

// ── Twilio webhooks : urlencoded ──
app.post('/webhook/sms', smsLimit, express.urlencoded({ extended: false }), require('./routes/buyer').smsWebhook);
app.post('/webhook/voice', smsLimit, express.urlencoded({ extended: false }), require('./routes/buyer').voiceWebhook);

// ── Middleware corps JSON/form pour le reste ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ──
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/payment').router);
app.use('/', require('./routes/seller'));
app.use('/', require('./routes/buyer').router);
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/dossier'));
app.use('/', require('./routes/partner'));

// ── SEO : sitemap + robots ─────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  const base = process.env.BASE_URL || 'https://venduparmo.fr';
  res.type('text/plain');
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /dashboard',
    'Disallow: /mon-bien',
    'Disallow: /ma-formation',
    'Disallow: /mon-agenda',
    'Disallow: /mes-offres',
    'Disallow: /mes-notifications',
    'Disallow: /mes-publications',
    'Disallow: /mes-performances',
    'Disallow: /mon-coach',
    'Disallow: /coach-ia',
    'Disallow: /booking',
    'Disallow: /onboarding',
    'Disallow: /contrat',
    'Disallow: /admin',
    'Disallow: /api/',
    `Sitemap: ${base}/sitemap.xml`,
  ].join('\n'));
});

app.get('/sitemap.xml', (req, res) => {
  const db = require('./database');
  const base = process.env.BASE_URL || 'https://venduparmo.fr';
  const properties = db.prepare('SELECT slug, updated_at FROM properties WHERE published=1').all();
  const today = new Date().toISOString().split('T')[0];
  const staticUrls = ['/', '/tarifs', '/faq', '/cgv'].map(p =>
    `  <url><loc>${base}${p}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.7'}</priority></url>`
  );
  const propUrls = properties.map(p =>
    `  <url><loc>${base}/bien/${p.slug}</loc><lastmod>${(p.updated_at || today).slice(0,10)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`
  );
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls,...propUrls].join('\n')}\n</urlset>`);
});

// Redirect mentions légales → section dans CGV
app.get('/mentions-legales', (req, res) => res.redirect(301, '/cgv#mentions-legales'));

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
  res.download(path.join(__dirname, 'content', 'guide_vendeur_final.docx'), 'Guide_Vendeur_Vendu_Par_Moi.docx');
});

// ── Healthcheck ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  try {
    const db = require('./database');
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', ts: new Date().toISOString(), uptime: Math.round(process.uptime()) });
  } catch(e) {
    res.status(503).json({ status: 'error', message: e.message });
  }
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

// Seed compte vendeur de démo au démarrage si aucun compte n'existe
async function seedSellerAccount() {
  try {
    const email = process.env.SELLER_EMAIL;
    const password = process.env.SELLER_PASSWORD;
    if (!email || !password) return;
    const db = require('./database');
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(email.toLowerCase());
    if (!existing) {
      const hashed = await bcrypt.hash(password, 12);
      db.prepare('INSERT INTO sellers (uuid, email, password, pack, paid_at, contrat_signe, contrat_signe_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP)')
        .run(uuidv4(), email.toLowerCase(), hashed, 'serenite');
      console.log(`✓ Compte vendeur créé : ${email}`);
    } else {
      // S'assurer que le compte démo a le contrat signé
      db.prepare('UPDATE sellers SET contrat_signe=1 WHERE id=? AND contrat_signe=0').run(existing.id);
    }
  } catch(e) { console.error('Seed error:', e.message); }
}

app.listen(PORT, () => {
  console.log(`✓ Vendu Par Moi démarré — http://localhost:${PORT}`);
  seedSellerAccount();

  // Rappels visites + nudges automatiques — tourne chaque jour à 18h
  const { backupDatabase } = require('./services/backup');
  backupDatabase(); // premier backup au démarrage
  setInterval(() => backupDatabase(), 24 * 60 * 60 * 1000); // backup quotidien

  const { sendVisitReminders, sendMissionReminders, sendAutomatedNudges, sendContractExpiryReminders, sendPostVisitBuyerNudges, sendPostVisitDossierNudges, sendPostVisitJ3Nudges, sendWeeklyAdminReportEmail, sendWeeklySellerReportEmail, sendPhotographerAvailabilityNudges, sendPostFirstVisitFeedbackNudges, sendCheckInNoOfferNudges, chargeInstallments, sendPriceDropNudges } = require('./services/reminders');

  function runDailyJobs() {
    sendVisitReminders().catch(e => console.error('Reminder job error:', e.message));
    sendMissionReminders().catch(e => console.error('Mission reminder job error:', e.message));
    sendAutomatedNudges().catch(e => console.error('Automated nudges job error:', e.message));
    sendContractExpiryReminders().catch(e => console.error('Contract expiry job error:', e.message));
    sendPostVisitBuyerNudges().catch(e => console.error('Post-visit nudge job error:', e.message));
    sendPostVisitDossierNudges().catch(e => console.error('Post-visit dossier nudge error:', e.message));
    sendPostVisitJ3Nudges().catch(e => console.error('Post-visit J+3 nudge error:', e.message));
    sendPhotographerAvailabilityNudges().catch(e => console.error('Photographer nudge job error:', e.message));
    sendPostFirstVisitFeedbackNudges().catch(e => console.error('Post-visit feedback job error:', e.message));
    sendCheckInNoOfferNudges().catch(e => console.error('Check-in no offer job error:', e.message));
    chargeInstallments().catch(e => console.error('Installment charge job error:', e.message));
    sendPriceDropNudges().catch(e => console.error('Price drop nudge job error:', e.message));
  }

  function scheduleReminders() {
    const now = new Date();
    const next18h = new Date();
    next18h.setHours(18, 0, 0, 0);
    if (now >= next18h) next18h.setDate(next18h.getDate() + 1);
    const msUntil18h = next18h - now;
    setTimeout(() => {
      runDailyJobs();
      setInterval(runDailyJobs, 24 * 60 * 60 * 1000);
    }, msUntil18h);
  }
  scheduleReminders();

  // Rapport hebdomadaire admin — chaque lundi à 8h00
  function scheduleWeeklyReport() {
    const now = new Date();
    const next = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const daysUntilMonday = dayOfWeek === 1 ? (now.getHours() >= 8 ? 7 : 0) : (8 - dayOfWeek) % 7 || 7;
    next.setDate(now.getDate() + daysUntilMonday);
    next.setHours(8, 0, 0, 0);
    const ms = next - now;
    setTimeout(() => {
      sendWeeklyAdminReportEmail().catch(e => console.error('Weekly report error:', e.message));
      sendWeeklySellerReportEmail().catch(e => console.error('Weekly seller report error:', e.message));
      setInterval(() => {
        sendWeeklyAdminReportEmail().catch(e => console.error('Weekly report error:', e.message));
        sendWeeklySellerReportEmail().catch(e => console.error('Weekly seller report error:', e.message));
      }, 7 * 24 * 60 * 60 * 1000);
    }, ms);
    console.log(`✓ Rapport hebdo planifié dans ${Math.round(ms / 3600000)}h`);
  }
  scheduleWeeklyReport();
});
