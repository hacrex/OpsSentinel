const crypto = require('crypto');
const db = require('./db');
const { notifyAll } = require('./notifier');
const logger = require('./logger');

let _broadcast = null;
function setBroadcast(fn) { _broadcast = fn; }

function verifySignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    logger.warn('GITHUB_WEBHOOK_SECRET is not set. Skipping signature verification.');
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
async function computeMTTR(repo_name, workflow_name) {
  try {
    const result = await db.query(
      `SELECT created_at FROM events
       WHERE repo_name = ? AND workflow_name = ? AND conclusion = 'failure'
       ORDER BY created_at DESC LIMIT 1`,
      [repo_name, workflow_name]
    );
    if (!result.rows.length) return null;
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

      // Compute MTTR only when a failure is recovered (conclusion = success)
      const mttr_seconds = conclusion === 'success' ? await computeMTTR(repo_name, workflow_name) : null;

      db.run(
        `INSERT INTO events (repo_name, workflow_name, status, conclusion, run_url, mttr_seconds) VALUES (?, ?, ?, ?, ?, ?)`,
        [repo_name, workflow_name, status, conclusion, run_url, mttr_seconds],
        function (err) {
          if (err) {
            logger.error({ err }, 'Failed to insert event');
            return res.status(500).send('Database error');
          }

          const newEvent = { repo_name, workflow_name, status, conclusion, run_url, mttr_seconds };

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

module.exports = { verifySignature, handleWebhook, setBroadcast };
