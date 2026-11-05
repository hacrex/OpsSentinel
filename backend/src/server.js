const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { verifySignature, handleWebhook, setBroadcast, handleGitLabWebhook, handleBitbucketWebhook } = require('./webhook');
const axios = require('axios');
const dotenv = require('dotenv');
const { encrypt, decrypt } = require('./secure');
const logger = require('./logger');
const validateEnv = require('./validateEnv');
const { startRetentionJob } = require('./retention');
const { startScheduler } = require('./automation');
const { startDriftDetector } = require('./drift');
const { notifyAll } = require('./notifier');
const { initAuditTable, logAuditEvent, getAuditLogs } = require('./audit');
const { triageFailure } = require('./triage');
const { analyzeFailure, getLLMConfig } = require('./llm');
const infra = require('./infrastructure');
const driftDetector = require('./drift');
const migration = require('./migration');
const { runOperation, listRuns, getStackStats, getInfraTrend, LOG_DIR, recordInfraRun, listStacks, createStack, deleteStack, getStackWorkingDir, getStackById, listIncidents, createIncident, getIncident, updateIncident, deleteIncident, listSecrets, createSecret, getSecret, updateSecret, deleteSecret, listConfigRuns, recordConfigRun, listPolicies, createPolicy, getPolicy, updatePolicy, deletePolicy, listFingerprints, upsertFingerprint, listRemediationActions, createRemediationAction, getRemediationAction, updateRemediationAction, deleteRemediationAction, listPredictions, createPrediction, getPrediction, updatePrediction, deletePrediction, listDriftEvents, createDriftEvent, getDriftEvent, updateDriftEvent, deleteDriftEvent, listStackFiles, readStackFile, writeStackFile, exportStackTar } = infra;
const blueprints = require('./blueprints');
const { listBlueprints, getBlueprint, instantiateBlueprint } = blueprints;
const gitsync = require('./gitsync');
const { listSources, createSource, getSource, updateSource, deleteSource, syncSource, pushStack } = gitsync;
const providers = require('./providers');
const { PROVIDER_CATALOG, getProviderCatalog, listConnections, createConnection, updateConnection, deleteConnection, validateConnection } = providers;
const automation = require('./automation');
const { listModules, createModule, deleteModule, listSchedules, createSchedule, updateSchedule, deleteSchedule } = automation;
const pipelines = require('./pipelines');
const { metrics, inc, observeLatency, set } = require('./metrics');
const setInfraBroadcast = infra.setBroadcast;
const helmet = require('helmet');
const { authMiddleware } = require('./auth');
const { requirePermission, requireAnyPermission, getRoles, isValidRole } = require('./rbac');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config();
validateEnv();

const app = express();
const isSaas = process.env.SAAS_MODE === 'true';
app.use(helmet());
app.use(cookieParser());
const server = http.createServer(app);
const port = process.env.PORT || 3001;

function getTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'none',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

function getApiBaseUrl() {
  return process.env.API_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

// ── WebSocket Server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Authenticate WebSocket connection using token from cookie or query
  const token = req.headers.cookie?.split('github_token=')?.[1]?.split(';')?.[0]
    || new URL(req.url, 'http://localhost').searchParams.get('token');

  if (!token && process.env.GITHUB_WEBHOOK_SECRET) {
    // If webhook secret is set, require auth
    logger.warn('WebSocket connection rejected: no token provided');
    ws.close(1008, 'Authentication required');
    return;
  }

  logger.info('WebSocket client connected');
  ws.on('close', () => logger.info('WebSocket client disconnected'));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

setBroadcast(broadcast);

setInfraBroadcast(broadcast);
pipelines.setBroadcast(broadcast);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Trust proxy for secure cookies behind reverse proxies
app.set('trust proxy', 1);

// Capture raw body for webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/events', apiLimiter);
app.use('/auth', apiLimiter);
app.use('/audit-logs', apiLimiter);
app.use('/webhook', webhookLimiter);
app.use('/webhook/gitlab', webhookLimiter);
app.use('/webhook/bitbucket', webhookLimiter);

// ── Metrics middleware ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    inc('http_requests_total', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
    });
    observeLatency(duration);
    metrics.http_requests_by_method[req.method] = (metrics.http_requests_by_method[req.method] || 0) + 1;
    metrics.http_requests_by_path[req.path] = (metrics.http_requests_by_path[req.path] || 0) + 1;
    metrics.http_requests_by_status[res.statusCode] = (metrics.http_requests_by_status[res.statusCode] || 0) + 1;
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.getMetrics());
});

app.post('/webhook{/:tenant_id}', verifySignature, handleWebhook);
app.post('/webhook/gitlab{/:tenant_id}', verifySignature, handleGitLabWebhook);
app.post('/webhook/bitbucket{/:tenant_id}', verifySignature, handleBitbucketWebhook);

