const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'arbitragex-secret-change-in-production';

const authMiddleware = (req, res, next) => {
  // Skip auth for healthcheck
  if (req.path === '/health') return next();

  // Allow cron-job.org or automated scripts to bypass JWT if they provide the correct CRON_SECRET
  const cronSecret = process.env.CRON_SECRET || 'arbitragex-cron-secret-123';
  if (req.path === '/sync/manual' && req.query.cron_secret === cronSecret) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };
