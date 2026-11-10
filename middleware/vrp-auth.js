const jwt = require('jsonwebtoken');
const db  = require('../database');

function requireVRP(req, res, next) {
  const token = req.cookies && req.cookies.vrp_token;
  if (!token) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Non authentifié.' });
    return res.redirect('/vrp/login');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'vrp') throw new Error('role mismatch');
    const vrp = db.prepare('SELECT * FROM vrps WHERE id = ?').get(payload.id);
    if (!vrp || vrp.status === 'inactif') {
      res.clearCookie('vrp_token');
      if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Compte VRP désactivé.' });
      return res.redirect('/vrp/login');
    }
    req.vrp = vrp;
    next();
  } catch (e) {
    res.clearCookie('vrp_token');
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Session expirée.' });
    return res.redirect('/vrp/login');
  }
}

module.exports = { requireVRP };
