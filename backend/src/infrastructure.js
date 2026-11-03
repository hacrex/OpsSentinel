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
    return { cmd: 'ansible-playbook', args };
  }

  const cmdMap = {
    tofu: 'tofu',
    terraform: 'terraform',
    pulumi: 'pulumi',
    cloudformation: 'aws',
    crossplane: 'kubectl',
    'aws-cdk': 'cdk',
    bicep: 'az',
    packer: 'packer',
    vagrant: 'vagrant',
  };

  const cmd = cmdMap[engine] || engine;
  const args = [];

  if (engine === 'pulumi') {
    // pulumi preview/up/destroy/refresh
    const opMap = { plan: 'preview', apply: 'up', destroy: 'destroy', refresh: 'refresh' };
    args.push(opMap[operation] || operation);
    if (vars.stack) args.push('--stack', vars.stack);
    if (operation === 'apply') args.push('--yes');
    return { cmd, args };
  }

  if (engine === 'cloudformation') {
    // aws cloudformation deploy/delete/describe-stacks
    const opMap = { plan: 'describe-stacks', apply: 'deploy', destroy: 'delete-stack', refresh: 'describe-stacks' };
    args.push('cloudformation', opMap[operation] || operation);
    if (vars.stack_name) args.push('--stack-name', vars.stack_name);
    if (vars.template_body) args.push('--template-body', vars.template_body);
    if (operation === 'apply') args.push('--capabilities', 'CAPABILITY_NAMED_IAM');
    return { cmd, args };
  }

  if (engine === 'crossplane') {
    // kubectl apply/delete/get
    const opMap = { plan: 'get', apply: 'apply', destroy: 'delete', refresh: 'get' };
    args.push(opMap[operation] || operation);
    if (vars.resource) args.push(vars.resource);
    return { cmd, args };
  }

  if (engine === 'aws-cdk') {
    // cdk synth/deploy/destroy/diff
    const opMap = { plan: 'diff', apply: 'deploy', destroy: 'destroy', refresh: 'diff' };
    args.push(opMap[operation] || operation);
    if (vars.stack) args.push(vars.stack);
    if (operation === 'apply') args.push('--require-approval', 'never');
    return { cmd, args };
  }

  if (engine === 'bicep') {
    // az deployment group create/delete/what-if
    const opMap = { plan: 'what-if', apply: 'create', destroy: 'delete', refresh: 'show' };
    args.push('deployment', 'group', opMap[operation] || operation);
    if (vars.resource_group) args.push('--resource-group', vars.resource_group);
    if (vars.template_file) args.push('--template-file', vars.template_file);
    return { cmd, args };
  }

  if (engine === 'packer') {
    // packer build/validate
    const opMap = { plan: 'validate', apply: 'build', destroy: '', refresh: '' };
    args.push(opMap[operation] || operation);
    if (vars.template) args.push(vars.template);
    if (operation === 'apply' && vars.only) args.push('--only', vars.only);
    return { cmd, args };
  }

  if (engine === 'vagrant') {
    // vagrant up/halt/destroy/provision
    const opMap = { plan: '', apply: 'up', destroy: 'destroy', refresh: 'reload' };
    args.push(opMap[operation] || operation);
    if (vars.vm_name) args.push(vars.vm_name);
    if (operation === 'apply') args.push('--provider', vars.provider || 'virtualbox');
    return { cmd, args };
  }

  // Default: tofu / terraform
  const defaultArgs = [operation];
  if (operation === 'plan' || operation === 'apply') {
    Object.entries(vars || {}).forEach(([k, v]) => { defaultArgs.push('-var', `${k}=${v}`); });
  }
  if (operation === 'apply') defaultArgs.push('-auto-approve');
  return { cmd, args: defaultArgs };
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

async function recordInfraRun({ tenant_id, repo_name, stack_name, engine, operation, status, conclusion, output_url, triggeredBy }) {
  db.run(
    `INSERT INTO infrastructure_runs (tenant_id, repo_name, stack_name, engine, operation, status, conclusion, output_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, repo_name, stack_name, engine, operation, status, conclusion, output_url],
    function (err) {
      if (err) {
        logger.error({ err }, 'Failed to record infra run from CI');
        return;
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
        userId: null, username: triggeredBy || 'ci',
        action: 'infrastructure_run',
        resourceType: 'infrastructure_run',
        resourceId: String(this.lastID),
        details: { engine, operation, stack_name, conclusion, repo_name, source: 'ci' },
        ipAddress: null,
      });
    }
  );
}

async function listIncidents({ tenant_id, status, severity, page, limit }) {
  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (severity) { conditions.push('severity = ?'); params.push(severity); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM incidents ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT * FROM incidents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function createIncident({ tenant_id, title, description, severity, status, repo_name, stack_name, workflow_name }) {
  const result = await db.query(
    `INSERT INTO incidents (tenant_id, title, description, severity, status, repo_name, stack_name, workflow_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, title, description, severity, status, repo_name, stack_name, workflow_name]
  );
  const incident = result.rows?.[0] ?? { id: null };

  if (_broadcast && incident.id) {
    _broadcast({ type: 'new_incident', incident });
  }

  return incident;
}

