const db = require('./db');
const logger = require('./logger');
const { logAuditEvent } = require('./audit');

/**
 * Variable/provider/module management:
 *  - stack_variables: managed per-stack variables (merged over
 *    stack defaults when runs execute; sensitive ones never returned).
 *  - stack_modules: a tenant module registry for reusable IaC modules.
 *  - scheduled_plans: cron-like recurring plan/drift operations that a
 *    background scheduler (startScheduler) executes every minute.
 */

// ── Stack variables ──────────────────────────────────────────────────────────

async function getStack(stackId, tenant_id) {
  const conditions = ['id = ?'];
  const params = [stackId];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM stacks WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

async function listVariables({ stack_id }) {
  const result = await db.query(
    `SELECT id, stack_id, key, value, sensitive, source, created_at, updated_at FROM stack_variables WHERE stack_id = ? ORDER BY key ASC`,
    [stack_id]
  );
  return result.rows;
}

async function createVariable({ stack_id, key, value, sensitive, source }) {
  const result = await db.query(
    `INSERT INTO stack_variables (stack_id, key, value, sensitive, source) VALUES (?, ?, ?, ?, ?)`,
    [stack_id, key, value, sensitive ? 1 : 0, source || 'manual']
  );
  return result.rows?.[0] ?? { id: null };
}

async function updateVariable(id, stack_id, { key, value, sensitive }) {
  const sets = [];
  const params = [];
  if (key !== undefined) { sets.push('key = ?'); params.push(key); }
  if (value !== undefined) { sets.push('value = ?'); params.push(value); }
  if (sensitive !== undefined) { sets.push('sensitive = ?'); params.push(sensitive ? 1 : 0); }
  sets.push('updated_at = ?'); params.push(new Date().toISOString());
  const result = await db.query(`UPDATE stack_variables SET ${sets.join(', ')} WHERE id = ? AND stack_id = ?`, [...params, id, stack_id]);
  return result;
}

async function deleteVariable(id, stack_id) {
  return db.query(`DELETE FROM stack_variables WHERE id = ? AND stack_id = ?`, [id, stack_id]);
}

/** Effective run variables: stack default_vars overridden by managed variables. */
async function effectiveVars(stack) {
  let defaults = {};
  if (stack.default_vars) {
    if (typeof stack.default_vars === 'string') {
      try { defaults = JSON.parse(stack.default_vars); } catch { defaults = {}; }
    } else {
      defaults = { ...stack.default_vars };
    }
  }
  const managed = await listVariables({ stack_id: stack.id });
  const overrides = {};
  for (const v of managed) overrides[v.key] = v.value;
  return { ...defaults, ...overrides };
}

// ── Module registry ──────────────────────────────────────────────────────────

async function listModules({ tenant_id, engine }) {
  const conditions = [];
  const params = [];
  if (engine) { conditions.push('engine = ?'); params.push(engine); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM stack_modules ${where} ORDER BY created_at DESC`, params);
  return result.rows;
}

async function createModule({ tenant_id, name, source, version, engine, checksum }) {
  const result = await db.query(
    `INSERT INTO stack_modules (tenant_id, name, source, version, engine, checksum) VALUES (?, ?, ?, ?, ?, ?)`,
    [tenant_id, name, source, version || 'latest', engine || 'tofu', checksum ?? null]
  );
  return result.rows?.[0] ?? { id: null };
}

async function updateModule(id, { name, source, version, engine, checksum }, tenant_id) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (source !== undefined) { sets.push('source = ?'); params.push(source); }
  if (version !== undefined) { sets.push('version = ?'); params.push(version); }
  if (engine !== undefined) { sets.push('engine = ?'); params.push(engine); }
  if (checksum !== undefined) { sets.push('checksum = ?'); params.push(checksum); }
  if (sets.length === 0) return null;
  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  return db.query(`UPDATE stack_modules SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`, params);
}

async function deleteModule(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  return db.query(`DELETE FROM stack_modules WHERE ${conditions.join(' AND ')}`, params);
}

// ── Scheduled plans ──────────────────────────────────────────────────────────

async function listSchedules({ tenant_id }) {
  const conditions = [];
  const params = [];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM scheduled_plans ${where} ORDER BY next_run_at ASC, created_at DESC`, params);
  return result.rows;
}

async function createSchedule({ tenant_id, stack_id, repo_name, stack_name, engine, working_dir, operation, interval_minutes, description, created_by }) {
  const next = new Date(Date.now() + (interval_minutes || 1440) * 60 * 1000).toISOString();
  const result = await db.query(
    `INSERT INTO scheduled_plans (tenant_id, stack_id, repo_name, stack_name, engine, working_dir, operation, interval_minutes, description, enabled, next_run_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, stack_id, repo_name, stack_name, engine, working_dir, operation || 'plan', interval_minutes || 1440, description ?? null, 1, next, created_by]
  );
  return result.rows?.[0] ?? { id: null };
}

async function updateSchedule(id, { operation, interval_minutes, description, enabled }, tenant_id) {
  const sets = [];
  const params = [];
  if (operation !== undefined) { sets.push('operation = ?'); params.push(operation); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (interval_minutes !== undefined) { sets.push('interval_minutes = ?'); params.push(interval_minutes); }
  if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  if (sets.length === 0) return null;
  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  return db.query(`UPDATE scheduled_plans SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`, params);
}

async function deleteSchedule(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  return db.query(`DELETE FROM scheduled_plans WHERE ${conditions.join(' AND ')}`, params);
}

/**
 * Background scheduler. Runs every 60s, picks up enabled schedules
 * whose next_run_at has passed, and executes a plan/run via the
 * infrastructure engine (without touching tenant rate limits).
 */
async function runSchedule(schedule) {
  const infra = require('./infrastructure');
  try {
    await infra.runOperation({
      tenant_id: schedule.tenant_id,
      repo_name: schedule.repo_name,
      stack_name: schedule.stack_name,
      engine: schedule.engine,
      operation: schedule.operation || 'plan',
      workingDir: schedule.working_dir,
      vars: {},
      triggeredBy: `scheduled:${schedule.id}`,
    });
  } catch (err) {
    logger.error({ err, schedule: schedule.id }, 'scheduled run failed');
  }
  return automation;
}

let schedulerTimer = null;

async function tickScheduler() {
  try {
    const now = new Date().toISOString();
    const result = await db.query(`SELECT * FROM scheduled_plans WHERE enabled AND (next_run_at IS NULL OR next_run_at <= ?)`, [now]);
    const due = result.rows || [];
    for (const schedule of due) {
      logger.info({ schedule: schedule.id, stack: schedule.stack_name, op: schedule.operation }, 'running scheduled plan');
      await runSchedule(schedule);
      const next = new Date(Date.now() + (schedule.interval_minutes || 1440) * 60 * 1000).toISOString();
      await db.query(`UPDATE scheduled_plans SET last_run_at = ?, next_run_at = ? WHERE id = ?`, [now, next, schedule.id]);
      logAuditEvent({
        userId: null, username: 'scheduler',
        action: 'scheduled_plan_run',
        resourceType: 'scheduled_plan',
        resourceId: String(schedule.id),
        details: { stack: schedule.stack_name, operation: schedule.operation },
        ipAddress: null,
      });
    }
  } catch (err) {
    logger.error({ err }, 'scheduler tick failed');
  }
}

function startScheduler(intervalMs = 60000) {
  if (schedulerTimer) return schedulerTimer;
  schedulerTimer = setInterval(tickScheduler, intervalMs);
  logger.info({ interval_ms: intervalMs }, 'plan scheduler started');
  return schedulerTimer;
}

module.exports = {
  getStack,
  listVariables, createVariable, updateVariable, deleteVariable, effectiveVars,
  listModules, createModule, updateModule, deleteModule,
  listSchedules, createSchedule, updateSchedule, deleteSchedule,
  tickScheduler, startScheduler,
};
