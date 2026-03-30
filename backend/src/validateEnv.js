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
}

module.exports = validateEnv;
