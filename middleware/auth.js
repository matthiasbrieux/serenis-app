const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.redirect('/login');
  try {
    req.seller = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
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