// Paginated events with optional filters
app.get('/events', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const offset = (page - 1) * limit;
  const { repo, conclusion, workflow } = req.query;

  const conditions = [];
  const params = [];

  if (repo) { conditions.push('repo_name = ?'); params.push(repo); }
  if (conclusion) { conditions.push('conclusion = ?'); params.push(conclusion); }
  if (workflow) { conditions.push('workflow_name LIKE ?'); params.push(`%${workflow}%`); }
  
  if (isSaas) {
    conditions.push('tenant_id = ?');
    params.push(req.tenant_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await db.query(`SELECT COUNT(*) as cnt FROM events ${where}`, params);
    const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

    const dataResult = await db.query(
      `SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch events');
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Distinct repos for filter dropdown
app.get('/repos', authMiddleware, async (req, res) => {
  try {
    const params = isSaas ? [req.tenant_id] : [];
    const where = isSaas ? 'WHERE tenant_id = ?' : '';
    const result = await db.query(`SELECT DISTINCT repo_name FROM events ${where} ORDER BY repo_name`, params);
    res.json(result.rows.map((r) => r.repo_name));
  } catch (err) {
    logger.error({ err }, 'Failed to fetch repos');
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

// Repo detail — stats + recent runs + MTTR + flaky detection
app.get('/repos/:owner/:repo/stats', authMiddleware, async (req, res) => {
  const repo = `${req.params.owner}/${req.params.repo}`;
  const params = isSaas ? [repo, req.tenant_id] : [repo];
  const where = isSaas ? 'WHERE repo_name = ? AND tenant_id = ?' : 'WHERE repo_name = ?';
  try {
    const [total, failures, recent, mttrResult, flakyResult] = await Promise.all([
      db.query(`SELECT COUNT(*) as cnt FROM events ${where}`, params),
      db.query(`SELECT COUNT(*) as cnt FROM events ${where} AND conclusion = 'failure'`, params),
      db.query(`SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT 20`, params),
      // Average MTTR across all recovery events
      db.query(
        `SELECT AVG(mttr_seconds) as avg_mttr FROM events ${where} AND mttr_seconds IS NOT NULL`,
        params
      ),
      // Flaky workflows: >30% failure rate with at least 5 runs
      // Use subquery so HAVING works on both SQLite and PostgreSQL (no alias in HAVING)
      db.query(
        `SELECT workflow_name, total, failures FROM (
           SELECT workflow_name,
             COUNT(*) as total,
             SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failures
           FROM events ${where}
           GROUP BY workflow_name
         ) sub WHERE total >= 5`,
        params
      ),
    ]);

    const totalCount = parseInt(total.rows[0]?.cnt ?? 0, 10);
    const failCount = parseInt(failures.rows[0]?.cnt ?? 0, 10);
    const avgMttr = mttrResult.rows[0]?.avg_mttr ? Math.round(parseFloat(mttrResult.rows[0].avg_mttr)) : null;

    const flakyWorkflows = (flakyResult.rows || [])
      .filter((r) => parseInt(r.failures, 10) / parseInt(r.total, 10) > 0.3)
      .map((r) => r.workflow_name);

    res.json({
      repo_name: repo,
      total_runs: totalCount,
      failed_runs: failCount,
      success_rate: totalCount > 0 ? (((totalCount - failCount) / totalCount) * 100).toFixed(1) : '100.0',
      avg_mttr_seconds: avgMttr,
      flaky_workflows: flakyWorkflows,
      recent_runs: recent.rows,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch repo stats');
    res.status(500).json({ error: 'Failed to fetch repo stats' });
  }
});

// Repo trend — daily failure/success counts for the last 30 days
app.get('/repos/:owner/:repo/trend', authMiddleware, async (req, res) => {
  const repo = `${req.params.owner}/${req.params.repo}`;
  const isPostgres = !!process.env.DATABASE_URL;
  const whereSql = isSaas ? "repo_name = ? AND tenant_id = ?" : "repo_name = ?";
  const params = isSaas ? [repo, req.tenant_id] : [repo];
  
  const sql = isPostgres
    ? `SELECT DATE(created_at) as day,
         SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failures,
         SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as successes
       FROM events
       WHERE ${whereSql} AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY day ASC`
    : `SELECT DATE(created_at) as day,
         SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failures,
         SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as successes
       FROM events
       WHERE ${whereSql} AND created_at >= datetime('now', '-30 days')
       GROUP BY DATE(created_at) ORDER BY day ASC`;
  try {
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// Settings — read current notification config (values masked)
app.get('/settings', authMiddleware, (req, res) => {
  res.json({
    slack_webhook_url: process.env.SLACK_WEBHOOK_URL ? '••••••••' : '',
    teams_webhook_url: process.env.TEAMS_WEBHOOK_URL ? '••••••••' : '',
    alert_email_to: process.env.ALERT_EMAIL_TO || '',
    smtp_host: process.env.SMTP_HOST || '',
    smtp_port: process.env.SMTP_PORT || '587',
    smtp_user: process.env.SMTP_USER || '',
    retention_days: process.env.RETENTION_DAYS || '30',
  });
});

// Settings — test a notification channel
app.post('/settings/test', authMiddleware, requirePermission('notifications:test'), async (req, res) => {
  const { channel } = req.body;
  const testEvent = {
    repo_name: 'ops-sentinel/test',
    workflow_name: 'Test Notification',
    status: 'completed',
    conclusion: 'failure',
    run_url: 'https://github.com',
  };
  try {
    if (channel === 'slack') {
      if (!process.env.SLACK_WEBHOOK_URL) return res.status(400).json({ error: 'SLACK_WEBHOOK_URL not configured' });
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `🔔 Test notification from Ops Sentinel — Slack is configured correctly.`,
      });
    } else if (channel === 'teams') {
      if (!process.env.TEAMS_WEBHOOK_URL) return res.status(400).json({ error: 'TEAMS_WEBHOOK_URL not configured' });
      await axios.post(process.env.TEAMS_WEBHOOK_URL, {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: 'Test notification from Ops Sentinel',
        title: '🔔 Test — Ops Sentinel',
        text: 'Teams notifications are configured correctly.',
      });
    } else if (channel === 'email') {
      await notifyAll(testEvent);
    } else {
      return res.status(400).json({ error: 'Unknown channel' });
    }

    // Log the audit event
    await logAuditEvent({
      userId: req.user?.id || null,
      username: req.user?.login || 'unknown',
      action: 'notification_test',
      resourceType: 'settings',
      resourceId: channel,
      details: { channel, success: true },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Test sent to ${channel}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// ── Runtime Config (GitHub OAuth + Webhook) ─────────────────────────────────
const CONFIG_KEYS = {
  github_client_id: { label: 'GitHub OAuth Client ID', encrypted: false },
  github_client_secret: { label: 'GitHub OAuth Client Secret', encrypted: true },
  github_webhook_secret: { label: 'GitHub Webhook Secret', encrypted: true },
};

function maskValue(key, value) {
  const cfg = CONFIG_KEYS[key];
  if (!value) return '';
  if (cfg && cfg.encrypted) return '••••••••';
  return value;
}

app.get('/runtime-config', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`SELECT key, value, encrypted FROM runtime_config`);
    const config = {};
    for (const row of result.rows || []) {
      let val = row.value;
      if (row.encrypted && val) val = decrypt(val) || '';
      config[row.key] = val;
    }
    // Merge with env vars as fallback (env takes precedence if set)
    const merged = {};
    for (const [key, cfg] of Object.entries(CONFIG_KEYS)) {
      const envVal = process.env[key.toUpperCase()];
      const dbVal = config[key] || '';
      merged[key] = {
        value: maskValue(key, envVal || dbVal),
        configured: Boolean(envVal || dbVal),
        label: cfg.label,
        encrypted: cfg.encrypted,
        source: envVal ? 'env' : dbVal ? 'db' : 'none',
      };
    }
    res.json(merged);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch runtime config');
    res.status(500).json({ error: 'Failed to fetch runtime config' });
  }
});

app.put('/runtime-config', authMiddleware, requirePermission('settings:write'), async (req, res) => {
  const { github_client_id, github_client_secret, github_webhook_secret } = req.body;
  const updates = [
    { key: 'github_client_id', value: github_client_id, encrypted: false },
    { key: 'github_client_secret', value: github_client_secret, encrypted: true },
    { key: 'github_webhook_secret', value: github_webhook_secret, encrypted: true },
  ];
  try {
    for (const { key, value, encrypted } of updates) {
      const encryptedVal = encrypted ? encrypt(value) : value;
      await db.query(
        `INSERT INTO runtime_config (key, value, encrypted, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, encrypted = ?, updated_at = ?`,
        [key, encryptedVal, encrypted, new Date().toISOString(), encryptedVal, encrypted, new Date().toISOString()]
      );
      await logAuditEvent({
        userId: req.user?.id || null,
        username: req.user?.login || 'unknown',
        action: 'runtime_config_update',
        resourceType: 'runtime_config',
        resourceId: key,
        details: { key, configured: Boolean(value) },
        ipAddress: req.ip,
      });
    }
    res.json({ success: true, message: 'Runtime config updated' });
  } catch (err) {
    logger.error({ err }, 'Failed to update runtime config');
    res.status(500).json({ error: 'Failed to update runtime config' });
  }
});

app.post('/runtime-config/test-github', authMiddleware, requirePermission('settings:write'), async (req, res) => {
  const { client_id, client_secret } = req.body;
  if (!client_id || !client_secret) {
    return res.status(400).json({ error: 'Client ID and Client Secret are required' });
  }
  try {
    // Test by hitting GitHub's OAuth token exchange with a dummy code —
    // GitHub will return 400 for invalid code, which proves credentials are valid
    // (if credentials were invalid, we'd get a different error).
    const res2 = await axios.post('https://github.com/login/oauth/access_token', {
      client_id,
      client_secret,
      code: 'test-code-that-will-fail',
    }, {
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });
    // If we got a 200 with an error field, credentials are valid
    if (res2.data && res2.data.error) {
      await logAuditEvent({
        userId: req.user?.id || null,
        username: req.user?.login || 'unknown',
        action: 'github_oauth_test',
        resourceType: 'runtime_config',
        resourceId: 'github_client_id',
        details: { success: true, error_code: res2.data.error },
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: 'GitHub OAuth credentials are valid' });
    }
    res.json({ success: true, message: 'GitHub OAuth credentials are valid' });
  } catch (err) {
    // Axios throws on non-2xx. A 400 from GitHub means credentials ARE valid
    // (the code is just invalid). Other errors mean credentials are wrong.
    if (err.response && err.response.status === 400) {
      await logAuditEvent({
        userId: req.user?.id || null,
        username: req.user?.login || 'unknown',
        action: 'github_oauth_test',
        resourceType: 'runtime_config',
        resourceId: 'github_client_id',
        details: { success: true },
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: 'GitHub OAuth credentials are valid' });
    }
    await logAuditEvent({
      userId: req.user?.id || null,
      username: req.user?.login || 'unknown',
      action: 'github_oauth_test',
      resourceType: 'runtime_config',
      resourceId: 'github_client_id',
      details: { success: false, error: err.message },
      ipAddress: req.ip,
    });
    res.status(400).json({ error: 'Invalid GitHub OAuth credentials' });
  }
});

// 1-Click re-run
app.post('/rerun', authMiddleware, requirePermission('workflow:rerun'), async (req, res) => {
  const { run_url } = req.body;
  const token = req.token;
  if (!run_url || !token) return res.status(400).json({ error: 'run_url and token required' });

  // Extract owner/repo/run_id from the GitHub URL
  const match = run_url.match(/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
  if (!match) return res.status(400).json({ error: 'Invalid run_url format' });

  const [, owner, repo, runId] = match;

  try {
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
      {},
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );

    // Log the audit event
    await logAuditEvent({
      userId: req.user?.id || null,
      username: req.user?.login || 'unknown',
      action: 'workflow_rerun',
      resourceType: 'workflow_run',
      resourceId: `${owner}/${repo}/runs/${runId}`,
      details: { owner, repo, runId, run_url },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Re-run triggered for run ${runId}` });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || 'Failed to trigger re-run';
    res.status(status).json({ error: message });
  }
});

// ── Infrastructure Provisioning (CI/CD-first) ──

app.post('/infrastructure/runs', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { repo_name, stack_name, engine, operation, workingDir, vars, status, conclusion, source } = req.body;
  if (!repo_name || !stack_name || !engine || !operation) {
    return res.status(400).json({ error: 'repo_name, stack_name, engine, operation required' });
  }

  try {
    // CI-reported result: record without spawning a process
    if (source === 'ci' && status && conclusion) {
      recordInfraRun({
        tenant_id: req.tenant_id || null,
        repo_name, stack_name, engine, operation,
        status, conclusion,
        output_url: req.body.output_url || '',
        triggeredBy: req.user?.login || 'ci',
      });

      await logAuditEvent({
        userId: req.user?.id || null, username: req.user?.login || 'ci',
        action: 'infrastructure_ci_recorded',
        resourceType: 'infrastructure_run',
        resourceId: 'ci',
        details: { engine, operation, stack_name, repo_name, status, conclusion },
        ipAddress: req.ip,
      });

      return res.json({ success: true, recorded: true });
    }

    // UI-triggered: spawn the process
    const run = await runOperation({
      tenant_id: req.tenant_id || null,
      repo_name, stack_name, engine, operation,
      workingDir: workingDir || `./infra/${stack_name}`,
      vars: vars || {},
      triggeredBy: req.user?.login || 'unknown',
    });
    if (run.error) return res.status(500).json({ error: 'Failed to start infrastructure run' });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'infrastructure_trigger',
      resourceType: 'infrastructure_run',
      resourceId: String(run.id),
      details: { engine, operation, stack_name, repo_name },
      ipAddress: req.ip,
    });

    res.json({ success: true, run });
  } catch (err) {
    logger.error({ err }, 'Infrastructure run failed');
    res.status(500).json({ error: 'Failed to start infrastructure run' });
  }
});

