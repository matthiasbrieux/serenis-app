const rateLimit = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = Object.freeze({ application: 300, static: 1200, uploadIp: 600, uploadSeller: 180 });
const UPLOAD_PATHS = new Set(['/api/property/photos', '/api/property/documents']);

function requestBudget(req) {
  // Express routes are case-insensitive and accept a trailing slash by default.
  if (req.method === 'POST' && UPLOAD_PATHS.has(req.path.toLowerCase().replace(/\/$/, ''))) return 'uploadIp';
  // Only public asset namespaces: never classify a private document/API by its extension.
  if (['GET', 'HEAD'].includes(req.method) && !req.path.split('/').some(p => p === '..' || p.includes('%'))) {
    if (/^\/(?:css|js|images|fonts|icons|audio|videos|_next|uploads\/photos)\/.+\.(?:css|js|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|mp3|mp4|webm)$/i.test(req.path)
      || /^\/(?:favicon(?:-\d+)?\.(?:ico|png)|apple-touch-icon\.png|icon-\d+\.png|logo-vpm\.(?:png|jpg|svg)|hero-bg\.jpg|sw\.js|manifest\.json)$/.test(req.path)) return 'static';
  }
  return 'application';
}

function createLimits() {
  const make = (budget, extra = {}) => rateLimit({
    windowMs: WINDOW_MS, max: LIMITS[budget], standardHeaders: true, legacyHeaders: false,
    handler(req, res) {
      const seconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      const error = `Trop de demandes. Veuillez patienter ${Math.ceil(seconds / 60)} minute(s) avant de réessayer. Les fichiers déjà enregistrés sont conservés.`;
      if (req.path.startsWith('/api/')) return res.status(429).json({ error, retryAfter: seconds });
      res.status(429).send(error);
    },
    ...extra,
  });
  const budgets = { application: make('application'), static: make('static'), uploadIp: make('uploadIp') };
  return {
    requestLimiter: (req, res, next) => budgets[requestBudget(req)](req, res, next),
    // Mounted after requireAuth; identity comes exclusively from the verified session.
    sellerUploadLimiter: make('uploadSeller', { keyGenerator: req => String(req.seller.id) }),
  };
}

const limits = createLimits();
module.exports = { ...limits, createLimits, requestBudget, LIMITS, WINDOW_MS };
