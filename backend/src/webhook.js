const crypto = require('crypto');
const db = require('./db');
const { notifyAll } = require('./notifier');

function verifySignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET is not set. Skipping signature verification.');
    return next();
  }

  if (!signature) {
    return res.status(401).send('No signature found');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.rawBody);
  const digest = `sha256=${hmac.digest('hex')}`;

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    return next();
  } else {
    return res.status(401).send('Signatures did not match');
  }
}

async function handleWebhook(req, res) {
  const event = req.headers['x-github-event'];
  
  if (event === 'ping') {
    return res.status(200).send('pong');
  }
  
  if (event === 'workflow_run') {
    const { action, workflow_run, repository } = req.body;
    
    if (action === 'completed') {
      const repo_name = repository.full_name;
      const workflow_name = workflow_run.name;
      const status = workflow_run.status;
      const conclusion = workflow_run.conclusion;
      const run_url = workflow_run.html_url;

      db.run(
        `INSERT INTO events (repo_name, workflow_name, status, conclusion, run_url) VALUES (?, ?, ?, ?, ?)`,
        [repo_name, workflow_name, status, conclusion, run_url],
        function(err) {
          if (err) {
            console.error('Failed to insert event:', err);
            return res.status(500).send('Database error');
          }
          
          if (conclusion === 'failure') {
            notifyAll({ repo_name, workflow_name, status, conclusion, run_url });
          }
          
          res.status(200).send('Event processed');
        }
      );
      return;
    }
  }

  res.status(200).send('Event ignored');
}

module.exports = { verifySignature, handleWebhook };
