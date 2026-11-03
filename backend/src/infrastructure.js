const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { notifyAll } = require('./notifier');
const logger = require('./logger');
const { logAuditEvent } = require('./audit');

let _broadcast = null;
function setBroadcast(fn) { _broadcast = fn; }

const LOG_DIR = path.resolve(process.env.INFRA_LOG_DIR || path.join(__dirname, '../../infra-logs'));
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function buildArgs(engine, operation, vars) {
  if (engine === 'ansible') {
    const args = [];
    if (vars.inventory) args.push('-i', vars.inventory);
    if (vars.extraVars) args.push('-e', vars.extraVars);
    args.push(vars.playbook || 'site.yml');
    return args;
  }
  const cmdEngine = engine === 'terraform' ? 'terraform' : 'tofu';
  const args = [operation];
  if (operation === 'plan' || operation === 'apply') {
    Object.entries(vars || {}).forEach(([k, v]) => { args.push('-var', `${k}=${v}`); });
  }
  if (operation === 'apply') args.push('-auto-approve');
  return { cmd: cmdEngine, args };
}

async function runOperation({ tenant_id, repo_name, stack_name, engine, operation, workingDir, vars = {}, triggeredBy }) {
  const logFile = path.join(LOG_DIR, `${stack_name}-${operation}-${Date.now()}.log`);
  const writeStream = fs.createWriteStream(logFile);

  const { cmd, args } = buildArgs(engine, operation, vars);
  const child = spawn(cmd, args, { cwd: workingDir, env: { ...process.env } });

  child.stdout.on('data', (d) => { writeStream.write(d); });
  child.stderr.on('data', (d) => { writeStream.write(d); });

  return new Promise((resolve) => {
    child.on('close', async (code) => {
      writeStream.end();
      const conclusion = code === 0 ? 'success' : 'failure';
      const status = 'completed';
      const output_url = `/infra-logs/${path.basename(logFile)}`;

      db.run(
        `INSERT INTO infrastructure_runs (tenant_id, repo_name, stack_name, engine, operation, status, conclusion, output_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenant_id, repo_name, stack_name, engine, operation, status, conclusion, output_url],
        function (err) {
          if (err) {
            logger.error({ err }, 'Failed to insert infrastructure run');
            return resolve({ error: 'db_error' });
          }

          const run = {
            id: this.lastID,
            tenant_id, repo_name, stack_name, engine, operation, status, conclusion,
            output_url, mttr_seconds: null, created_at: new Date().toISOString(),
          };

          if (_broadcast) _broadcast({ type: 'new_infra_run', event: run });

          if (conclusion === 'failure') {
            notifyAll({
              repo_name,
              workflow_name: `[${engine}:${operation}] ${stack_name}`,
              status, conclusion, run_url: output_url,
            });
          }

          logAuditEvent({
            userId: null, username: triggeredBy || 'system',
            action: 'infrastructure_run',
            resourceType: 'infrastructure_run',
            resourceId: String(this.lastID),
            details: { engine, operation, stack_name, conclusion, repo_name },
            ipAddress: null,
          });

          resolve(run);
        }
      );
    });
  });
}

async function listRuns({ tenant_id, repo, stack, engine, operation, conclusion, page, limit }) {
  const conditions = [];
  const params = [];
  if (repo) { conditions.push('repo_name = ?'); params.push(repo); }
  if (stack) { conditions.push('stack_name = ?'); params.push(stack); }
  if (engine) { conditions.push('engine = ?'); params.push(engine); }
  if (operation) { conditions.push('operation = ?'); params.push(operation); }
  if (conclusion) { conditions.push('conclusion = ?'); params.push(conclusion); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM infrastructure_runs ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT * FROM infrastructure_runs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getStackStats(repo_name, stack_name, tenant_id) {
  const isSaas = process.env.SAAS_MODE === 'true';
  const where = isSaas ? 'WHERE repo_name = ? AND stack_name = ? AND tenant_id = ?' : 'WHERE repo_name = ? AND stack_name = ?';
  const params = isSaas ? [repo_name, stack_name, tenant_id] : [repo_name, stack_name];

  const [total, failures, recent] = await Promise.all([
    db.query(`SELECT COUNT(*) as cnt FROM infrastructure_runs ${where}`, params),
    db.query(`SELECT COUNT(*) as cnt FROM infrastructure_runs ${where} AND conclusion = 'failure'`, params),
    db.query(`SELECT * FROM infrastructure_runs ${where} ORDER BY created_at DESC LIMIT 20`, params),
  ]);

  const totalCount = parseInt(total.rows[0]?.cnt ?? 0, 10);
  const failCount = parseInt(failures.rows[0]?.cnt ?? 0, 10);

  const flakyResult = await db.query(
    `SELECT operation, total, failures FROM (
       SELECT operation, COUNT(*) as total, SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failures
       FROM infrastructure_runs ${where}
       GROUP BY operation
     ) sub WHERE total >= 5`,
    params
  );
  const flakyOps = (flakyResult.rows || [])
    .filter((r) => parseInt(r.failures, 10) / parseInt(r.total, 10) > 0.3)
    .map((r) => r.operation);

  return {
    repo_name, stack_name,
    total_runs: totalCount,
    failed_runs: failCount,
    success_rate: totalCount > 0 ? (((totalCount - failCount) / totalCount) * 100).toFixed(1) : '100.0',
    flaky_operations: flakyOps,
    recent_runs: recent.rows,
  };
}

async function getInfraTrend(repo_name, stack_name, tenant_id) {
  const isPostgres = !!process.env.DATABASE_URL;
  const isSaas = process.env.SAAS_MODE === 'true';
  const whereSql = isSaas ? "repo_name = ? AND stack_name = ? AND tenant_id = ?" : "repo_name = ? AND stack_name = ?";
  const params = isSaas ? [repo_name, stack_name, tenant_id] : [repo_name, stack_name];

  const sql = isPostgres
    ? `SELECT DATE(created_at) as day,
           SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failures,
           SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as successes
         FROM infrastructure_runs
         WHERE ${whereSql} AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY day ASC`
    : `SELECT DATE(created_at) as day,
           SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failures,
           SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as successes
         FROM infrastructure_runs
         WHERE ${whereSql} AND created_at >= datetime('now', '-30 days')
         GROUP BY DATE(created_at) ORDER BY day ASC`;

  const result = await db.query(sql, params);
  return result.rows;
}

async function listStacks({ tenant_id, repo }) {
  const conditions = [];
  const params = [];
  if (repo) { conditions.push('repo_name = ?'); params.push(repo); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM stacks ${where} ORDER BY created_at DESC`, params);
  return result.rows;
}

async function createStack({ tenant_id, repo_name, stack_name, engine, working_dir, default_vars }) {
  const defaultVarsJson = default_vars ? JSON.stringify(default_vars) : null;
  const result = await db.query(
    `INSERT INTO stacks (tenant_id, repo_name, stack_name, engine, working_dir, default_vars) VALUES (?, ?, ?, ?, ?, ?)`,
    [tenant_id, repo_name, stack_name, engine, working_dir, defaultVarsJson]
  );
  return result.rows?.[0] ?? { id: null };
}

async function deleteStack(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`DELETE FROM stacks WHERE ${conditions.join(' AND ')}`, params);
  return result;
}

function getStackWorkingDir(stacks, repo_name, stack_name) {
  const match = stacks.find((s) => s.repo_name === repo_name && s.stack_name === stack_name);
  return match ? match.working_dir : `./infra/${stack_name}`;
}

module.exports = { runOperation, setBroadcast, listRuns, getStackStats, getInfraTrend, LOG_DIR, listStacks, createStack, deleteStack, getStackWorkingDir };