app.get('/infrastructure/runs', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { repo, stack, engine, operation, conclusion } = req.query;

  try {
    const result = await listRuns({
      tenant_id: req.tenant_id || null,
      repo, stack, engine, operation, conclusion, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch infrastructure runs');
    res.status(500).json({ error: 'Failed to fetch infrastructure runs' });
  }
});

app.get(/^\/infrastructure\/stats\/(.+)\/(.+)$/, authMiddleware, async (req, res) => {
  const repo_name = decodeURIComponent(req.params[0]);
  const stack_name = decodeURIComponent(req.params[1]);

  try {
    const stats = await getStackStats(repo_name, stack_name, req.tenant_id || null);
    res.json(stats);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch infra stack stats');
    res.status(500).json({ error: 'Failed to fetch infra stack stats' });
  }
});

app.get(/^\/infrastructure\/trend\/(.+)\/(.+)$/, authMiddleware, async (req, res) => {
  const repo_name = decodeURIComponent(req.params[0]);
  const stack_name = decodeURIComponent(req.params[1]);

  try {
    const trend = await getInfraTrend(repo_name, stack_name, req.tenant_id || null);
    res.json(trend);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch infra trend');
    res.status(500).json({ error: 'Failed to fetch infra trend' });
  }
});

app.post('/infrastructure/rerun', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { run_id } = req.body;
  if (!run_id) return res.status(400).json({ error: 'run_id required' });

  try {
    const runResult = await db.query('SELECT * FROM infrastructure_runs WHERE id = ?', [run_id]);
    if (!runResult.rows || runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Infrastructure run not found' });
    }
    const original = runResult.rows[0];

    const run = await runOperation({
      tenant_id: original.tenant_id,
      repo_name: original.repo_name,
      stack_name: original.stack_name,
      engine: original.engine,
      operation: original.operation,
      workingDir: `./infra/${original.stack_name}`,
      vars: {},
      triggeredBy: req.user?.login || 'unknown',
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'infrastructure_rerun',
      resourceType: 'infrastructure_run',
      resourceId: String(run.id),
      details: { original_run_id: run_id, engine: original.engine, operation: original.operation },
      ipAddress: req.ip,
    });

    res.json({ success: true, run });
  } catch (err) {
    logger.error({ err }, 'Infrastructure rerun failed');
    res.status(500).json({ error: 'Failed to rerun infrastructure' });
  }
});

// Stack configuration (repo -> working directory mapping)
app.get('/infrastructure/stacks', authMiddleware, async (req, res) => {
  const { repo } = req.query;
  try {
    const stacks = await listStacks({ tenant_id: req.tenant_id || null, repo });
    res.json(stacks);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch stacks');
    res.status(500).json({ error: 'Failed to fetch stacks' });
  }
});

app.post('/infrastructure/stacks', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { repo_name, stack_name, engine, working_dir, default_vars } = req.body;
  if (!repo_name || !stack_name || !engine || !working_dir) {
    return res.status(400).json({ error: 'repo_name, stack_name, engine, working_dir required' });
  }
  try {
    const stack = await createStack({
      tenant_id: req.tenant_id || null,
      repo_name, stack_name, engine, working_dir, default_vars,
    });
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'stack_create',
      resourceType: 'stack',
      resourceId: String(stack.id),
      details: { repo_name, stack_name, engine, working_dir },
      ipAddress: req.ip,
    });
    res.json({ success: true, stack });
  } catch (err) {
    logger.error({ err }, 'Failed to create stack');
    res.status(500).json({ error: 'Failed to create stack' });
  }
});

app.delete('/infrastructure/stacks/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  try {
    await deleteStack(id, req.tenant_id || null);
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'stack_delete',
      resourceType: 'stack',
      resourceId: id,
      details: { stack_id: id },
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete stack');
    res.status(500).json({ error: 'Failed to delete stack' });
  }
});

