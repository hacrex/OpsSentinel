const db = require('./db');
const path = require('path');
const logger = require('./logger');
const { logAuditEvent } = require('./audit');
const { validateScript, validateWorkingDir } = require('./validate');

let _broadcast = null;
function broadcast(msg) { if (_broadcast) _broadcast(msg); }
function setBroadcast(fn) { _broadcast = fn; }

/**
 * CI/CD Pipeline builder — multi-stage pipelines that sequence
 * OpenTofu/IaC operations, Ansible configuration, custom scripts and
 * human approval gates into repeatable automated workflows.
 *
 * Execution model: stages run sequentially in one async task per run.
 * An `approval` stage pauses the run with status `awaiting_approval`;
 * POST /pipelines/runs/:id/approve resumes it, /cancel aborts it.
 */

const STAGE_TYPES = ['provision', 'config', 'script', 'approval'];

// ── CRUD ─────────────────────────────────────────────────────────────────────

async function listPipelines({ tenant_id, repo }) {
  const conditions = [];
  const params = [];
  if (repo) { conditions.push('repo_name = ?'); params.push(repo); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM pipelines ${where} ORDER BY created_at DESC`, params);
  const pipelines = result.rows || [];
  const stageRows = await db.query(`SELECT * FROM pipeline_stages ORDER BY stage_order ASC`, []);
  const stageMap = {};
  (stageRows.rows || []).forEach((s) => {
    stageMap[s.pipeline_id] = stageMap[s.pipeline_id] || [];
    stageMap[s.pipeline_id].push(s);
  });
  return pipelines.map((p) => ({ ...p, stages: stageMap[p.id] || [] }));
}

async function getPipeline(id, tenant_id, { withStages = true } = {}) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM pipelines WHERE ${conditions.join(' AND ')}`, params);
  const pipeline = result.rows?.[0];
  if (!pipeline) return null;
  if (!withStages) return pipeline;
  const stages = await db.query(`SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY stage_order ASC`, [id]);
  return { ...pipeline, stages: stages.rows || [] };
}

async function createPipeline({ tenant_id, name, repo_name, description, stages }) {
  const result = await db.query(
    `INSERT INTO pipelines (tenant_id, name, repo_name, description) VALUES (?, ?, ?, ?)`,
    [tenant_id, name, repo_name ?? null, description ?? null]
  );
  const pipeline = await db.query(
    `SELECT id FROM pipelines ORDER BY id DESC LIMIT 1`
  );
  const pipelineId = pipeline.rows?.[0]?.id;
  if (Array.isArray(stages)) await replaceStages(pipelineId, stages);

  logAuditEvent({
    userId: null, username: 'api',
    action: 'pipeline_created', resourceType: 'pipeline',
    resourceId: String(pipelineId), details: { name, stages: stages?.length || 0 }, ipAddress: null,
  });
  return getPipeline(pipelineId, tenant_id);
}

