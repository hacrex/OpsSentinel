const db = require('./db');
const { encrypt, decrypt } = require('./secure');
const { logAuditEvent } = require('./audit');

/**
 * Provider Connections — cloud credential management for AWS, GCP,
 * Azure, Hetzner Cloud, Cloudflare, ByteDC and Kubernetes clusters.
 * Credentials are encrypted at rest (AES-256-GCM) and are never
 * returned in full by the API — only a shape summary is exposed.
 * At execution time resolveProviderEnvironment() decrypts and maps
 * credentials into the process env used by IaC commands.
 */

const PROVIDER_CATALOG = {
  aws: {
    label: 'Amazon Web Services',
    fields: [
      { key: 'access_key_id', label: 'Access Key ID', secret: false },
      { key: 'secret_access_key', label: 'Secret Access Key', secret: true },
      { key: 'region', label: 'Region', secret: false },
    ],
    env_map: {
      access_key_id: 'AWS_ACCESS_KEY_ID',
      secret_access_key: 'AWS_SECRET_ACCESS_KEY',
      region: 'AWS_REGION',
    },
    secret_env: [],
  },
  gcp: {
    label: 'Google Cloud',
    fields: [
      { key: 'credentials_json', label: 'Service Account JSON', secret: true },
      { key: 'project', label: 'Project ID', secret: false },
      { key: 'region', label: 'Region', secret: false },
    ],
    env_map: { project: 'GOOGLE_PROJECT', region: 'GOOGLE_REGION' },
    secret_env: [],
    secret_vars: { credentials_json: 'GOOGLE_CREDENTIALS' },
  },
  azure: {
    label: 'Microsoft Azure',
    fields: [
      { key: 'client_id', label: 'Client ID', secret: false },
      { key: 'client_secret', label: 'Client Secret', secret: true },
      { key: 'tenant_id', label: 'Tenant ID', secret: false },
      { key: 'subscription_id', label: 'Subscription ID', secret: false },
    ],
    env_map: {},
    secret_vars: {
      client_id: 'ARM_CLIENT_ID',
      client_secret: 'ARM_CLIENT_SECRET',
      tenant_id: 'ARM_TENANT_ID',
      subscription_id: 'ARM_SUBSCRIPTION_ID',
    },
    secret_env: [],
  },
  hetzner: {
    label: 'Hetzner Cloud',
    fields: [{ key: 'api_token', label: 'API Token', secret: true }],
    env_map: {},
    secret_vars: { api_token: 'HCLOUD_TOKEN' },
    secret_env: [],
  },
  cloudflare: {
    label: 'Cloudflare',
    fields: [
      { key: 'api_token', label: 'API Token', secret: true },
      { key: 'account_id', label: 'Account ID', secret: false },
    ],
    env_map: { account_id: 'CLOUDFLARE_ACCOUNT_ID' },
    secret_vars: { api_token: 'CLOUDFLARE_API_TOKEN' },
    secret_env: [],
  },
  bytedc: {
    label: 'ByteDC',
    fields: [
      { key: 'api_key', label: 'API Key', secret: true },
      { key: 'region', label: 'Region', secret: false },
    ],
    env_map: { region: 'BYTEDC_REGION' },
    secret_vars: { api_key: 'BYTEDC_API_KEY' },
    secret_env: [],
  },
  kubernetes: {
    label: 'Kubernetes Cluster',
    fields: [
      { key: 'kubeconfig', label: 'Kubeconfig (YAML or base64)', secret: true },
      { key: 'context', label: 'Context', secret: false },
    ],
    env_map: { context: 'KUBECTL_CONTEXT' },
    secret_vars: { kubeconfig: 'KUBECONFIG' },
    secret_env: [],
  },
};

function getProviderCatalog(provider) {
  return PROVIDER_CATALOG[provider] || null;
}

function maskCredentials(provider, creds) {
  const catalog = getProviderCatalog(provider);
  const fields = catalog ? catalog.fields : [];
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    secret: f.secret,
    present: creds ? creds[f.key] !== undefined && creds[f.key] !== '' : false,
    preview: !f.secret && creds?.[f.key] ? String(creds[f.key]) : undefined,
  }));
}