async function getIncident(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM incidents WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

async function updateIncident(id, { status, severity, description, resolved_at }, tenant_id) {
  const sets = [];
  const params = [];
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (severity !== undefined) { sets.push('severity = ?'); params.push(severity); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (resolved_at !== undefined) { sets.push('resolved_at = ?'); params.push(resolved_at); }
  if (sets.length === 0) return null;

  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const result = await db.query(
    `UPDATE incidents SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result;
}

async function deleteIncident(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`DELETE FROM incidents WHERE ${conditions.join(' AND ')}`, params);
  return result;
}

async function listSecrets({ tenant_id, provider, scope, page, limit }) {
  const conditions = [];
  const params = [];
  if (provider) { conditions.push('provider = ?'); params.push(provider); }
  if (scope) { conditions.push('scope = ?'); params.push(scope); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM secrets ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT id, tenant_id, name, provider, scope, created_at, updated_at FROM secrets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function createSecret({ tenant_id, name, value, provider, scope }) {
  const result = await db.query(
    `INSERT INTO secrets (tenant_id, name, value, provider, scope) VALUES (?, ?, ?, ?, ?)`,
    [tenant_id, name, value, provider, scope]
  );
  return result.rows?.[0] ?? { id: null };
}

async function getSecret(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM secrets WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

async function updateSecret(id, { name, value, provider, scope }, tenant_id) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (value !== undefined) { sets.push('value = ?'); params.push(value); }
  if (provider !== undefined) { sets.push('provider = ?'); params.push(provider); }
  if (scope !== undefined) { sets.push('scope = ?'); params.push(scope); }
  if (sets.length === 0) return null;

  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const result = await db.query(
    `UPDATE secrets SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result;
}

async function deleteSecret(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`DELETE FROM secrets WHERE ${conditions.join(' AND ')}`, params);
  return result;
}

async function listConfigRuns({ tenant_id, repo, tool, conclusion, page, limit }) {
  const conditions = [];
  const params = [];
  if (repo) { conditions.push('repo_name = ?'); params.push(repo); }
  if (tool) { conditions.push('tool = ?'); params.push(tool); }
  if (conclusion) { conditions.push('conclusion = ?'); params.push(conclusion); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM configuration_runs ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT * FROM configuration_runs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function recordConfigRun({ tenant_id, repo_name, tool, playbook, inventory, status, conclusion, output_url, triggeredBy }) {
  db.run(
    `INSERT INTO configuration_runs (tenant_id, repo_name, tool, playbook, inventory, status, conclusion, output_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, repo_name, tool, playbook, inventory, status, conclusion, output_url],
    function (err) {
      if (err) {
        logger.error({ err }, 'Failed to record config run');
        return;
      }

      const run = {
        id: this.lastID,
        tenant_id, repo_name, tool, playbook, inventory, status, conclusion,
        output_url, mttr_seconds: null, created_at: new Date().toISOString(),
      };

      if (_broadcast) _broadcast({ type: 'new_config_run', event: run });

      if (conclusion === 'failure') {
        notifyAll({
          repo_name,
          workflow_name: `[${tool}:config] ${playbook || inventory || 'config'}`,
          status, conclusion, run_url: output_url,
        });
      }

      logAuditEvent({
        userId: null, username: triggeredBy || 'system',
        action: 'configuration_run',
        resourceType: 'configuration_run',
        resourceId: String(this.lastID),
        details: { tool, playbook, inventory, conclusion, repo_name },
        ipAddress: null,
      });
    }
  );
}

async function listPolicies({ tenant_id, enabled, page, limit }) {
  const conditions = [];
  const params = [];
  if (enabled !== undefined) { conditions.push('enabled = ?'); params.push(enabled === 'true' ? 1 : 0); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM policies ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT * FROM policies ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function createPolicy({ tenant_id, name, description, condition, action, requires_approval, enabled }) {
  const result = await db.query(
    `INSERT INTO policies (tenant_id, name, description, condition, action, requires_approval, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, name, description, condition, action, requires_approval ? 1 : 0, enabled !== false ? 1 : 0]
  );
  const policy = result.rows?.[0] ?? { id: null };

  if (_broadcast && policy.id) {
    _broadcast({ type: 'new_policy', policy });
  }

  return policy;
}

async function getPolicy(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM policies WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

async function updatePolicy(id, { name, description, condition, action, requires_approval, enabled }, tenant_id) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (condition !== undefined) { sets.push('condition = ?'); params.push(condition); }
  if (action !== undefined) { sets.push('action = ?'); params.push(action); }
  if (requires_approval !== undefined) { sets.push('requires_approval = ?'); params.push(requires_approval ? 1 : 0); }
  if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  if (sets.length === 0) return null;

  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const result = await db.query(
    `UPDATE policies SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result;
}

async function deletePolicy(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`DELETE FROM policies WHERE ${conditions.join(' AND ')}`, params);
  return result;
}

async function listFingerprints({ tenant_id, category, page, limit }) {
  const conditions = [];
  const params = [];
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM failure_fingerprints ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT * FROM failure_fingerprints ${where} ORDER BY occurrence_count DESC, last_seen DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function upsertFingerprint({ tenant_id, fingerprint_hash, category, category_label, root_cause, suggested_fix, occurrence_count, first_seen, last_seen, repositories, workflows, confidence_score }) {
  // Try to find existing fingerprint
  const existing = await db.query(
    `SELECT * FROM failure_fingerprints WHERE fingerprint_hash = ?${process.env.SAAS_MODE === 'true' ? ' AND tenant_id = ?' : ''}`,
    process.env.SAAS_MODE === 'true' ? [fingerprint_hash, tenant_id] : [fingerprint_hash]
  );

  if (existing.rows && existing.rows.length > 0) {
    const fp = existing.rows[0];
    const newOccurrence = (parseInt(fp.occurrence_count, 10) || 0) + (occurrence_count || 1);
    const newRepos = fp.repositories ? [...new Set([...fp.repositories.split(','), ...(repositories || '').split(',')])] : (repositories || '').split(',').filter(Boolean);
    const newWorkflows = fp.workflows ? [...new Set([...fp.workflows.split(','), ...(workflows || '').split(',')])] : (workflows || '').split(',').filter(Boolean);

    const result = await db.query(
      `UPDATE failure_fingerprints SET occurrence_count = ?, last_seen = ?, repositories = ?, workflows = ?, confidence_score = ? WHERE fingerprint_hash = ?`,
      [newOccurrence, last_seen || new Date().toISOString(), newRepos.join(','), newWorkflows.join(','), confidence_score || 0, fingerprint_hash]
    );
    return { id: fp.id, ...fp, occurrence_count: newOccurrence };
  }

  const result = await db.query(
    `INSERT INTO failure_fingerprints (tenant_id, fingerprint_hash, category, category_label, root_cause, suggested_fix, occurrence_count, first_seen, last_seen, repositories, workflows, confidence_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, fingerprint_hash, category, category_label, root_cause, suggested_fix, occurrence_count || 1, first_seen || new Date().toISOString(), last_seen || new Date().toISOString(), repositories || '', workflows || '', confidence_score || 0]
  );
  return result.rows?.[0] ?? { id: null };
}

async function listRemediationActions({ tenant_id, status, fingerprint_hash, incident_id, page, limit }) {
  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (fingerprint_hash) { conditions.push('fingerprint_hash = ?'); params.push(fingerprint_hash); }
  if (incident_id) { conditions.push('incident_id = ?'); params.push(incident_id); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM remediation_actions ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT * FROM remediation_actions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function createRemediationAction({ tenant_id, fingerprint_hash, incident_id, action_type, action_name, status, requires_approval }) {
  const result = await db.query(
    `INSERT INTO remediation_actions (tenant_id, fingerprint_hash, incident_id, action_type, action_name, status, requires_approval) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, fingerprint_hash, incident_id, action_type, action_name, status || 'pending', requires_approval ? 1 : 0]
  );
  const action = result.rows?.[0] ?? { id: null };

  if (_broadcast && action.id) {
    _broadcast({ type: 'new_remediation_action', action });
  }

  return action;
}

async function getRemediationAction(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM remediation_actions WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

async function updateRemediationAction(id, { status, result, error_message, executed_at, approved_by, approved_at }, tenant_id) {
  const sets = [];
  const params = [];
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (result !== undefined) { sets.push('result = ?'); params.push(result); }
  if (error_message !== undefined) { sets.push('error_message = ?'); params.push(error_message); }
  if (executed_at !== undefined) { sets.push('executed_at = ?'); params.push(executed_at); }
  if (approved_by !== undefined) { sets.push('approved_by = ?'); params.push(approved_by); }
  if (approved_at !== undefined) { sets.push('approved_at = ?'); params.push(approved_at); }
  if (sets.length === 0) return null;

  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }

  const updResult = await db.query(
    `UPDATE remediation_actions SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`,
    params
  );
  return updResult;
}

async function deleteRemediationAction(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`DELETE FROM remediation_actions WHERE ${conditions.join(' AND ')}`, params);
  return result;
}

module.exports = { runOperation, setBroadcast, listRuns, getStackStats, getInfraTrend, LOG_DIR, listStacks, createStack, deleteStack, getStackWorkingDir, recordInfraRun, listIncidents, createIncident, getIncident, updateIncident, deleteIncident, listSecrets, createSecret, getSecret, updateSecret, deleteSecret, listConfigRuns, recordConfigRun, listPolicies, createPolicy, getPolicy, updatePolicy, deletePolicy, listFingerprints, upsertFingerprint, listRemediationActions, createRemediationAction, getRemediationAction, updateRemediationAction, deleteRemediationAction };
