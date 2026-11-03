const crypto = require('crypto');
const db = require('./db');
const { notifyAll } = require('./notifier');
const logger = require('./logger');
const { recordInfraRun } = require('./infrastructure');

let _broadcast = null;
function setBroadcast(fn) { _broadcast = fn; }

const INFRA_KEYWORDS = ['tofu', 'opentofu', 'terraform', 'ansible', 'iac', 'infrastructure'];
const OPERATION_KEYWORDS = ['plan', 'apply', 'destroy', 'refresh'];

function isInfraWorkflow(workflowName) {
  const name = workflowName.toLowerCase();
  return INFRA_KEYWORDS.some((k) => name.includes(k));
}

function detectEngine(workflowName) {
  const name = workflowName.toLowerCase();
  if (name.includes('tofu') || name.includes('opentofu')) return 'tofu';
  if (name.includes('terraform')) return 'terraform';
  if (name.includes('ansible')) return 'ansible';
  return 'unknown';
}

function detectOperation(workflowName) {
  const name = workflowName.toLowerCase();
  for (const op of OPERATION_KEYWORDS) {
    if (name.includes(op)) return op;
  }
  return 'apply';
}

async function verifySignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const isSaas = process.env.SAAS_MODE === 'true';
  let secret = process.env.GITHUB_WEBHOOK_SECRET;
  let tenant_id = req.params.tenant_id || null;

  if (isSaas) {
    if (!tenant_id) return res.status(400).send('Tenant ID required for webhook in SaaS mode');
    try {
      // Use ? placeholder which works with both SQLite and PostgreSQL (via toPostgresSQL)
      const result = await db.query('SELECT webhook_secret FROM tenants WHERE id = ?', [tenant_id]);
      if (!result.rows || result.rows.length === 0) return res.status(404).send('Tenant not found');
      secret = result.rows[0].webhook_secret;
    } catch (err) {
      return res.status(500).send('Database error');
    }
  }

  req.tenant_id = tenant_id;

  if (!secret) {
    logger.warn('Webhook secret is not set. Skipping signature verification.');
    return next();
  }

  if (!signature) return res.status(401).send('No signature found');

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.rawBody);
  const digest = `sha256=${hmac.digest('hex')}`;

  try {
    const sigBuf = Buffer.from(signature);
    const digestBuf = Buffer.from(digest);
    if (sigBuf.length === digestBuf.length && crypto.timingSafeEqual(sigBuf, digestBuf)) {
      return next();
    }
    return res.status(401).send('Signatures did not match');
  } catch {
    return res.status(401).send('Signature verification failed');
  }
}

// Compute MTTR: find the last failure for this workflow and return seconds since it
async function computeMTTR(repo_name, workflow_name, tenant_id) {
  try {
    const isSaas = process.env.SAAS_MODE === 'true';
    const where = isSaas ? "repo_name = ? AND workflow_name = ? AND conclusion = 'failure' AND tenant_id = ?" : "repo_name = ? AND workflow_name = ? AND conclusion = 'failure'";
    const params = isSaas ? [repo_name, workflow_name, tenant_id] : [repo_name, workflow_name];

    const result = await db.query(
      `SELECT created_at FROM events WHERE ${where} ORDER BY created_at DESC LIMIT 1`,
      params
    );
    if (!result.rows || !result.rows.length) return null;
    const lastFailure = new Date(result.rows[0].created_at);
    return Math.round((Date.now() - lastFailure.getTime()) / 1000);
  } catch {
    return null;
  }
}

