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
    
    // Look up the user in our DB to get their tenant_id
    const result = await db.query('SELECT * FROM users WHERE github_id = $1', [github_id]);
    let tenant_id = null;
    
    if (result.rows && result.rows.length > 0) {
      tenant_id = result.rows[0].tenant_id;
    }

    const user = { valid: true, github_id, tenant_id };
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
    logger.warn('Auth bypassed via BYPASS_AUTH environment variable');
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  
  const user = await verifyGithubToken(token);
  if (!user.valid) {
    return res.status(401).json({ error: 'Invalid or expired GitHub token' });
  }

  req.token = token;
  req.tenant_id = user.tenant_id;
  next();
}

module.exports = { authMiddleware };

