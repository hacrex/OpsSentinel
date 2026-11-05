const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { logAuditEvent } = require('./audit');
const { inc } = require('./metrics');
const logger = require('./logger');

/**
 * Drift Detection Engine.
 *
 * For each stack it runs the engine's plan/preview operation and parses
 * the result to detect infrastructure drift (resources whose actual state
 * differs from the code-defined expected state). Drift events are written
 * to `drift_events` and broadcast over WebSocket.
 *
 * Supported engines: tofu, terraform, pulumi, crossplane (kubectl), aws-cdk, bicep.
 */

const DRIFT_INTERVAL_MS = parseInt(process.env.DRIFT_INTERVAL_MS || '3600000', 10); // 1h default

let driftTimer = null;

function buildDriftArgs(engine, stack) {
  const vars = stack.default_vars ? (typeof stack.default_vars === 'string' ? JSON.parse(stack.default_vars) : stack.default_vars) : {};
  const cwd = stack.working_dir || `./infra/${stack.stack_name}`;

  if (engine === 'tofu' || engine === 'terraform') {
    const args = ['plan', '-detailed-exitcode', '-no-color', '-input=false'];
    Object.entries(vars).forEach(([k, v]) => { args.push('-var', `${k}=${v}`); });
    return { cmd: engine, args, cwd };
  }

  if (engine === 'pulumi') {
    const args = ['preview', '--no-color', '--suppress-output'];
    if (vars.stack) args.push('--stack', vars.stack);
    return { cmd: 'pulumi', args, cwd };
  }

  if (engine === 'crossplane') {
    const resource = vars.resource || '';
    return { cmd: 'kubectl', args: ['get', resource], cwd };
  }

  if (engine === 'aws-cdk') {
    return { cmd: 'cdk', args: ['diff'], cwd };
  }

  if (engine === 'bicep') {
    const rg = vars.resource_group || 'default';
    return { cmd: 'az', args: ['deployment', 'group', 'what-if', '--resource-group', rg], cwd };
  }

  return null;
}

function parsePlanOutput(output, engine) {
  const lines = output.split('\n');
  const resources = { added: 0, changed: 0, destroyed: 0, unchanged: 0 };
  const details = [];

  if (engine === 'tofu' || engine === 'terraform') {
    // "Plan: N to add, N to change, N to destroy."
    const summary = lines.find((l) => /^Plan:/.test(l));
    if (summary) {
      const mAdd = summary.match(/(\d+) to add/);
      const mChg = summary.match(/(\d+) to change/);
      const mDes = summary.match(/(\d+) to destroy/);
      resources.added = parseInt(mAdd?.[1] ?? '0', 10);
      resources.changed = parseInt(mChg?.[1] ?? '0', 10);
      resources.destroyed = parseInt(mDes?.[1] ?? '0', 10);
    }
    // Capture resource diff lines
    const diffLines = lines.filter((l) => /^[+\-~]/.test(l.trim()) && !l.startsWith('  '));
    details.push(...diffLines.slice(0, 50));
  } else if (engine === 'pulumi') {
    const summary = lines.find((l) => /changes:/i.test(l));
    resources.changed = summary ? parseInt(summary.match(/(\d+)/)?.[1] ?? '0', 10) : 0;
  } else if (engine === 'aws-cdk') {
    resources.changed = output.includes('There were differences') ? 1 : 0;
    details.push(output.slice(0, 1000));
  } else if (engine === 'bicep') {
    resources.changed = output.includes('What-if results') || output.includes('changes') ? 1 : 0;
  }

  const totalDrift = resources.added + resources.changed + resources.destroyed;
  return { totalDrift, resources, details: details.join('\n') };
}