async function listConnections({ tenant_id, provider }) {
  const conditions = [];
  const params = [];
  if (provider) { conditions.push('provider = ?'); params.push(provider); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM provider_connections ${where} ORDER BY created_at DESC`, params);

  return (result.rows || []).map((row) => {
    let creds = null;
    const dec = decrypt(row.credentials);
    if (dec) { try { creds = JSON.parse(dec); } catch { creds = null; } }
    return {
      id: row.id,
      provider: row.provider,
      label: PROVIDER_CATALOG[row.provider]?.label || row.provider,
      name: row.name,
      status: row.status,
      validated_at: row.validated_at,
      created_at: row.created_at,
      fields: maskCredentials(row.provider, creds),
      complete: maskCredentials(row.provider, creds).every((f) => f.present),
    };
  });
}

async function createConnection({ tenant_id, provider, name, credentials }) {
  if (!getProviderCatalog(provider)) return { error: 'unsupported_provider' };
  const result = await db.query(
    `INSERT INTO provider_connections (tenant_id, provider, name, credentials, status) VALUES (?, ?, ?, ?, ?)`,
    [tenant_id, provider, name, encrypt(JSON.stringify(credentials || {})), 'unvalidated']
  );
  logAuditEvent({
    userId: null, username: 'api',
    action: 'provider_connection_created',
    resourceType: 'provider_connection',
    resourceId: String(result.rows?.[0]?.id ?? ''),
    details: { provider, name },
    ipAddress: null,
  });
  return result.rows?.[0] ?? { id: null };
}

async function getConnection(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM provider_connections WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

async function updateConnection(id, { name, credentials }, tenant_id) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (credentials !== undefined) {
    // Merge semantics: catalog fields absent from the payload keep their
    // stored value when secret, and are cleared when non-secret.
    const row = await getConnection(id, tenant_id);
    if (!row) return null;
    const catalog = getProviderCatalog(row.provider);
    let existing = {};
    try { existing = JSON.parse(decrypt(row.credentials) || '{}'); } catch { existing = {}; }
    const catalogKeys = catalog ? catalog.fields.map((f) => f.key) : [];
    const merged = { ...existing };
    // Absent keys (undefined) keep their stored value — both secret and
    // non-secret. Explicit empty strings overwrite (clearing non-secrets).
    for (const key of catalogKeys) {
      if (credentials && credentials[key] !== undefined) merged[key] = credentials[key];
    }
    sets.push('credentials = ?'); params.push(encrypt(JSON.stringify(merged)));
    sets.push('status = ?'); params.push('unvalidated');
  }
  if (sets.length === 0) return null;
  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`UPDATE provider_connections SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`, params);
  return result;
}

async function deleteConnection(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  return db.query(`DELETE FROM provider_connections WHERE ${conditions.join(' AND ')}`, params);
}

/** Shape/consistency validation (no network calls — offline safe). */
async function validateConnection(id, tenant_id) {
  const row = await getConnection(id, tenant_id);
  if (!row) return { error: 'not_found' };
  const dec = decrypt(row.credentials);
  let creds = null;
  try { creds = JSON.parse(dec || '{}'); } catch { creds = null; }

  const catalog = getProviderCatalog(row.provider);
  const missing = catalog.fields.filter((f) => !creds?.[f.key]).map((f) => f.key);
  const status = missing.length === 0 ? 'valid' : 'invalid';
  await db.query(
    `UPDATE provider_connections SET status = ?, validated_at = ? WHERE id = ?`,
    [status, new Date().toISOString(), id]
  );
  return {
    id: parseInt(id, 10),
    provider: row.provider,
    name: row.name,
    status,
    missing_fields: missing,
    validated_at: new Date().toISOString(),
  };
}

/**
 * Build env vars for running IaC operations with a given connection.
 * Falls back gracefully when no connection exists (user env is used).
 */
async function resolveProviderEnvironment(tenant_id, provider, baseEnv = {}) {
  const conditions = ['provider = ?', "status != 'invalid'"];
  const params = [provider];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(
    `SELECT * FROM provider_connections WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 1`,
    params
  );
  const row = result.rows?.[0];
  if (!row) return { env: baseEnv, connection: null };

  const dec = decrypt(row.credentials);
  let creds = {};
  try { creds = JSON.parse(dec || '{}'); } catch { creds = {}; }

  const env = { ...baseEnv };
  const catalog = getProviderCatalog(row.provider);
  if (catalog.env_map) {
    for (const [key, envKey] of Object.entries(catalog.env_map)) {
      if (creds[key]) env[envKey] = String(creds[key]);
    }
  }
  if (catalog.secret_vars) {
    for (const [key, envKey] of Object.entries(catalog.secret_vars)) {
      if (creds[key]) env[envKey] = String(creds[key]);
    }
  }
  return { env, connection: { id: row.id, name: row.name, provider: row.provider } };
}

module.exports = {
  PROVIDER_CATALOG,
  getProviderCatalog,
  listConnections,
  createConnection,
  getConnection,
  updateConnection,
  deleteConnection,
  validateConnection,
  resolveProviderEnvironment,
};
