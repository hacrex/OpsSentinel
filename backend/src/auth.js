const axios = require('axios');
const logger = require('./logger');
const db = require('./db');

const tokenCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

async function verifyGithubToken(token) {
  const now = Date.now();
  const cached = tokenCache.get(token);

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.user;
  }

  try {
    const res = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const github_id = String(res.data.id);
    const username = res.data.login;

    // Look up the user in our DB to get their tenant_id and role
    // Use ? placeholder which works with both SQLite and PostgreSQL (via toPostgresSQL)
    const result = await db.query('SELECT * FROM users WHERE github_id = ?', [github_id]);
    let tenant_id = null;
    let role = 'viewer'; // Default role

    if (result.rows && result.rows.length > 0) {
      tenant_id = result.rows[0].tenant_id;
      role = result.rows[0].role || 'viewer';
    }

    const user = { valid: true, github_id, username, tenant_id, role };
    tokenCache.set(token, { timestamp: now, user });
    return user;
  } catch (error) {
    logger.warn('Token validation failed against GitHub API');
    tokenCache.set(token, { timestamp: now, user: { valid: false } });
    return { valid: false };
  }
}

async function authMiddleware(req, res, next) {
  if (process.env.BYPASS_AUTH === 'true') {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('⚠️  Auth bypassed via BYPASS_AUTH — DO NOT use in production');
    }
    return next();
  }

  // Read token from HttpOnly cookie first, then fallback to Authorization header
  const token = req.cookies?.github_token
    || (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await verifyGithubToken(token);
  if (!user.valid) {
    // Clear invalid cookie
    res.clearCookie('github_token', { path: '/' });
    return res.status(401).json({ error: 'Invalid or expired GitHub token' });
  }

  req.token = token;
  req.user = { id: user.github_id, login: user.username, role: user.role };
  req.tenant_id = user.tenant_id;
  next();
}

module.exports = { authMiddleware };