async function detectStackDrift(stack, tenant_id) {
  const drift = buildDriftArgs(stack.engine, stack);
  if (!drift) return null;

  const logFile = path.join(process.env.INFRA_LOG_DIR || path.join(__dirname, '../../infra-logs'), `drift-${stack.stack_name}-${Date.now()}.log`);
  const writeStream = fs.createWriteStream(logFile);

  return new Promise((resolve) => {
    const child = spawn(drift.cmd, drift.args, { cwd: drift.cwd, env: { ...process.env } });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d; writeStream.write(d); });
    child.stderr.on('data', (d) => { stderr += d; writeStream.write(d); });

    child.on('close', async (code) => {
      writeStream.end();
      const output = stdout + stderr;
      const parsed = parsePlanOutput(output, stack.engine);
      const hasDrift = parsed.totalDrift > 0 || (code !== 0 && code !== 1 && code !== 2);

      // Exit codes: 0 = no changes, 1 = error, 2 = changes (terraform/tofu)
      const driftCode = engineExitCode(code, stack.engine);
      const status = driftCode === 'changes' ? 'detected' : driftCode === 'error' ? 'error' : 'none';

      try {
        await db.query(
          `INSERT INTO drift_events (tenant_id, repo_name, stack_name, engine, drift_type, resource_type, resource_name, expected_state, actual_state, status, severity, source_commit, recommended_action, detected_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenant_id, stack.repo_name, stack.stack_name, stack.engine,
            'infrastructure', 'all', 'all',
            'code-defined', JSON.stringify(parsed.resources),
            status,
            parsed.totalDrift > 0 ? 'high' : 'low',
            null,
            parsed.totalDrift > 0 ? 'Run tofu/terraform apply to converge' : null,
            new Date().toISOString(),
          ]
        );
        inc('drift_events_total', { engine: stack.engine, status });
        logger.info({ stack: stack.stack_name, engine: stack.engine, drift: parsed.totalDrift, status }, 'drift detection complete');
      } catch (err) {
        logger.error({ err, stack: stack.stack_name }, 'failed to record drift event');
      }

      resolve({ stack: stack.stack_name, drift: parsed.totalDrift, status, details: parsed.details, output_url: `/infra-logs/${path.basename(logFile)}` });
    });

    child.on('error', (err) => {
      writeStream.end();
      logger.warn({ err, stack: stack.stack_name }, 'drift detection spawn failed');
      resolve({ stack: stack.stack_name, drift: 0, status: 'error', error: err.message });
    });
  });
}

function engineExitCode(code, engine) {
  if (engine === 'pulumi' || engine === 'crossplane' || engine === 'aws-cdk' || engine === 'bicep') {
    return code === 0 ? 'none' : 'error';
  }
  // terraform / tofu
  if (code === 0) return 'none';
  if (code === 2) return 'changes';
  return 'error';
}

async function detectAllStacksDrift() {
  const stacks = await db.query(`SELECT * FROM stacks ORDER BY created_at DESC`);
  const results = [];
  for (const row of stacks.rows || []) {
    try {
      const result = await detectStackDrift(row, row.tenant_id ?? null);
      if (result) results.push(result);
    } catch (err) {
      logger.error({ err, stack: row.stack_name }, 'drift detection failed for stack');
    }
  }
  return results;
}

function startDriftDetector(intervalMs = DRIFT_INTERVAL_MS) {
  if (driftTimer) return driftTimer;
  // Run once immediately, then on interval
  detectAllStacksDrift().catch((err) => logger.error({ err }, 'initial drift detection failed'));
  driftTimer = setInterval(() => {
    detectAllStacksDrift().catch((err) => logger.error({ err }, 'drift detection tick failed'));
  }, intervalMs);
  logger.info({ interval_ms: intervalMs }, 'drift detector started');
  return driftTimer;
}

function stopDriftDetector() {
  if (driftTimer) {
    clearInterval(driftTimer);
    driftTimer = null;
  }
}

module.exports = { detectStackDrift, detectAllStacksDrift, startDriftDetector, stopDriftDetector, buildDriftArgs, parsePlanOutput };
