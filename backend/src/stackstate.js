const db = require('./db');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * State Management — versioned state snapshots per stack, with
 * optimistic locking (serial conflict detection) and explicit
 * state locks for preventing concurrent applies across engines.
 *
 * Conflict rules:
 *  - Writing a state version with a `state_serial` lower than the latest
 *    stored serial is a conflict (409) — a stale snapshot would otherwise
 *    silently roll back newer infrastructure.
 *  - While a stack is locked by another actor, writes and (by default)
 *    applies are refused until the lock is released or force-unlocked.
 */

async function getStack(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM stacks WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

async function getLatestState(stack_id, tenant_id) {
  /* Lock first so a latest-state read never races a concurrent push */

  const conditions = ['stack_id = ?'];
  const params = [stack_id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(
    `SELECT * FROM stack_states WHERE ${conditions.join(' AND ')} ORDER BY version DESC LIMIT 1`,
    params
  );
  return result.rows?.[0] ?? null;
}

async function listStateVersions({ stack_id, tenant_id, limit = 50 }) {
  const conditions = ['stack_id = ?'];
  const params = [stack_id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(
    `SELECT id, stack_id, repo_name, stack_name, engine, version, state_serial, notes, created_by, source, created_at,
            LENGTH(state_text) as state_size
     FROM stack_states WHERE ${conditions.join(' AND ')} ORDER BY version DESC LIMIT ?`,
    [...params, limit]
  );
  return result.rows;
}

async function pushStateVersion({ stack, state_text, state_serial, notes, created_by, source }) {
  const latest = await getLatestState(stack.id, stack.tenant_id);

  // Optimistic-lock conflict: reject stale snapshots
  if (latest && state_serial !== undefined && state_serial !== null) {
    const latestSerial = parseInt(latest.state_serial, 10);
    if (!isNaN(latestSerial) && parseInt(state_serial, 10) < latestSerial) {
      return {
        conflict: true,
        error: 'stale_state',
        message: `Refusing stale state: incoming serial ${state_serial} < latest serial ${latestSerial}`,
        latest_version: latest.version,
        latest_serial: latestSerial,
      };
    }
  }

  const nextVersion = latest ? parseInt(latest.version, 10) + 1 : 1;
  const result = await db.query(
    `INSERT INTO stack_states (tenant_id, stack_id, repo_name, stack_name, engine, version, state_serial, state_text, notes, created_by, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      stack.tenant_id, stack.id, stack.repo_name, stack.stack_name, stack.engine,
      nextVersion, state_serial ?? null, state_text ?? null, notes ?? null,
      created_by ?? 'api', source ?? 'api',
    ]
  );
  const created = result.rows?.[0] ?? { id: null };
  return { id: created.id ?? null, stack, version: nextVersion, created_at: new Date().toISOString() };
}

async function getStateVersion(stack, version, tenant_id) {
  const conditions = ['stack_id = ?', 'version = ?'];
  const params = [stack.id, version];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM stack_states WHERE ${conditions.join(' AND ')}`, params);
  return result.rows?.[0] ?? null;
}

/** Restore = re-push an old snapshot as a new (revert) version. */
async function restoreStateVersion(stack, version, tenant_id, actor) {
  const source = await getStateVersion(stack, version, tenant_id);
  if (!source) return { error: 'not_found' };
  return pushStateVersion({
    stack,
    state_text: source.state_text,
    state_serial: null, // restored snapshots opt out of serial conflict checks
    notes: `Restore of version ${version}${source.notes ? ` (${source.notes})` : ''}`,
    created_by: actor,
    source: 'restore',
  });
}

// ── Locking ──────────────────────────────────────────────────────────────────

async function getLock(stack_id) {
  const result = await db.query(`SELECT * FROM stack_state_locks WHERE stack_id = ?`, [stack_id]);
  return result.rows?.[0] ?? null;
}

async function lockStack({ stack, locked_by, note }) {
  const existing = await getLock(stack.id);
  if (existing) {
    return {
      conflict: true,
      error: 'already_locked',
      message: `Stack ${stack.stack_name} is locked by ${existing.locked_by} since ${existing.locked_at}`,
      lock: existing,
    };
  }
  const lockId = `lock-${crypto.randomUUID().slice(0, 8)}`;
  await db.query(
    `INSERT INTO stack_state_locks (tenant_id, stack_id, locked_by, lock_id, note) VALUES (?, ?, ?, ?, ?)`,
    [stack.tenant_id, stack.id, locked_by, lockId, note ?? null]
  );
  return { lock: await getLock(stack.id) };
}

async function unlockStack({ stack, force, unlocked_by }) {
  const existing = await getLock(stack.id);
  if (!existing) return { error: 'not_locked' };
  if (!force && existing.locked_by !== unlocked_by) {
    return {
      conflict: true,
      error: 'not_lock_owner',
      message: `Lock is owned by ${existing.locked_by}. Use force to break it (dangerous if an apply is running).`,
      lock: existing,
    };
  }
  return db.query(`DELETE FROM stack_state_locks WHERE stack_id = ?`, [stack.id]);
}

/** Used by the execution engine before mutating operations. */
async function assertNotLocked(stack) {
  const lock = await getLock(stack.id);
  if (lock) {
    return {
      blocked: true,
      reason: 'state_locked',
      message: `Stack ${stack.stack_name} is locked by ${lock.locked_by} — release the state lock to run mutating operations.`,
      lock,
    };
  }
  return { blocked: false };
}

module.exports = {
  getStack,
  getLatestState,
  listStateVersions,
  pushStateVersion,
  getStateVersion,
  restoreStateVersion,
  getLock,
  lockStack,
  unlockStack,
  assertNotLocked,
};
