const axios = require('axios');
const logger = require('./logger');

// Simple in-memory cache to store token validity for 15 minutes
// Map of token -> { timestamp: number, valid: boolean }
const tokenCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; 

async function verifyGithubToken(token) {
  const now = Date.now();
  const cached = tokenCache.get(token);

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.valid;
  }

  try {
    // Validate by fetching the user profile
    await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    tokenCache.set(token, { timestamp: now, valid: true });
    return true;
  } catch (error) {
    logger.warn('Token validation failed against GitHub API');
    tokenCache.set(token, { timestamp: now, valid: false });
    return false;
  }
}

async function authMiddleware(req, res, next) {
  // Allow bypass for local dev testing if explicitly set
  if (process.env.BYPASS_AUTH === 'true') {
    logger.warn('Auth bypassed via BYPASS_AUTH environment variable');
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  
  const isValid = await verifyGithubToken(token);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired GitHub token' });
  }

  // Attach token to request for downstream usage (e.g. hitting GitHub API)
  req.token = token;
  next();
}

module.exports = { authMiddleware };
