const REQUIRED = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_WEBHOOK_SECRET'];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const msg = `[startup] Missing environment variables: ${missing.join(', ')}. Some features may not work. Copy .env.example to .env to configure.`;
    if (process.env.NODE_ENV === 'production') {
      console.error(msg);
      process.exit(1);
    } else {
      console.warn(msg);
    }
  }

  // Block BYPASS_AUTH in production
  if (process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'production') {
    console.error('[startup] FATAL: BYPASS_AUTH=true is not allowed in production. Remove it or set NODE_ENV=development.');
    process.exit(1);
  }

  if (process.env.BYPASS_AUTH === 'true') {
    console.warn('[startup] ⚠️  BYPASS_AUTH is enabled — authentication is DISABLED. This is for local development only.');
  }
}

module.exports = validateEnv;