async function handleWebhook(req, res) {
  const event = req.headers['x-github-event'];

  if (event === 'ping') return res.status(200).send('pong');

  if (event === 'workflow_run') {
    const { action, workflow_run, repository } = req.body;

    if (!workflow_run || !repository || !repository.full_name) {
      logger.warn('Invalid webhook payload: missing workflow_run or repository');
      return res.status(400).send('Invalid payload');
    }

    if (action === 'completed') {
      const repo_name = repository.full_name;
      const workflow_name = workflow_run.name || 'Unknown';
      const status = workflow_run.status || 'unknown';
      const conclusion = workflow_run.conclusion || null;
      const run_url = workflow_run.html_url || '';

      // Infrastructure CI/CD-first: detect infra-related workflows and record as infrastructure runs
      if (isInfraWorkflow(workflow_name)) {
        const engine = detectEngine(workflow_name);
        const operation = detectOperation(workflow_name);

        recordInfraRun({
          tenant_id: req.tenant_id || null,
          repo_name,
          stack_name: workflow_name,
          engine,
          operation,
          status,
          conclusion,
          output_url: run_url,
          triggeredBy: 'ci',
        });

        return res.status(200).send('Infrastructure run recorded');
      }

      // Compute MTTR only when a failure is recovered (conclusion = success)
      const mttr_seconds = conclusion === 'success' ? await computeMTTR(repo_name, workflow_name, req.tenant_id) : null;

      db.run(
        `INSERT INTO events (tenant_id, repo_name, workflow_name, status, conclusion, run_url, mttr_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.tenant_id, repo_name, workflow_name, status, conclusion, run_url, mttr_seconds],
        function (err) {
          if (err) {
            logger.error({ err }, 'Failed to insert event');
            return res.status(500).send('Database error');
          }

          const newEvent = { tenant_id: req.tenant_id, repo_name, workflow_name, status, conclusion, run_url, mttr_seconds };

          if (_broadcast) _broadcast({ type: 'new_event', event: newEvent });

          if (conclusion === 'failure') {
            notifyAll(newEvent);
          }

          res.status(200).send('Event processed');
        }
      );
      return;
    }
  }

  res.status(200).send('Event ignored');
}

// ── GitLab CI Webhook ──
async function handleGitLabWebhook(req, res) {
  const event = req.headers['x-gitlab-event'];

  if (event === 'Pipeline Hook') {
    const { object_kind, status, ref, sha, web_url, project } = req.body;

    if (!object_kind || !project || !project.path_with_namespace) {
      logger.warn('Invalid GitLab webhook payload: missing project');
      return res.status(400).send('Invalid payload');
    }

    if (object_kind === 'pipeline') {
      const repo_name = project.path_with_namespace;
      const pipelineStatus = status || 'unknown';
      const conclusion = pipelineStatus === 'failed' ? 'failure' : pipelineStatus === 'canceled' ? 'cancelled' : 'success';
      const run_url = web_url || '';
      const pipelineName = `Pipeline ${ref}`;

      // Detect infra-related pipelines
      if (isInfraWorkflow(pipelineName)) {
        const engine = detectEngine(pipelineName);
        const operation = detectOperation(pipelineName);

        recordInfraRun({
          tenant_id: req.tenant_id || null,
          repo_name,
          stack_name: pipelineName,
          engine,
          operation,
          status: pipelineStatus,
          conclusion,
          output_url: run_url,
          triggeredBy: 'gitlab-ci',
        });

        return res.status(200).send('GitLab infrastructure pipeline recorded');
      }

      db.run(
        `INSERT INTO events (tenant_id, repo_name, workflow_name, status, conclusion, run_url, mttr_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.tenant_id, repo_name, pipelineName, pipelineStatus, conclusion, run_url, null],
        function (err) {
          if (err) {
            logger.error({ err }, 'Failed to insert GitLab event');
            return res.status(500).send('Database error');
          }

          const newEvent = { tenant_id: req.tenant_id, repo_name, workflow_name: pipelineName, status: pipelineStatus, conclusion, run_url };

          if (_broadcast) _broadcast({ type: 'new_event', event: newEvent });

          if (conclusion === 'failure') {
            notifyAll(newEvent);
          }

          res.status(200).send('GitLab event processed');
        }
      );
      return;
    }
  }

  res.status(200).send('Event ignored');
}

module.exports = { verifySignature, handleWebhook, setBroadcast, computeMTTR, handleGitLabWebhook };