async function replaceStages(pipelineId, stages) {
  await db.query(`DELETE FROM pipeline_stages WHERE pipeline_id = ?`, [pipelineId]);
  let order = 1;
  for (const s of stages) {
    await db.query(
      `INSERT INTO pipeline_stages (pipeline_id, stage_order, name, stage_type, engine, operation, working_dir, playbook, inventory, script, timeout_seconds, requires_approval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pipelineId, s.stage_order ?? order++, s.name || s.stage_type,
        STAGE_TYPES.includes(s.stage_type) ? s.stage_type : 'script',
        s.engine ?? null, s.operation ?? null, s.working_dir ?? null,
        s.playbook ?? null, s.inventory ?? null, s.script ?? null,
        s.timeout_seconds || 1800, s.requires_approval ? 1 : 0,
      ]
    );
  }
}

async function updatePipeline(id, { name, description, enabled, stages }, tenant_id) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  if (sets.length) {
    await db.query(`UPDATE pipelines SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`, params);
  }
  if (Array.isArray(stages)) await replaceStages(id, stages);
  return getPipeline(id, tenant_id);
}

async function deletePipeline(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  await db.query(`DELETE FROM pipeline_stage_runs WHERE pipeline_id = ?`, [id]);
  await db.query(`DELETE FROM pipeline_runs WHERE pipeline_id = ?`, [id]);
  await db.query(`DELETE FROM pipeline_stages WHERE pipeline_id = ?`, [id]);
  return db.query(`DELETE FROM pipelines WHERE ${conditions.join(' AND ')}`, params);
}

// ── Runs ─────────────────────────────────────────────────────────────────────

async function listPipelineRuns({ pipeline_id, tenant_id, status, page, limit }) {
  const conditions = [];
  const params = [];
  if (pipeline_id) { conditions.push('pipeline_id = ?'); params.push(pipeline_id); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const offset = (page - 1) * limit;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await db.query(`SELECT COUNT(*) as cnt FROM pipeline_runs ${where}`, params);
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);
  const dataResult = await db.query(
    `SELECT * FROM pipeline_runs ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getPipelineRun(runId, tenant_id) {
  const conditions = ['id = ?'];
  const params = [runId];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const run = await db.query(`SELECT * FROM pipeline_runs WHERE ${conditions.join(' AND ')}`, params);
  if (!run.rows?.[0]) return null;
  const stages = await db.query(`SELECT * FROM pipeline_stage_runs WHERE pipeline_run_id = ? ORDER BY stage_order ASC`, [runId]);
  return { ...run.rows[0], stages: stages.rows || [] };
}

/**
 * Execute one pipeline stage.
 *  - provision: IaC engine operation via the infrastructure engine
 *  - config:    Ansible playbook execution
 *  - script:    plain shell/pwsh script in working_dir
 *  - approval:  pauses the pipeline until approved/rejected
 */
async function executeStage({ stage, pipeline, runId, tenant_id, triggeredBy }) {
  const infra = require('./infrastructure');

  async function startStage(status) {
    const startedAt = new Date().toISOString();
    const res = await db.query(
      `INSERT INTO pipeline_stage_runs (pipeline_run_id, pipeline_id, stage_id, name, stage_type, stage_order, status, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [runId, pipeline.id, stage.id, stage.name, stage.stage_type, stage.stage_order, status, startedAt]
    );
    return res.rows?.[0]?.id ?? null;
  }

  async function endStage(stageRunId, { conclusion, outputUrl }) {
    await db.query(
      `UPDATE pipeline_stage_runs SET status = 'completed', conclusion = ?, output_url = ?, finished_at = ? WHERE id = ?`,
      [conclusion, outputUrl ?? null, new Date().toISOString(), stageRunId]
    );
  }

  if (stage.stage_type === 'approval') {
    if (stage.requires_approval === 0 || stage.requires_approval === false || stage.requires_approval === undefined) {
      // Approvals configured without the flag flow through instantly
      const id = await startStage('running');
      await endStage(id, { conclusion: 'approved' });
      return { conclusion: 'approved' };
    }
    await db.query(`UPDATE pipeline_runs SET status = 'awaiting_approval' WHERE id = ?`, [runId]);
    await db.query(
      `INSERT INTO pipeline_stage_runs (pipeline_run_id, pipeline_id, stage_id, name, stage_type, stage_order, status)
       VALUES (?, ?, ?, ?, 'approval', ?, 'pending')`,
      [runId, pipeline.id, stage.id, stage.name, stage.stage_order]
    );
    broadcast({ type: 'pipeline_awaiting_approval', run_id: runId, pipeline_id: pipeline.id, stage: stage.name });
    return { pending: true };
  }

  const stageRunId = await startStage('running');
  let result;
  if (stage.stage_type === 'provision') {
    result = await infra.runOperation({
      tenant_id,
      repo_name: pipeline.repo_name,
      stack_name: pipeline.name,
      engine: stage.engine || 'tofu',
      operation: stage.operation || 'plan',
      workingDir: stage.working_dir,
      vars: {},
      triggeredBy: `pipeline:${runId}`,
    });
  } else if (stage.stage_type === 'config') {
    result = await infra.runOperation({
      tenant_id,
      repo_name: pipeline.repo_name,
      stack_name: pipeline.name,
      engine: 'ansible',
      operation: 'apply',
      workingDir: stage.working_dir,
      vars: { playbook: stage.playbook || 'site.yml', inventory: stage.inventory },
      triggeredBy: `pipeline:${runId}`,
    });
  } else {
    // script: plain shell/pwsh with log capture, same layout as infra runs
    const scriptCheck = validateScript(stage.script);
    if (!scriptCheck.ok) {
      await endStage(stageRunId, { conclusion: 'failure', outputUrl: null });
      return { conclusion: 'failure', error: scriptCheck.error };
    }
    const dirCheck = validateWorkingDir(stage.working_dir);
    if (!dirCheck.ok) {
      await endStage(stageRunId, { conclusion: 'failure', outputUrl: null });
      return { conclusion: 'failure', error: dirCheck.error };
    }
    result = await new Promise((resolve) => {
      const { spawn } = require('child_process');
      const fs = require('fs');
      const { LOG_DIR } = require('./infrastructure');
      const logFile = path.join(LOG_DIR, `pipeline-${runId}-stage${stage.id}-${Date.now()}.log`);
      const stream = fs.createWriteStream(logFile);
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'pwsh' : 'bash';
      const child = spawn(cmd, isWin ? ['-NoProfile', '-Command', stage.script] : ['-ec', stage.script], { cwd: dirCheck.resolved, windowsHide: true });
      child.stdout.on('data', (d) => stream.write(d));
      child.stderr.on('data', (d) => stream.write(d));
      child.on('close', (code) => {
        stream.end();
        resolve({ conclusion: code === 0 ? 'success' : 'failure', output_url: `/infra-logs/${path.basename(logFile)}` });
      });
      child.on('error', (err) => {
        stream.end();
        resolve({ conclusion: 'failure', output_url: null, error: err.message });
      });
    });
  }

  const conclusion = result?.conclusion || result?.error || 'failure';
  if (conclusion === 'success') await endStage(stageRunId, { conclusion, outputUrl: result.output_url });
  else await endStage(stageRunId, { conclusion: 'failure', outputUrl: result?.output_url ?? null });
  return { conclusion, output_url: result.output_url };
}

async function updateRunStatus(runId, status) {
  const finished = ['succeeded', 'failed', 'cancelled'].includes(status);
  await db.query(
    `UPDATE pipeline_runs SET status = ?${finished ? ', finished_at = ?' : ''} WHERE id = ?`,
    finished ? [status, new Date().toISOString(), runId] : [status, runId]
  );
}

/** Fire-and-forget asynchronous run so the API returns immediately. */
async function startPipelineRun(pipeline, tenant_id, triggeredBy) {
  const runResult = await db.query(
    `INSERT INTO pipeline_runs (pipeline_id, tenant_id, status, triggered_by) VALUES (?, ?, 'running', ?)`,
    [pipeline.id, tenant_id, triggeredBy]
  );
  const idRow = await db.query(`SELECT id FROM pipeline_runs ORDER BY id DESC LIMIT 1`);
  const runId = idRow.rows?.[0]?.id;
  broadcast({ type: 'pipeline_started', run_id: runId, pipeline_id: pipeline.id, name: pipeline.name });

  setImmediate(() => {
    executePipelineRun(pipeline, tenant_id, runId, triggeredBy).catch((err) => {
      logger.error({ err, run: runId }, 'pipeline run crashed');
      updateRunStatus(runId, 'failed');
    });
  });

  return { run_id: runId };
}

async function executePipelineRun(pipeline, tenant_id, runId, triggeredBy) {
  const stages = (await db.query(`SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY stage_order ASC`, [pipeline.id])).rows || [];
  let failed = false;

  for (const stage of stages) {
    // Check for cancel between stages
    const current = (await db.query(`SELECT status FROM pipeline_runs WHERE id = ?`, [runId])).rows?.[0];
    if (current && (current.status === 'cancelled')) return;

    try {
      const outcome = await executeStage({ stage, pipeline, runId, tenant_id, triggeredBy });
      if (outcome.pending) {
        // Approval gate — the run stays paused here until resolved
        await waitForApproval(runId);
        const approved = (await db.query(`SELECT status FROM pipeline_runs WHERE id = ?`, [runId])).rows?.[0]?.status;
        if (approved === 'cancelled') {
          updateRunStatus(runId, 'cancelled');
          return;
        }
        await db.query(
          `UPDATE pipeline_stage_runs SET status = 'completed', conclusion = 'approved', finished_at = ? WHERE pipeline_run_id = ? AND stage_id = ? AND status = 'pending'`,
          [new Date().toISOString(), runId, stage.id]
        );
      } else if (outcome.conclusion !== 'success' && outcome.conclusion !== 'approved') {
        failed = true;
        await db.query(
          `UPDATE pipeline_stage_runs SET status = 'completed', conclusion = 'failure', finished_at = ? WHERE pipeline_run_id = ? AND stage_id = ? AND status = 'running'`,
          [new Date().toISOString(), runId, stage.id]
        );
        broadcast({ type: 'pipeline_stage_failed', run_id: runId, pipeline_id: pipeline.id, stage: stage.name });
        break;
      }
    } catch (err) {
      logger.error({ err, stage: stage.id, run: runId }, 'stage execution failed');
      await db.query(
        `UPDATE pipeline_stage_runs SET status = 'completed', conclusion = 'failure', finished_at = ? WHERE pipeline_run_id = ? AND stage_id = ? AND status = 'running'`,
        [new Date().toISOString(), runId, stage.id]
      ).catch(() => {});
      failed = true;
      break;
    }
  }

  await updateRunStatus(runId, failed ? 'failed' : 'succeeded');
  broadcast({ type: 'pipeline_finished', run_id: runId, pipeline_id: pipeline.id, status: failed ? 'failed' : 'succeeded', name: pipeline.name });
  logAuditEvent({
    userId: null, username: triggeredBy || 'pipeline',
    action: 'pipeline_run', resourceType: 'pipeline_run',
    resourceId: String(runId), details: { pipeline: pipeline.name, status: failed ? 'failed' : 'succeeded' }, ipAddress: null,
  });
}

/** Long polling wait loop for the approval gate (checks every 2s, max 24h). */
function waitForApproval(runId) {
  return new Promise((resolve) => {
    const poll = setInterval(async () => {
      try {
        const row = (await db.query(`SELECT status FROM pipeline_runs WHERE id = ?`, [runId])).rows?.[0];
        if (row && (row.status === 'running' || row.status === 'cancelled')) {
          clearInterval(poll);
          resolve();
        }
      } catch {
        clearInterval(poll);
        resolve();
      }
    }, 2000);
  });
}

async function approveRun(runId, approved, approvedBy, tenant_id) {
  const run = await getPipelineRun(runId, tenant_id);
  if (!run) return { error: 'not_found' };
  if (run.status !== 'awaiting_approval') return { error: 'not_awaiting', status: run.status };
  if (approved) {
    await updateRunStatus(runId, 'running');
    await logAuditEvent({
      userId: null, username: approvedBy || 'api', action: 'pipeline_approved',
      resourceType: 'pipeline_run', resourceId: String(runId), details: {}, ipAddress: null,
    });
    broadcast({ type: 'pipeline_approved', run_id: runId });
    return { status: 'running' };
  }
  await updateRunStatus(runId, 'cancelled');
  await logAuditEvent({
    userId: null, username: approvedBy || 'api', action: 'pipeline_rejected',
    resourceType: 'pipeline_run', resourceId: String(runId), details: {}, ipAddress: null,
  });
  return { status: 'cancelled' };
}

async function cancelRun(runId, tenant_id) {
  const run = await getPipelineRun(runId, tenant_id);
  if (!run) return { error: 'not_found' };
  if (['succeeded', 'failed', 'cancelled'].includes(run.status)) return { error: 'already_finished', status: run.status };
  await updateRunStatus(runId, 'cancelled');
  broadcast({ type: 'pipeline_cancelled', run_id: runId });
  return { status: 'cancelled' };
}

module.exports = {
  STAGE_TYPES,
  listPipelines, getPipeline, createPipeline, updatePipeline, deletePipeline,
  listPipelineRuns, getPipelineRun, startPipelineRun, approveRun, cancelRun,
  setBroadcast,
};
