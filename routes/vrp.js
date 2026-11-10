const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const path     = require('path');
const db       = require('../database');
const session  = require('../services/session');
const { requireVRP } = require('../middleware/vrp-auth');

// ── Pages HTML ──────────────────────────────────────────────────────────────

router.get('/vrp', (req, res) => res.redirect('/vrp/dashboard'));

router.get('/vrp/login', (req, res) => {
  // Si déjà connecté → dashboard
  const token = req.cookies && req.cookies.vrp_token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/vrp/dashboard');
    } catch {}
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, '../views/vrp/login.html'));
});

router.get('/vrp/dashboard',   requireVRP, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, '../views/vrp/dashboard.html'));
});

router.get('/vrp/prospects',   requireVRP, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, '../views/vrp/prospects.html'));
});

router.get('/vrp/commissions', requireVRP, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, '../views/vrp/commissions.html'));
});

router.get('/vrp/ressources',  requireVRP, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, '../views/vrp/ressources.html'));
});

// ── Auth ────────────────────────────────────────────────────────────────────

router.post('/api/vrp/login', express.json(), async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.json({ success: false, error: 'Email et mot de passe requis.' });

  const vrp = db.prepare(
    "SELECT * FROM vrps WHERE LOWER(email) = LOWER(?) AND status != 'inactif'"
  ).get(String(email).trim());

  if (!vrp || !vrp.password)
    return res.json({ success: false, error: 'Identifiants incorrects.' });

  const ok = await bcrypt.compare(String(password), vrp.password);
  if (!ok) {
    db.prepare('UPDATE vrps SET failed_login_attempts = COALESCE(failed_login_attempts,0) + 1 WHERE id = ?').run(vrp.id);
    return res.json({ success: false, error: 'Identifiants incorrects.' });
  }

  db.prepare('UPDATE vrps SET failed_login_attempts = 0, last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(vrp.id);

  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: vrp.id, role: 'vrp' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('vrp_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });

  res.json({ success: true, redirect: '/vrp/dashboard' });
});

router.get('/vrp/logout', (req, res) => {
  res.clearCookie('vrp_token');
  res.redirect('/vrp/login');
});

// ── API principale : toutes les données du VRP connecté ────────────────────

router.get('/api/vrp/me', requireVRP, (req, res) => {
  const vrpId = req.vrp.id;
  const now   = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString().slice(0, 10);

  const sales = db.prepare(`
    SELECT vs.*, s.first_name || ' ' || COALESCE(s.last_name,'') AS seller_name
    FROM vrp_sales vs
    LEFT JOIN sellers s ON s.id = vs.seller_id
    WHERE vs.vrp_id = ?
    ORDER BY vs.sale_date DESC
  `).all(vrpId);

  const prospects = db.prepare(`
    SELECT * FROM vrp_prospects WHERE vrp_id = ? ORDER BY updated_at DESC
  `).all(vrpId);

  const commissionsMonth = sales
    .filter(s => s.sale_date && s.sale_date >= startOfMonth)
    .reduce((sum, s) => sum + (s.commission_amount_ht || 0), 0);

  const prospectsActive = prospects
    .filter(p => p.status !== 'souscrit' && p.status !== 'perdu')
    .length;

  const rdvThisMonth = prospects
    .filter(p => p.rdv_date && p.rdv_date >= startOfMonth && p.rdv_date < endOfMonth)
    .length;

  res.json({
    vrp: {
      id: req.vrp.id,
      first_name: req.vrp.first_name,
      last_name:  req.vrp.last_name,
      email:      req.vrp.email,
      zone:       req.vrp.zone,
      commission_rate: req.vrp.commission_rate,
    },
    sales,
    prospects,
    stats: {
      commissions_month_ht: commissionsMonth,
      prospects_active:     prospectsActive,
      sales_total:          sales.length,
      rdv_this_month:       rdvThisMonth,
    },
  });
});

// ── Prospects CRUD ──────────────────────────────────────────────────────────

router.post('/api/vrp/prospects', requireVRP, express.json(), (req, res) => {
  const vrpId = req.vrp.id;
  const b = req.body || {};
  if (!b.first_name) return res.json({ success: false, error: 'Le prénom est requis.' });

  const result = db.prepare(`
    INSERT INTO vrp_prospects
      (vrp_id, first_name, last_name, email, phone, city, property_type, property_surface,
       estimated_price, status, notes, rdv_date, rdv_time, next_action, next_action_date, source)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    vrpId, b.first_name, b.last_name||null, b.email||null, b.phone||null,
    b.city||null, b.property_type||null,
    b.property_surface ? +b.property_surface : null,
    b.estimated_price  ? +b.estimated_price  : null,
    b.status || 'nouveau', b.notes||null,
    b.rdv_date||null, b.rdv_time||null,
    b.next_action||null, b.next_action_date||null,
    b.source || 'terrain'
  );

  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/api/vrp/prospects/:id', requireVRP, express.json(), (req, res) => {
  const vrpId = req.vrp.id;
  const pid   = +req.params.id;
  const exists = db.prepare('SELECT id FROM vrp_prospects WHERE id = ? AND vrp_id = ?').get(pid, vrpId);
  if (!exists) return res.status(404).json({ success: false, error: 'Prospect introuvable.' });

  const b = req.body || {};
  if (!b.first_name) return res.json({ success: false, error: 'Le prénom est requis.' });

  db.prepare(`
    UPDATE vrp_prospects SET
      first_name=?, last_name=?, email=?, phone=?, city=?, property_type=?,
      property_surface=?, estimated_price=?, status=?, notes=?,
      rdv_date=?, rdv_time=?, next_action=?, next_action_date=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id = ? AND vrp_id = ?
  `).run(
    b.first_name, b.last_name||null, b.email||null, b.phone||null,
    b.city||null, b.property_type||null,
    b.property_surface ? +b.property_surface : null,
    b.estimated_price  ? +b.estimated_price  : null,
    b.status || 'nouveau', b.notes||null,
    b.rdv_date||null, b.rdv_time||null,
    b.next_action||null, b.next_action_date||null,
    pid, vrpId
  );

  res.json({ success: true });
});

router.delete('/api/vrp/prospects/:id', requireVRP, (req, res) => {
  const vrpId = req.vrp.id;
  const pid   = +req.params.id;
  const exists = db.prepare('SELECT id FROM vrp_prospects WHERE id = ? AND vrp_id = ?').get(pid, vrpId);
  if (!exists) return res.status(404).json({ success: false, error: 'Prospect introuvable.' });
  db.prepare('DELETE FROM vrp_prospects WHERE id = ? AND vrp_id = ?').run(pid, vrpId);
  res.json({ success: true });
});

// ── Mode démonstration ──────────────────────────────────────────────────────
// Lance une session courte (2h) sur un compte démo vendeur.
// Initialise automatiquement les données si elles sont absentes (idempotent).

router.post('/api/vrp/demo/start', requireVRP, (req, res) => {
  try {
    const { getDemoSeller } = require('../services/demo-seed');
    const demoSeller = getDemoSeller(); // crée les données démo si nécessaire

    if (!demoSeller) {
      return res.json({ success: false, error: "Impossible d'initialiser les données de démonstration. Contactez l'administration." });
    }

    const demoToken = session.sign(demoSeller, 'seller', '2h');
    const launchUrl = '/vrp/demo/launch?t=' + encodeURIComponent(demoToken);
    res.json({ success: true, url: launchUrl });
  } catch (err) {
    console.error('[VRP] demo/start error:', err.message);
    res.json({ success: false, error: "Erreur lors du lancement de la démo. Réessayez." });
  }
});

// Point d'entrée de la démo : pose le cookie vendeur et redirige vers le dashboard
router.get('/vrp/demo/launch', requireVRP, (req, res) => {
  const t = req.query.t;
  if (!t) return res.redirect('/vrp/ressources');
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(t, process.env.JWT_SECRET);
    if (payload.role !== 'seller') throw new Error('wrong role');
    res.cookie('token', t, session.cookieOptions(2 * 3600 * 1000));
    res.redirect('/dashboard');
  } catch {
    res.redirect('/vrp/ressources');
  }
});

module.exports = router;