// ── Stack code files & export ────────────────────────────────────────────────
app.get('/stacks/:stackId/files', authMiddleware, async (req, res) => {
  try {
    const stack = await getStackById(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const files = await listStackFiles(stack.working_dir);
    res.json({ stack: { id: stack.id, stack_name: stack.stack_name, working_dir: stack.working_dir }, files });
  } catch (err) {
    logger.error({ err }, 'Failed to list stack files');
    res.status(500).json({ error: 'Failed to list stack files' });
  }
});

app.get('/stacks/:stackId/file', authMiddleware, async (req, res) => {
  try {
    const stack = await getStackById(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const { path: relPath } = req.query;
    if (!relPath) return res.status(400).json({ error: 'path query required' });
    // Prevent path traversal
    const resolved = path.resolve(stack.working_dir, relPath);
    const workingResolved = path.resolve(stack.working_dir);
    if (!resolved.startsWith(workingResolved + path.sep) && resolved !== workingResolved) {
      return res.status(403).json({ error: 'Path traversal not allowed' });
    }
    const result = await readStackFile(resolved);
    if (result.error) return res.status(result.error === 'too_large' ? 413 : 404).json(result);
    res.json({ path: relPath, content: result.content, size: result.size });
  } catch (err) {
    logger.error({ err }, 'Failed to read stack file');
    res.status(500).json({ error: 'Failed to read stack file' });
  }
});

app.put('/stacks/:stackId/file', authMiddleware, async (req, res) => {
  try {
    const stack = await getStackById(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const { path: relPath, content } = req.body;
    if (!relPath || content === undefined) {
      return res.status(400).json({ error: 'path and content required' });
    }
    const result = await writeStackFile(stack.working_dir, relPath, content);
    if (result.error) {
      if (result.error === 'too_large') return res.status(413).json(result);
      if (result.error === 'forbidden') return res.status(403).json(result);
      return res.status(500).json(result);
    }
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'stack_file_write', resourceType: 'stack_file', resourceId: req.params.stackId,
      details: { path: relPath, stack_name: stack.stack_name }, ipAddress: req.ip,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to write stack file');
    res.status(500).json({ error: 'Failed to write stack file' });
  }
});

app.get('/stacks/:stackId/export', authMiddleware, async (req, res) => {
  try {
    const stack = await getStackById(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const result = await exportStackTar(stack.working_dir);
    if (result.error) return res.status(500).json(result);
    res.download(result.tarFile, `stack-${stack.stack_name}.tar.gz`, (err) => {
      if (err) logger.error({ err }, 'Failed to send stack export');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to export stack');
    res.status(500).json({ error: 'Failed to export stack' });
  }
});

// ── Stack Blueprints ─────────────────────────────────────────────────────────
app.get('/blueprints', authMiddleware, async (req, res) => {
  try {
    res.json({ data: listBlueprints(), catalog: Object.entries(PROVIDER_CATALOG).map(([id, p]) => ({ id, label: p.label })) });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch blueprints');
    res.status(500).json({ error: 'Failed to fetch blueprints' });
  }
});

app.get('/blueprints/:id', authMiddleware, async (req, res) => {
  const blueprint = getBlueprint(req.params.id);
  if (!blueprint) return res.status(404).json({ error: 'Blueprint not found' });
  res.json(blueprint);
});

app.post('/blueprints/:id/instantiate', authMiddleware, requirePermission('blueprints:instantiate'), async (req, res) => {
  const { repo_name, stack_name, working_dir, vars } = req.body;
  if (!repo_name || !stack_name || !working_dir) {
    return res.status(400).json({ error: 'repo_name, stack_name, working_dir required' });
  }
  try {
    const result = await instantiateBlueprint({
      tenant_id: req.tenant_id || null,
      blueprint_id: req.params.id,
      repo_name, stack_name, working_dir, vars,
    });
    if (result.error) return res.status(404).json({ error: 'Blueprint not found' });
    broadcast({ type: 'stack_created', stack_name, blueprint: req.params.id });
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'blueprint_instantiate', resourceType: 'stack', resourceId: String(result.stack?.id ?? ''),
      details: { blueprint: req.params.id, repo_name, stack_name, working_dir },
      ipAddress: req.ip,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to instantiate blueprint');
    res.status(500).json({ error: 'Failed to instantiate blueprint' });
  }
});

// ── GitOps Git Sync ──────────────────────────────────────────────────────────
app.get('/git/sources', authMiddleware, async (req, res) => {
  try {
    const data = await listSources({ tenant_id: req.tenant_id || null, status: req.query.status });
    res.json({ data });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch git sources');
    res.status(500).json({ error: 'Failed to fetch git sources' });
  }
});

app.post('/git/sources', authMiddleware, requirePermission('git:manage'), async (req, res) => {
  const { name, repo_url, branch, kind, path: subPath, auth_type, ssh_private_key, token } = req.body;
  if (!name || !repo_url) return res.status(400).json({ error: 'name, repo_url required' });
  try {
    const source = await createSource({ tenant_id: req.tenant_id || null, name, repo_url, branch, kind, path: subPath, auth_type, ssh_private_key, token });
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'git_source_create', resourceType: 'git_source', resourceId: String(source.id ?? ''),
      details: { name, repo_url, branch, auth_type }, ipAddress: req.ip,
    });
    res.json({ success: true, source });
  } catch (err) {
    logger.error({ err }, 'Failed to create git source');
    res.status(500).json({ error: 'Failed to create git source' });
  }
});

app.patch('/git/sources/:id', authMiddleware, requirePermission('git:manage'), async (req, res) => {
  try {
    const result = await updateSource(req.params.id, req.body, req.tenant_id || null);
    res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, 'Failed to update git source');
    res.status(500).json({ error: 'Failed to update git source' });
  }
});

app.delete('/git/sources/:id', authMiddleware, requirePermission('git:manage'), async (req, res) => {
  try {
    await deleteSource(req.params.id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete git source');
    res.status(500).json({ error: 'Failed to delete git source' });
  }
});

app.post('/git/sources/:id/sync', authMiddleware, requirePermission('git:sync'), async (req, res) => {
  try {
    const source = await getSource(req.params.id, req.tenant_id || null);
    if (!source) return res.status(404).json({ error: 'Source not found' });
    const result = await syncSource(source);
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'git_sync', resourceType: 'git_source', resourceId: req.params.id,
      details: { name: source.name, status: result.status || result.error }, ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Git sync failed');
    res.status(500).json({ error: 'Git sync failed' });
  }
});

app.post('/git/sources/:id/push', authMiddleware, requirePermission('git:manage'), async (req, res) => {
  const { stack_dir, message } = req.body;
  if (!stack_dir) return res.status(400).json({ error: 'stack_dir required' });
  try {
    const source = await getSource(req.params.id, req.tenant_id || null);
    if (!source) return res.status(404).json({ error: 'Source not found' });
    const result = await pushStack({ source, stack_dir, message });
    if (result.error) return res.status(400).json(result);
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'git_push', resourceType: 'git_source', resourceId: req.params.id,
      details: { stack_dir }, ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Git push failed');
    res.status(500).json({ error: 'Git push failed' });
  }
});

// ── Provider Connections ─────────────────────────────────────────────────────
app.get('/providers/catalog', authMiddleware, async (req, res) => {
  res.json(Object.entries(PROVIDER_CATALOG).map(([id, p]) => ({
    id, label: p.label,
    fields: p.fields,
  })));
});

app.get('/providers', authMiddleware, async (req, res) => {
  try {
    const data = await listConnections({ tenant_id: req.tenant_id || null, provider: req.query.provider });
    res.json({ data });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch provider connections');
    res.status(500).json({ error: 'Failed to fetch provider connections' });
  }
});

app.post('/providers', authMiddleware, requirePermission('providers:write'), async (req, res) => {
  const { provider, name, credentials } = req.body;
  if (!provider || !name) return res.status(400).json({ error: 'provider, name required' });
  if (!getProviderCatalog(provider)) return res.status(400).json({ error: 'Unsupported provider' });
  try {
    const connection = await createConnection({ tenant_id: req.tenant_id || null, provider, name, credentials });
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'provider_connection_create', resourceType: 'provider_connection', resourceId: String(connection.id ?? ''),
      details: { provider, name }, ipAddress: req.ip,
    });
    res.json({ success: true, connection });
  } catch (err) {
    logger.error({ err }, 'Failed to create provider connection');
    res.status(500).json({ error: 'Failed to create provider connection' });
  }
});

app.patch('/providers/:id', authMiddleware, requirePermission('providers:write'), async (req, res) => {
  try {
    await updateConnection(req.params.id, req.body, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update provider connection');
    res.status(500).json({ error: 'Failed to update provider connection' });
  }
});

app.delete('/providers/:id', authMiddleware, requirePermission('providers:write'), async (req, res) => {
  try {
    await deleteConnection(req.params.id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete provider connection');
    res.status(500).json({ error: 'Failed to delete provider connection' });
  }
});

app.post('/providers/:id/validate', authMiddleware, requirePermission('providers:write'), async (req, res) => {
  try {
    const result = await validateConnection(req.params.id, req.tenant_id || null);
    if (result.error) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Provider validation failed');
    res.status(500).json({ error: 'Provider validation failed' });
  }
});

// ── Stack State Management ───────────────────────────────────────────────────
const stackstate = require('./stackstate');

app.get('/state/stacks/:stackId', authMiddleware, async (req, res) => {
  try {
    const stack = await stackstate.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const [latest, history, lock] = await Promise.all([
      stackstate.getLatestState(stack.id, stack.tenant_id),
      stackstate.listStateVersions({ stack_id: stack.id, tenant_id: stack.tenant_id }),
      stackstate.getLock(stack.id),
    ]);
    res.json({ stack, latest, history, lock });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch state');
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

app.put('/state/stacks/:stackId', authMiddleware, requirePermission('state:write'), async (req, res) => {
  try {
    const stack = await stackstate.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const lockCheck = await stackstate.assertNotLocked(stack);
    if (lockCheck.blocked) return res.status(409).json(lockCheck);
    const result = await stackstate.pushStateVersion({
      stack,
      state_text: req.body.state_text,
      state_serial: req.body.state_serial,
      notes: req.body.notes,
      created_by: req.user?.login || 'api',
      source: 'api',
    });
    if (result.conflict) return res.status(409).json(result);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to push state');
    res.status(500).json({ error: 'Failed to push state' });
  }
});

app.get('/state/stacks/:stackId/versions/:version', authMiddleware, async (req, res) => {
  try {
    const stack = await stackstate.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const version = await stackstate.getStateVersion(stack, req.params.version, stack.tenant_id);
    if (!version) return res.status(404).json({ error: 'Version not found' });
    res.json(version);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch state version');
    res.status(500).json({ error: 'Failed to fetch state version' });
  }
});

app.post('/state/stacks/:stackId/restore/:version', authMiddleware, requirePermission('state:write'), async (req, res) => {
  try {
    const stack = await stackstate.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const lockCheck = await stackstate.assertNotLocked(stack);
    if (lockCheck.blocked) return res.status(409).json(lockCheck);
    const result = await stackstate.restoreStateVersion(stack, req.params.version, stack.tenant_id, req.user?.login || 'api');
    if (result.error) return res.status(404).json(result);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to restore state');
    res.status(500).json({ error: 'Failed to restore state' });
  }
});

app.post('/state/stacks/:stackId/lock', authMiddleware, requirePermission('state:write'), async (req, res) => {
  try {
    const stack = await stackstate.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const result = await stackstate.lockStack({
      stack,
      locked_by: req.user?.login || 'api',
      note: req.body.note,
    });
    if (result.conflict) return res.status(409).json(result);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to lock state');
    res.status(500).json({ error: 'Failed to lock state' });
  }
});

app.post('/state/stacks/:stackId/unlock', authMiddleware, requirePermission('state:write'), async (req, res) => {
  try {
    const stack = await stackstate.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const result = await stackstate.unlockStack({
      stack,
      force: req.body.force === true,
      unlocked_by: req.user?.login || 'api',
    });
    if (result.error === 'not_found') return res.status(404).json(result);
    if (result.conflict) return res.status(409).json(result);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to unlock state');
    res.status(500).json({ error: 'Failed to unlock state' });
  }
});

// ── Variables / Modules / Scheduled Plans ────────────────────────────────────
app.get('/stacks/:stackId/variables', authMiddleware, async (req, res) => {
  try {
    const stack = await automation.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    res.json({ data: await automation.listVariables({ stack_id: stack.id }), stack });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch variables');
    res.status(500).json({ error: 'Failed to fetch variables' });
  }
});

app.post('/stacks/:stackId/variables', authMiddleware, requirePermission('variables:write'), async (req, res) => {
  const { key, value, sensitive } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    const stack = await automation.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const variable = await automation.createVariable({ stack_id: stack.id, key, value, sensitive, source: req.body.source });
    res.json({ success: true, variable });
  } catch (err) {
    logger.error({ err }, 'Failed to create variable');
    res.status(500).json({ error: 'Failed to create variable' });
  }
});

app.patch('/stacks/:stackId/variables/:id', authMiddleware, requirePermission('variables:write'), async (req, res) => {
  try {
    const stack = await automation.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    await automation.updateVariable(req.params.id, stack.id, req.body);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update variable');
    res.status(500).json({ error: 'Failed to update variable' });
  }
});

app.delete('/stacks/:stackId/variables/:id', authMiddleware, requirePermission('variables:write'), async (req, res) => {
  try {
    const stack = await automation.getStack(req.params.stackId, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    await automation.deleteVariable(req.params.id, stack.id);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete variable');
    res.status(500).json({ error: 'Failed to delete variable' });
  }
});

app.get('/modules', authMiddleware, async (req, res) => {
  try {
    res.json({ data: await listModules({ tenant_id: req.tenant_id || null, engine: req.query.engine }) });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch modules');
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

app.post('/modules', authMiddleware, requirePermission('modules:write'), async (req, res) => {
  const { name, source } = req.body;
  if (!name || !source) return res.status(400).json({ error: 'name, source required' });
  try {
    const module = await createModule({ tenant_id: req.tenant_id || null, ...req.body });
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'module_create', resourceType: 'stack_module', resourceId: String(module.id ?? ''),
      details: { name, source }, ipAddress: req.ip,
    });
    res.json({ success: true, module });
  } catch (err) {
    logger.error({ err }, 'Failed to create module');
    res.status(500).json({ error: 'Failed to create module' });
  }
});

app.delete('/modules/:id', authMiddleware, requirePermission('modules:write'), async (req, res) => {
  try {
    await deleteModule(req.params.id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete module');
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

app.get('/schedules', authMiddleware, async (req, res) => {
  try {
    res.json({ data: await listSchedules({ tenant_id: req.tenant_id || null }) });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch schedules');
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

app.post('/schedules', authMiddleware, requirePermission('schedules:write'), async (req, res) => {
  const { stack_id } = req.body;
  if (!stack_id) return res.status(400).json({ error: 'stack_id required' });
  try {
    const stack = await automation.getStack(stack_id, req.tenant_id || null);
    if (!stack) return res.status(404).json({ error: 'Stack not found' });
    const schedule = await createSchedule({
      tenant_id: req.tenant_id || null,
      stack_id: stack.id,
      repo_name: stack.repo_name,
      stack_name: stack.stack_name,
      engine: stack.engine,
      working_dir: stack.working_dir,
      operation: req.body.operation,
      interval_minutes: req.body.interval_minutes,
      description: req.body.description,
      created_by: req.user?.login || 'api',
    });
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'schedule_create', resourceType: 'scheduled_plan', resourceId: String(schedule.id ?? ''),
      details: { stack: stack.stack_name, operation: req.body.operation, interval_minutes: req.body.interval_minutes }, ipAddress: req.ip,
    });
    res.json({ success: true, schedule });
  } catch (err) {
    logger.error({ err }, 'Failed to create schedule');
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

app.patch('/schedules/:id', authMiddleware, requirePermission('schedules:write'), async (req, res) => {
  try {
    await updateSchedule(req.params.id, req.body, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update schedule');
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

app.delete('/schedules/:id', authMiddleware, requirePermission('schedules:write'), async (req, res) => {
  try {
    await deleteSchedule(req.params.id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete schedule');
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// ── Migration: Terraform → OpenTofu ─────────────────────────────────────────
app.post('/migration/terraform-to-tofu', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { directory } = req.body;
  if (!directory) return res.status(400).json({ error: 'directory required' });
  try {
    const report = await migration.migrateDirectory({ tenant_id: req.tenant_id || null, directory });
    if (report.error) return res.status(400).json(report);
    res.json({ success: true, report });
  } catch (err) {
    logger.error({ err }, 'Migration analysis failed');
    res.status(500).json({ error: 'Migration analysis failed' });
  }
});

// ── Pipelines ────────────────────────────────────────────────────────────────
app.get('/pipelines', authMiddleware, async (req, res) => {
  try {
    res.json({ data: await pipelines.listPipelines({ tenant_id: req.tenant_id || null, repo: req.query.repo }) });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch pipelines');
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

app.post('/pipelines', authMiddleware, requirePermission('pipelines:write'), async (req, res) => {
  const { name, stages } = req.body;
  if (!name || !Array.isArray(stages) || stages.length === 0) {
    return res.status(400).json({ error: 'name and at least one stage required' });
  }
  try {
    const pipeline = await pipelines.createPipeline({ tenant_id: req.tenant_id || null, ...req.body });
    broadcast({ type: 'pipeline_created', pipeline: { name } });
    res.json({ success: true, pipeline });
  } catch (err) {
    logger.error({ err }, 'Failed to create pipeline');
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

app.get('/pipelines/runs', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  try {
    const result = await pipelines.listPipelineRuns({
      pipeline_id: req.query.pipeline_id, tenant_id: req.tenant_id || null,
      status: req.query.status, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch pipeline runs');
    res.status(500).json({ error: 'Failed to fetch pipeline runs' });
  }
});

app.get('/pipelines/runs/:runId', authMiddleware, async (req, res) => {
  try {
    const run = await pipelines.getPipelineRun(req.params.runId, req.tenant_id || null);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch pipeline run');
    res.status(500).json({ error: 'Failed to fetch pipeline run' });
  }
});

app.post('/pipelines/runs/:runId/approve', authMiddleware, requirePermission('pipelines:approve'), async (req, res) => {
  try {
    const result = await pipelines.approveRun(req.params.runId, req.body.approved !== false, req.user?.login || 'api', req.tenant_id || null);
    if (result.error) return res.status(400).json(result);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to approve pipeline run');
    res.status(500).json({ error: 'Failed to approve pipeline run' });
  }
});

app.post('/pipelines/runs/:runId/cancel', authMiddleware, requirePermission('pipelines:run'), async (req, res) => {
  try {
    const result = await pipelines.cancelRun(req.params.runId, req.tenant_id || null);
    if (result.error) return res.status(400).json(result);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to cancel pipeline run');
    res.status(500).json({ error: 'Failed to cancel pipeline run' });
  }
});

app.get('/pipelines/:id', authMiddleware, async (req, res) => {
  try {
    const pipeline = await pipelines.getPipeline(req.params.id, req.tenant_id || null);
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
    res.json(pipeline);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch pipeline');
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

app.post('/pipelines/:id/run', authMiddleware, requirePermission('pipelines:run'), async (req, res) => {
  try {
    const pipeline = await pipelines.getPipeline(req.params.id, req.tenant_id || null);
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
    if (pipeline.enabled === 0) return res.status(400).json({ error: 'Pipeline is disabled' });
    const started = await pipelines.startPipelineRun(pipeline, req.tenant_id || null, req.user?.login || 'api');
    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'pipeline_run_start', resourceType: 'pipeline', resourceId: req.params.id,
      details: { run_id: started.run_id }, ipAddress: req.ip,
    });
    res.json({ success: true, ...started });
  } catch (err) {
    logger.error({ err }, 'Failed to start pipeline');
    res.status(500).json({ error: 'Failed to start pipeline' });
  }
});

app.patch('/pipelines/:id', authMiddleware, requirePermission('pipelines:write'), async (req, res) => {
  try {
    const pipeline = await pipelines.updatePipeline(req.params.id, req.body, req.tenant_id || null);
    res.json({ success: true, pipeline });
  } catch (err) {
    logger.error({ err }, 'Failed to update pipeline');
    res.status(500).json({ error: 'Failed to update pipeline' });
  }
});

app.delete('/pipelines/:id', authMiddleware, requirePermission('pipelines:write'), async (req, res) => {
  try {
    await pipelines.deletePipeline(req.params.id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete pipeline');
    res.status(500).json({ error: 'Failed to delete pipeline' });
  }
});

// ── Incident Management ──
app.get('/incidents', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { status, severity } = req.query;

  try {
    const result = await listIncidents({
      tenant_id: req.tenant_id || null,
      status, severity, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch incidents');
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.post('/incidents', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { title, description, severity, status, repo_name, stack_name, workflow_name } = req.body;
  if (!title || !severity || !status) {
    return res.status(400).json({ error: 'title, severity, status required' });
  }

  try {
    const incident = await createIncident({
      tenant_id: req.tenant_id || null,
      title, description, severity, status,
      repo_name, stack_name, workflow_name,
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'incident_create',
      resourceType: 'incident',
      resourceId: String(incident.id),
      details: { title, severity, status, repo_name, stack_name },
      ipAddress: req.ip,
    });

    res.json({ success: true, incident });
  } catch (err) {
    logger.error({ err }, 'Failed to create incident');
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

app.get('/incidents/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const incident = await getIncident(id, req.tenant_id || null);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch incident');
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

app.patch('/incidents/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  const { status, severity, description, resolved_at } = req.body;

  try {
    await updateIncident(id, { status, severity, description, resolved_at }, req.tenant_id || null);

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'incident_update',
      resourceType: 'incident',
      resourceId: id,
      details: { status, severity, description, resolved_at },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update incident');
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

app.delete('/incidents/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  try {
    await deleteIncident(id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete incident');
    res.status(500).json({ error: 'Failed to delete incident' });
  }
});

// ── Secrets Management ──
app.get('/secrets', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { provider, scope } = req.query;

  try {
    const result = await listSecrets({
      tenant_id: req.tenant_id || null,
      provider, scope, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch secrets');
    res.status(500).json({ error: 'Failed to fetch secrets' });
  }
});

app.post('/secrets', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { name, value, provider, scope } = req.body;
  if (!name || !value || !provider || !scope) {
    return res.status(400).json({ error: 'name, value, provider, scope required' });
  }

  try {
    const secret = await createSecret({
      tenant_id: req.tenant_id || null,
      name, value, provider, scope,
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'secret_create',
      resourceType: 'secret',
      resourceId: String(secret.id),
      details: { name, provider, scope },
      ipAddress: req.ip,
    });

    res.json({ success: true, secret });
  } catch (err) {
    logger.error({ err }, 'Failed to create secret');
    res.status(500).json({ error: 'Failed to create secret' });
  }
});

app.get('/secrets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const secret = await getSecret(id, req.tenant_id || null);
    if (!secret) return res.status(404).json({ error: 'Secret not found' });
    res.json(secret);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch secret');
    res.status(500).json({ error: 'Failed to fetch secret' });
  }
});

app.patch('/secrets/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  const { name, value, provider, scope } = req.body;

  try {
    await updateSecret(id, { name, value, provider, scope }, req.tenant_id || null);

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'secret_update',
      resourceType: 'secret',
      resourceId: id,
      details: { name, provider, scope },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update secret');
    res.status(500).json({ error: 'Failed to update secret' });
  }
});

app.delete('/secrets/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  try {
    await deleteSecret(id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete secret');
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

// ── Configuration Management ──
app.get('/configuration/runs', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { repo, tool, conclusion } = req.query;

  try {
    const result = await listConfigRuns({
      tenant_id: req.tenant_id || null,
      repo, tool, conclusion, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch config runs');
    res.status(500).json({ error: 'Failed to fetch config runs' });
  }
});

app.post('/configuration/runs', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { repo_name, tool, playbook, inventory, status, conclusion, output_url } = req.body;
  if (!repo_name || !tool || !playbook) {
    return res.status(400).json({ error: 'repo_name, tool, playbook required' });
  }

  try {
    recordConfigRun({
      tenant_id: req.tenant_id || null,
      repo_name, tool, playbook, inventory: inventory || '',
      status: status || 'completed',
      conclusion: conclusion || 'success',
      output_url: output_url || '',
      triggeredBy: req.user?.login || 'ci',
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'ci',
      action: 'configuration_run_recorded',
      resourceType: 'configuration_run',
      resourceId: 'ci',
      details: { tool, playbook, inventory, status, conclusion, repo_name },
      ipAddress: req.ip,
    });

    res.json({ success: true, recorded: true });
  } catch (err) {
    logger.error({ err }, 'Failed to record config run');
    res.status(500).json({ error: 'Failed to record config run' });
  }
});

// ── DORA Metrics ──
app.get('/dora/metrics', authMiddleware, async (req, res) => {
  const { repo } = req.query;
  const isSaas = process.env.SAAS_MODE === 'true';
  const isPostgres = !!process.env.DATABASE_URL;
  const nowSql = isPostgres ? "NOW() - INTERVAL '30 days'" : "datetime('now', '-30 days')";

  const conditions = [];
  const params = [];
  if (isSaas) { conditions.push('tenant_id = ?'); params.push(req.tenant_id); }
  if (repo) { conditions.push('repo_name = ?'); params.push(repo); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Deployment frequency: successful infrastructure deploys per day (last 30 days)
    const deploySql = isPostgres
      ? `SELECT DATE(created_at) as day, COUNT(*) as deployments
         FROM infrastructure_runs
         ${where} AND conclusion = 'success' AND created_at >= ${nowSql}
         GROUP BY DATE(created_at) ORDER BY day ASC`
      : `SELECT DATE(created_at) as day, COUNT(*) as deployments
         FROM infrastructure_runs
         ${where} AND conclusion = 'success' AND created_at >= ${nowSql}
         GROUP BY DATE(created_at) ORDER BY day ASC`;

    const deployResult = await db.query(deploySql, params);

    // Change failure rate: failed / total deployments
    const totalDeploys = await db.query(
      `SELECT COUNT(*) as cnt FROM infrastructure_runs ${where} AND created_at >= ${nowSql}`,
      params
    );
    const failedDeploys = await db.query(
      `SELECT COUNT(*) as cnt FROM infrastructure_runs ${where} AND conclusion = 'failure' AND created_at >= ${nowSql}`,
      params
    );

    const total = parseInt(totalDeploys.rows[0]?.cnt ?? 0, 10);
    const failed = parseInt(failedDeploys.rows[0]?.cnt ?? 0, 10);
    const changeFailureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';

    // MTTR from events
    const mttrResult = await db.query(
      `SELECT AVG(mttr_seconds) as avg_mttr FROM events ${where} AND mttr_seconds IS NOT NULL`,
      params
    );
    const avgMttr = mttrResult.rows[0]?.avg_mttr ? Math.round(parseFloat(mttrResult.rows[0].avg_mttr)) : null;

    res.json({
      deployment_frequency: deployResult.rows.map((d) => ({ day: d.day, deployments: parseInt(d.deployments, 10) })),
      change_failure_rate: changeFailureRate,
      total_deployments: total,
      failed_deployments: failed,
      avg_mttr_seconds: avgMttr,
      avg_mttr_formatted: avgMttr
        ? (avgMttr < 60 ? `${avgMttr}s` : avgMttr < 3600 ? `${Math.round(avgMttr / 60)}m` : `${(avgMttr / 3600).toFixed(1)}h`)
        : '—',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch DORA metrics');
    res.status(500).json({ error: 'Failed to fetch DORA metrics' });
  }
});

// ── Policy Engine ──
app.get('/policies', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { enabled } = req.query;

  try {
    const result = await listPolicies({
      tenant_id: req.tenant_id || null,
      enabled, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch policies');
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

app.post('/policies', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { name, description, condition, action, requires_approval, enabled } = req.body;
  if (!name || !condition || !action) {
    return res.status(400).json({ error: 'name, condition, action required' });
  }

  try {
    const policy = await createPolicy({
      tenant_id: req.tenant_id || null,
      name, description, condition, action,
      requires_approval: requires_approval === true,
      enabled: enabled !== false,
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'policy_create',
      resourceType: 'policy',
      resourceId: String(policy.id),
      details: { name, condition, action, requires_approval, enabled },
      ipAddress: req.ip,
    });

    res.json({ success: true, policy });
  } catch (err) {
    logger.error({ err }, 'Failed to create policy');
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

app.get('/policies/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const policy = await getPolicy(id, req.tenant_id || null);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch policy');
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

app.patch('/policies/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  const { name, description, condition, action, requires_approval, enabled } = req.body;

  try {
    await updatePolicy(id, { name, description, condition, action, requires_approval, enabled }, req.tenant_id || null);

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'policy_update',
      resourceType: 'policy',
      resourceId: id,
      details: { name, description, condition, action, requires_approval, enabled },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update policy');
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

app.delete('/policies/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  try {
    await deletePolicy(id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete policy');
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

// ── Failure Fingerprinting ──
app.get('/fingerprints', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { category } = req.query;

  try {
    const result = await listFingerprints({
      tenant_id: req.tenant_id || null,
      category, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch fingerprints');
    res.status(500).json({ error: 'Failed to fetch fingerprints' });
  }
});

app.post('/fingerprints', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { fingerprint_hash, category, category_label, root_cause, suggested_fix, occurrence_count, first_seen, last_seen, repositories, workflows, confidence_score } = req.body;
  if (!fingerprint_hash || !category) {
    return res.status(400).json({ error: 'fingerprint_hash and category required' });
  }

  try {
    const fp = await upsertFingerprint({
      tenant_id: req.tenant_id || null,
      fingerprint_hash, category, category_label, root_cause, suggested_fix,
      occurrence_count, first_seen, last_seen, repositories, workflows, confidence_score,
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'fingerprint_upsert',
      resourceType: 'failure_fingerprint',
      resourceId: String(fp.id),
      details: { fingerprint_hash, category, occurrence_count },
      ipAddress: req.ip,
    });

    res.json({ success: true, fingerprint: fp });
  } catch (err) {
    logger.error({ err }, 'Failed to upsert fingerprint');
    res.status(500).json({ error: 'Failed to upsert fingerprint' });
  }
});

// ── Automated Remediation ──
app.get('/remediation/actions', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { status, fingerprint_hash, incident_id } = req.query;

  try {
    const result = await listRemediationActions({
      tenant_id: req.tenant_id || null,
      status, fingerprint_hash, incident_id, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch remediation actions');
    res.status(500).json({ error: 'Failed to fetch remediation actions' });
  }
});

app.post('/remediation/actions', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { fingerprint_hash, incident_id, action_type, action_name, status, requires_approval } = req.body;
  if (!fingerprint_hash || !action_type || !action_name) {
    return res.status(400).json({ error: 'fingerprint_hash, action_type, action_name required' });
  }

  try {
    const action = await createRemediationAction({
      tenant_id: req.tenant_id || null,
      fingerprint_hash, incident_id, action_type, action_name,
      status: status || 'pending',
      requires_approval: requires_approval === true,
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'remediation_action_create',
      resourceType: 'remediation_action',
      resourceId: String(action.id),
      details: { fingerprint_hash, incident_id, action_type, action_name, status },
      ipAddress: req.ip,
    });

    res.json({ success: true, action });
  } catch (err) {
    logger.error({ err }, 'Failed to create remediation action');
    res.status(500).json({ error: 'Failed to create remediation action' });
  }
});

app.get('/remediation/actions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const action = await getRemediationAction(id, req.tenant_id || null);
    if (!action) return res.status(404).json({ error: 'Remediation action not found' });
    res.json(action);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch remediation action');
    res.status(500).json({ error: 'Failed to fetch remediation action' });
  }
});

app.patch('/remediation/actions/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  const { status, result, error_message, executed_at, approved_by, approved_at } = req.body;

  try {
    await updateRemediationAction(id, { status, result, error_message, executed_at, approved_by, approved_at }, req.tenant_id || null);

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'remediation_action_update',
      resourceType: 'remediation_action',
      resourceId: id,
      details: { status, result, error_message, executed_at, approved_by, approved_at },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update remediation action');
    res.status(500).json({ error: 'Failed to update remediation action' });
  }
});

app.delete('/remediation/actions/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  try {
    await deleteRemediationAction(id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete remediation action');
    res.status(500).json({ error: 'Failed to delete remediation action' });
  }
});

// ── Predictive Analytics ──
app.get('/predictions', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { risk_level, resolved } = req.query;

  try {
    const result = await listPredictions({
      tenant_id: req.tenant_id || null,
      risk_level,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch predictions');
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

app.post('/predictions', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { repo_name, workflow_name, stack_name, prediction_type, target_entity, probability, risk_level, reasons, recommended_action, expires_at } = req.body;
  if (!prediction_type || !target_entity || probability === undefined || !risk_level) {
    return res.status(400).json({ error: 'prediction_type, target_entity, probability, risk_level required' });
  }

  try {
    const prediction = await createPrediction({
      tenant_id: req.tenant_id || null,
      repo_name, workflow_name, stack_name, prediction_type, target_entity,
      probability, risk_level, reasons, recommended_action, expires_at,
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'prediction_create',
      resourceType: 'prediction',
      resourceId: String(prediction.id),
      details: { prediction_type, target_entity, probability, risk_level },
      ipAddress: req.ip,
    });

    res.json({ success: true, prediction });
  } catch (err) {
    logger.error({ err }, 'Failed to create prediction');
    res.status(500).json({ error: 'Failed to create prediction' });
  }
});

app.get('/predictions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const prediction = await getPrediction(id, req.tenant_id || null);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json(prediction);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch prediction');
    res.status(500).json({ error: 'Failed to fetch prediction' });
  }
});

app.patch('/predictions/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  const { resolved, resolved_at } = req.body;

  try {
    await updatePrediction(id, { resolved, resolved_at }, req.tenant_id || null);

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'prediction_update',
      resourceType: 'prediction',
      resourceId: id,
      details: { resolved, resolved_at },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update prediction');
    res.status(500).json({ error: 'Failed to update prediction' });
  }
});

app.delete('/predictions/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  try {
    await deletePrediction(id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete prediction');
    res.status(500).json({ error: 'Failed to delete prediction' });
  }
});

// ── Drift Detection ──
app.get('/drift/events', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { status, severity, engine } = req.query;

  try {
    const result = await listDriftEvents({
      tenant_id: req.tenant_id || null,
      status, severity, engine, page, limit,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch drift events');
    res.status(500).json({ error: 'Failed to fetch drift events' });
  }
});

app.post('/drift/detect', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  try {
    const results = await driftDetector.detectAllStacksDrift();
    broadcast({ type: 'new_drift_event', event: { count: results.length, detected_at: new Date().toISOString() } });
    res.json({ success: true, results });
  } catch (err) {
    logger.error({ err }, 'Manual drift detection failed');
    res.status(500).json({ error: 'Failed to run drift detection' });
  }
});

app.post('/drift/events', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { repo_name, stack_name, engine, drift_type, resource_type, resource_name, expected_state, actual_state, status, severity, source_commit, recommended_action } = req.body;
  if (!repo_name || !stack_name || !engine || !drift_type || !resource_type || !resource_name) {
    return res.status(400).json({ error: 'repo_name, stack_name, engine, drift_type, resource_type, resource_name required' });
  }

  try {
    const drift = await createDriftEvent({
      tenant_id: req.tenant_id || null,
      repo_name, stack_name, engine, drift_type, resource_type, resource_name,
      expected_state, actual_state, status, severity, source_commit, recommended_action,
    });

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'drift_event_create',
      resourceType: 'drift_event',
      resourceId: String(drift.id),
      details: { engine, drift_type, resource_type, resource_name, status, severity },
      ipAddress: req.ip,
    });

    res.json({ success: true, drift });
  } catch (err) {
    logger.error({ err }, 'Failed to create drift event');
    res.status(500).json({ error: 'Failed to create drift event' });
  }
});

app.get('/drift/events/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const drift = await getDriftEvent(id, req.tenant_id || null);
    if (!drift) return res.status(404).json({ error: 'Drift event not found' });
    res.json(drift);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch drift event');
    res.status(500).json({ error: 'Failed to fetch drift event' });
  }
});

app.patch('/drift/events/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  const { status, severity, resolved_at } = req.body;

  try {
    await updateDriftEvent(id, { status, severity, resolved_at }, req.tenant_id || null);

    await logAuditEvent({
      userId: req.user?.id || null, username: req.user?.login || 'unknown',
      action: 'drift_event_update',
      resourceType: 'drift_event',
      resourceId: id,
      details: { status, severity, resolved_at },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to update drift event');
    res.status(500).json({ error: 'Failed to update drift event' });
  }
});

app.delete('/drift/events/:id', authMiddleware, requirePermission('infrastructure:run'), async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDriftEvent(id, req.tenant_id || null);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete drift event');
    res.status(500).json({ error: 'Failed to delete drift event' });
  }
});

// ── OpenAPI Spec ──
app.get('/openapi.yaml', (req, res) => {
  res.set('Content-Type', 'application/yaml');
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

// Serve infra log files
app.use('/infra-logs', express.static(LOG_DIR));

// GitHub OAuth
app.post('/auth/github', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      { client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = response.data;
    if (!access_token) return res.status(400).json({ error: 'Failed to retrieve access token' });

    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const githubUser = userRes.data;
    const github_id = String(githubUser.id);
    
    // Check if user exists
    let dbUser = await db.query('SELECT * FROM users WHERE github_id = ?', [github_id]);
    
    if (!dbUser.rows || dbUser.rows.length === 0) {
      let tenant_id = null;
      if (isSaas) {
        // Create new tenant
        const webhook_secret = crypto.randomBytes(32).toString('hex');
        const tenantName = `${githubUser.login}'s Workspace`;
        await db.query('INSERT INTO tenants (name, webhook_secret) VALUES (?, ?)', [tenantName, webhook_secret]);
        // Get inserted tenant id (assuming last_insert_rowid or returning id)
        const tResult = await db.query('SELECT id FROM tenants WHERE webhook_secret = ?', [webhook_secret]);
        if (tResult.rows.length > 0) tenant_id = tResult.rows[0].id;
      }
      // Create user
      await db.query('INSERT INTO users (github_id, username, avatar_url, tenant_id) VALUES (?, ?, ?, ?)', 
        [github_id, githubUser.login, githubUser.avatar_url, tenant_id]
      );
    }

    res.cookie('github_token', access_token, getTokenCookieOptions());

    // Log the audit event
    await logAuditEvent({
      userId: null, // Will be set after user lookup
      username: githubUser.login,
      action: 'user_login',
      resourceType: 'auth',
      resourceId: github_id,
      details: { login: githubUser.login, avatar_url: githubUser.avatar_url },
      ipAddress: req.ip,
    });

    res.json({
      user: { login: githubUser.login, avatar_url: githubUser.avatar_url },
    });
  } catch (err) {
    logger.error({ err }, 'Auth failed');
    res.status(500).json({ error: 'Auth failed' });
  }
});

// ── SSO / SAML / OIDC ──
app.get('/auth/sso/config', authMiddleware, (req, res) => {
  const ssoEnabled = process.env.SSO_ENABLED === 'true';
  res.json({
    enabled: ssoEnabled,
    provider: ssoEnabled ? process.env.SSO_PROVIDER || 'okta' : null,
    issuerUrl: ssoEnabled ? process.env.SSO_ISSUER_URL || null : null,
    attributeEmail: ssoEnabled ? process.env.SSO_ATTRIBUTE_EMAIL || 'email' : 'email',
    attributeName: ssoEnabled ? process.env.SSO_ATTRIBUTE_NAME || 'name' : 'name',
    attributeGroups: ssoEnabled ? process.env.SSO_ATTRIBUTE_GROUPS || 'groups' : 'groups',
  });
});

app.get('/auth/sso', async (req, res) => {
  const ssoEnabled = process.env.SSO_ENABLED === 'true';
  if (!ssoEnabled) {
    return res.status(400).json({ error: 'SSO is not enabled. Set SSO_ENABLED=true.' });
  }

  const provider = process.env.SSO_PROVIDER || 'okta';
  const issuerUrl = process.env.SSO_ISSUER_URL;
  const clientId = process.env.SSO_CLIENT_ID;
  const redirectUri = process.env.SSO_REDIRECT_URI || `${getApiBaseUrl()}/auth/sso/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in a simple in-memory store (in production, use Redis or signed cookie)
  if (!global._ssoStates) global._ssoStates = new Map();
  global._ssoStates.set(state, { redirectTo: req.query.redirectTo || '/' });

  let authUrl;
  if (provider === 'okta' || provider === 'generic-oidc') {
    const discoveryUrl = process.env.SSO_DISCOVERY_URL || `${issuerUrl}/.well-known/openid-configuration`;
    authUrl = `${discoveryUrl.includes('.well-known') ? discoveryUrl.split('/.well-known')[0] : issuerUrl}/authorize`;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'openid profile email groups',
      redirect_uri: redirectUri,
      state,
    });
    authUrl = `${authUrl}?${params.toString()}`;
  } else if (provider === 'azure-ad') {
    const tenant = process.env.SSO_TENANT_ID || 'common';
    authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'openid profile email User.Read',
      redirect_uri: redirectUri,
      state,
    });
    authUrl = `${authUrl}?${params.toString()}`;
  } else if (provider === 'google-workspace') {
    authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: redirectUri,
      state,
      access_type: 'offline',
    });
    authUrl = `${authUrl}?${params.toString()}`;
  } else {
    return res.status(400).json({ error: `Unsupported SSO provider: ${provider}` });
  }

  res.redirect(authUrl);
});

app.get('/auth/sso/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${getFrontendUrl()}/login?error=sso_denied`);
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  // Verify state
  if (!global._ssoStates || !global._ssoStates.has(state)) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  const stateData = global._ssoStates.get(state);
  global._ssoStates.delete(state);

  const provider = process.env.SSO_PROVIDER || 'okta';
  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const redirectUri = process.env.SSO_REDIRECT_URI || `${getApiBaseUrl()}/auth/sso/callback`;

  try {
    let tokenResponse;
    if (provider === 'okta' || provider === 'generic-oidc' || provider === 'azure-ad' || provider === 'google-workspace') {
      tokenResponse = await axios.post(
        provider === 'azure-ad'
          ? `https://login.microsoftonline.com/${process.env.SSO_TENANT_ID || 'common'}/oauth2/v2.0/token`
          : provider === 'google-workspace'
            ? 'https://oauth2.googleapis.com/token'
            : `${process.env.SSO_ISSUER_URL}/oauth2/default/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } else {
      return res.status(400).json({ error: `Unsupported SSO provider: ${provider}` });
    }

    const { access_token, id_token } = tokenResponse.data;

    // Fetch user info from OIDC userinfo endpoint
    let userInfo;
    if (provider === 'azure-ad') {
      const userRes = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      userInfo = userRes.data;
    } else if (provider === 'google-workspace') {
      const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      userInfo = userRes.data;
    } else {
      // Okta / generic OIDC
      const userRes = await axios.get(`${process.env.SSO_ISSUER_URL}/oauth2/default/userinfo`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      userInfo = userRes.data;
    }

    const email = userInfo[process.env.SSO_ATTRIBUTE_EMAIL || 'email'] || userInfo.email || userInfo.userPrincipalName || userInfo.name;
    const name = userInfo[process.env.SSO_ATTRIBUTE_NAME || 'name'] || userInfo.name || userInfo.displayName || email;
    const groups = userInfo[process.env.SSO_ATTRIBUTE_GROUPS || 'groups'] || [];

    const ssoId = String(userInfo.id || userInfo.sub || userInfo.oid || email);

    // Check if user exists
    let dbUser = await db.query('SELECT * FROM users WHERE sso_id = ?', [ssoId]);

    if (!dbUser.rows || dbUser.rows.length === 0) {
      let tenant_id = null;
      if (isSaas) {
        const webhook_secret = crypto.randomBytes(32).toString('hex');
        const tenantName = `${name}'s Workspace`;
        await db.query('INSERT INTO tenants (name, webhook_secret) VALUES (?, ?)', [tenantName, webhook_secret]);
        const tResult = await db.query('SELECT id FROM tenants WHERE webhook_secret = ?', [webhook_secret]);
        if (tResult.rows.length > 0) tenant_id = tResult.rows[0].id;
      }
      await db.query(
        'INSERT INTO users (sso_id, username, email, avatar_url, tenant_id, sso_provider) VALUES (?, ?, ?, ?, ?, ?)',
        [ssoId, name, email, userInfo.picture || userInfo.avatar_url || null, tenant_id, provider]
      );
    }

    res.cookie('github_token', access_token, getTokenCookieOptions());

    await logAuditEvent({
      userId: null,
      username: name,
      action: 'sso_login',
      resourceType: 'auth',
      resourceId: ssoId,
      details: { provider, email, name, groups },
      ipAddress: req.ip,
    });

    const redirectTo = stateData.redirectTo || '/';
    res.redirect(`${getFrontendUrl()}/${redirectTo}`);
  } catch (err) {
    logger.error({ err }, 'SSO auth failed');
    res.redirect(`${getFrontendUrl()}/login?error=sso_failed`);
  }
});

// Logout — clear auth cookie
app.post('/auth/logout', (req, res) => {
  res.clearCookie('github_token', { path: '/' });
  res.json({ success: true });
});

// Check if user is authenticated (reads from cookie)
app.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ authenticated: true, tenant_id: req.tenant_id || null });
});

// Audit Logs — get audit trail
app.get('/audit-logs', authMiddleware, requirePermission('audit_logs:read'), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const { action, startDate, endDate } = req.query;

  try {
    const result = await getAuditLogs({
      page,
      limit,
      action,
      startDate,
      endDate,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch audit logs');
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Users — list all users (admin only)
app.get('/users', authMiddleware, requirePermission('users:read'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, github_id, username, avatar_url, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch users');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Users — update user role (admin only)
app.put('/users/:id/role', authMiddleware, requirePermission('users:write'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!isValidRole(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be: viewer, developer, or admin' });
  }

  try {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    
    // Log the audit event
    await logAuditEvent({
      userId: req.user?.id || null,
      username: req.user?.login || 'unknown',
      action: 'role_change',
      resourceType: 'user',
      resourceId: id,
      details: { new_role: role },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (err) {
    logger.error({ err }, 'Failed to update user role');
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Roles — get all roles with permissions
app.get('/roles', authMiddleware, (req, res) => {
  res.json(getRoles());
});

// Triage — auto-assign failure owners based on CODEOWNERS or commits
app.post('/triage', authMiddleware, requirePermission('workflow:rerun'), async (req, res) => {
  const { run_url } = req.body;
  const token = req.token;

  if (!run_url) return res.status(400).json({ error: 'run_url required' });

  const match = run_url.match(/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
  if (!match) return res.status(400).json({ error: 'Invalid run_url format' });

  const [, owner, repo, runId] = match;

  try {
    const result = await triageFailure({
      owner,
      repo,
      runId: parseInt(runId),
      workflowName: null,
      token,
    });

    // Log the audit event
    await logAuditEvent({
      userId: req.user?.id || null,
      username: req.user?.login || 'unknown',
      action: 'auto_triage',
      resourceType: 'workflow_run',
      resourceId: `${owner}/${repo}/runs/${runId}`,
      details: { assignees: result.assignees, source: result.source, confidence: result.confidence },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      triage: result,
    });
  } catch (err) {
    logger.error({ err }, 'Triage failed');
    res.status(500).json({ error: 'Triage failed' });
  }
});

// LLM Analysis — analyze workflow failure logs
app.post('/analyze', authMiddleware, requirePermission('workflow:rerun'), async (req, res) => {
  const { run_url } = req.body;
  const token = req.token;

  if (!run_url) return res.status(400).json({ error: 'run_url required' });

  const match = run_url.match(/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
  if (!match) return res.status(400).json({ error: 'Invalid run_url format' });

  const [, owner, repo, runId] = match;

  // Check if LLM is configured
  const llmConfig = getLLMConfig();
  if (!llmConfig) {
    return res.status(400).json({ 
      error: 'LLM not configured. Set LLM_API_KEY environment variable.',
      configured: false,
    });
  }

  try {
    const result = await analyzeFailure({
      owner,
      repo,
      runId: parseInt(runId),
      token,
    });

    // Log the audit event
    await logAuditEvent({
      userId: req.user?.id || null,
      username: req.user?.login || 'unknown',
      action: 'log_analysis',
      resourceType: 'workflow_run',
      resourceId: `${owner}/${repo}/runs/${runId}`,
      details: { 
        success: result.success, 
        category: result.summary?.category,
        root_cause: result.summary?.root_cause,
      },
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Log analysis failed');
    res.status(500).json({ error: 'Log analysis failed' });
  }
});

// LLM Status — check if LLM is configured
app.get('/llm/status', authMiddleware, (req, res) => {
  const config = getLLMConfig();
  res.json({
    configured: !!config,
    provider: config?.provider || null,
    model: config?.model || null,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(port, async () => {
  logger.info(`Backend server listening at http://localhost:${port}`);
  await initAuditTable();
  startRetentionJob();
  startScheduler();
  startDriftDetector();
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed.');

    // Close all WebSocket connections
    wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });

    // Close database connections
    db.close?.(() => {
      logger.info('Database connections closed.');
      process.exit(0);
    });

    // If db.close doesn't exist (PostgreSQL), exit after timeout
    setTimeout(() => {
      logger.info('Shutdown timeout reached. Exiting.');
      process.exit(0);
    }, 5000);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
