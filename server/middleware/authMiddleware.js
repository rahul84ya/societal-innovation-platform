const { verifyToken } = require('../services/authService');

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication is required.' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Your session is invalid or expired.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.user_role)) {
      return res.status(403).json({ success: false, error: 'You do not have permission for this action.' });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };
