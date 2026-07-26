const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { verifySignature, handleWebhook, setBroadcast } = require('./webhook');
const axios = require('axios');
const dotenv = require('dotenv');
const logger = require('./logger');
const validateEnv = require('./validateEnv');
const { startRetentionJob } = require('./retention');
const { notifyAll } = require('./notifier');
const { initAuditTable, logAuditEvent, getAuditLogs } = require('./audit');
const helmet = require('helmet');
const { authMiddleware } = require('./auth');
const { requirePermission, requireAnyPermission, getRoles, isValidRole } = require('./rbac');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

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

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.post('/webhook{/:tenant_id}', verifySignature, handleWebhook);

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

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(port, async () => {
  logger.info(`Backend server listening at http://localhost:${port}`);
  await initAuditTable();
  startRetentionJob();
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
