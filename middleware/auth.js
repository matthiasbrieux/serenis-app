const jwt = require('jsonwebtoken');
const db = require('../database');

// Routes exemptées du check contrat (contrat lui-même + son API)
const CONTRAT_EXEMPT = ['/contrat', '/api/contrat/sign', '/api/me'];

function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  const isApi = req.path.startsWith('/api/');
  if (!token) {
    if (isApi) return res.status(401).json({ error: 'Non authentifié' });
    return res.redirect('/login');
  }
  try {
    req.seller = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier signature contrat (sauf routes exemptées)
    const exempt = CONTRAT_EXEMPT.some(p => req.path === p || req.path.startsWith(p));
    if (!exempt) {
      const row = db.prepare('SELECT contrat_signe FROM sellers WHERE id = ?').get(req.seller.id);
      if (row && !row.contrat_signe) {
        if (isApi) return res.status(403).json({ error: 'Contrat non signé', redirect: '/contrat' });
        return res.redirect('/contrat');
      }
    }

    next();
  } catch {
    res.clearCookie('token');
    if (isApi) return res.status(401).json({ error: 'Session expirée' });
    res.redirect('/login');
  }
}

function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.redirect('/admin/login');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.redirect('/admin/login');
    req.admin = payload;
    next();
  } catch {
    res.clearCookie('admin_token');
    res.redirect('/admin/login');
  }
}

module.exports = { requireAuth, requireAdmin };
