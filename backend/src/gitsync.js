const db = require('./db');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./secure');

/**
 * GitOps-first Git sync — sources are Git repositories that hold
 * stack (IaC) code and/or Ansible playbooks. OpsSentinel clones/pulls
 * them into a local workspace so rendered stacks stay in Git, and
 * can push committed changes from stack working directories back.
 *
 * Private-repo auth:
 *  - SSH: store an encrypted private key; execGit sets GIT_SSH_COMMAND
 *    to `ssh -i <key> -o StrictHostKeyChecking=accept-new`
 *  - HTTPS token: store an encrypted PAT; execGit embeds it in the URL
 *    (https://<token>@github.com/owner/repo.git) so credential prompts
 *    are never triggered.
 * Credentials are encrypted at rest (AES-256-GCM) and never returned
 * by the list API.
 */

const GIT_SYNC_DIR = path.resolve(process.env.GIT_SYNC_DIR || path.join(__dirname, '../../git-sync'));
if (!fs.existsSync(GIT_SYNC_DIR)) fs.mkdirSync(GIT_SYNC_DIR, { recursive: true });

function execGit(args, opts = {}) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'echo' };
  const spawnArgs = [...args];

  // HTTPS token auth: embed token into the URL for the first https:// arg
  if (opts.token) {
    for (let i = 0; i < spawnArgs.length; i++) {
      if (typeof spawnArgs[i] === 'string' && spawnArgs[i].startsWith('https://')) {
        spawnArgs[i] = spawnArgs[i].replace('https://', `https://x-access-token:${opts.token}@`);
        break;
      }
    }
  }

  // SSH key auth: point GIT_SSH_COMMAND at the stored private key
  if (opts.sshPrivateKey) {
    const keyFile = path.join(GIT_SYNC_DIR, `ssh-key-${opts.sourceId}`);
    fs.writeFileSync(keyFile, opts.sshPrivateKey, { mode: 0o600 });
    env.GIT_SSH_COMMAND = `ssh -i "${keyFile}" -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes`;
  }

  return new Promise((resolve) => {
    const child = spawn('git', spawnArgs, {
      cwd: opts.cwd,
      env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: err.message }));
  });
}

function workspaceFor(source) {
  return path.join(GIT_SYNC_DIR, String(source.id));
}

function requireGit() {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['--version']);
    let ok = false;
    p.on('close', (code) => { ok = code === 0; ok ? resolve() : reject(new Error('git CLI not available on the server')); });
    p.on('error', (err) => reject(err));
  });
}

function maskSource(source) {
  return {
    id: source.id,
    tenant_id: source.tenant_id,
    name: source.name,
    repo_url: source.repo_url,
    branch: source.branch,
    kind: source.kind,
    path: source.path,
    auth_type: source.auth_type,
    status: source.status,
    last_commit: source.last_commit,
    last_sync_at: source.last_sync_at,
    message: source.message,
    created_at: source.created_at,
    workspace: path.basename(workspaceFor(source)),
    exists: fs.existsSync(workspaceFor(source)),
    has_auth: source.auth_type !== 'none',
  };
}

async function listSources({ tenant_id, status }) {
  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM git_sources ${where} ORDER BY created_at DESC`, params);
  return (result.rows || []).map(maskSource);
}

async function createSource({ tenant_id, name, repo_url, branch, kind, path: subPath, auth_type, ssh_private_key, token }) {
  const encryptedKey = ssh_private_key ? encrypt(ssh_private_key) : null;
  const encryptedToken = token ? encrypt(token) : null;
  const result = await db.query(
    `INSERT INTO git_sources (tenant_id, name, repo_url, branch, kind, path, auth_type, ssh_private_key, token, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, name, repo_url, branch || 'main', kind || 'stacks', subPath || '', auth_type || 'none', encryptedKey, encryptedToken, 'pending']
  );
  return result.rows?.[0] ?? { id: null };
}

async function getSource(id, tenant_id) {
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  const result = await db.query(`SELECT * FROM git_sources WHERE ${conditions.join(' AND ')}`, params);
  if (!result.rows?.[0]) return null;
  const s = result.rows[0];
  return {
    ...s,
    ssh_private_key: s.ssh_private_key ? decrypt(s.ssh_private_key) : null,
    token: s.token ? decrypt(s.token) : null,
  };
}

async function updateSource(id, { name, branch, kind, path: subPath, repo_url, auth_type, ssh_private_key, token }, tenant_id) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (branch !== undefined) { sets.push('branch = ?'); params.push(branch); }
  if (kind !== undefined) { sets.push('kind = ?'); params.push(kind); }
  if (subPath !== undefined) { sets.push('path = ?'); params.push(subPath); }
  if (repo_url !== undefined) { sets.push('repo_url = ?'); params.push(repo_url); }
  if (auth_type !== undefined) { sets.push('auth_type = ?'); params.push(auth_type); }
  if (ssh_private_key !== undefined) { sets.push('ssh_private_key = ?'); params.push(encrypt(ssh_private_key)); }
  if (token !== undefined) { sets.push('token = ?'); params.push(encrypt(token)); }
  if (sets.length === 0) return null;
  const conditions = ['id = ?'];
  params.push(id);
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  return db.query(`UPDATE git_sources SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`, params);
}

async function deleteSource(id, tenant_id) {
  await getSource(id, tenant_id).then((src) => {
    if (src && fs.existsSync(workspaceFor(src))) {
      fs.rmSync(workspaceFor(src), { recursive: true, force: true });
    }
  });
  const conditions = ['id = ?'];
  const params = [id];
  if (process.env.SAAS_MODE === 'true') { conditions.push('tenant_id = ?'); params.push(tenant_id); }
  return db.query(`DELETE FROM git_sources WHERE ${conditions.join(' AND ')}`, params);
}

/**
 * Pull (clone or fetch+reset) a git source into its workspace.
 * Shallow-history preserving: uses a hard reset to origin/<branch>
 * so syncs are idempotent even after local preview changes.
 */
async function syncSource(source) {
  try {
    await requireGit();
  } catch (e) {
    return { error: 'git_unavailable', message: e.message };
  }

  const ws = workspaceFor(source);
  let out = '';
  let commit = null;
  const gitAuth = {
    sourceId: source.id,
    token: source.token,
    sshPrivateKey: source.ssh_private_key,
  };

  if (!fs.existsSync(path.join(ws, '.git'))) {
    fs.rmSync(ws, { recursive: true, force: true });
    const clone = await execGit(['clone', '--branch', source.branch, '--single-branch', source.repo_url, ws], gitAuth);
    out += clone.stdout + clone.stderr;
    if (clone.code !== 0) return finish(source, 'error', {}, out);
  } else {
    const fetch = await execGit(['fetch', '--all', '--prune'], { cwd: ws, ...gitAuth });
    out += fetch.stdout + fetch.stderr;
    if (fetch.code !== 0) return finish(source, 'error', {}, out);
    const reset = await execGit(['reset', '--hard', `origin/${source.branch}`], { cwd: ws, ...gitAuth });
    out += reset.stdout + reset.stderr;
    if (reset.code !== 0) return finish(source, 'error', {}, out);
  }

  const head = await execGit(['rev-parse', 'HEAD'], { cwd: ws, ...gitAuth });
  commit = head.code === 0 ? head.stdout.trim() : null;

  // Report what landed in the workspace
  const subDir = source.path ? path.join(ws, source.path) : ws;
  const summary = [];
  if (fs.existsSync(subDir)) {
    for (const entry of fs.readdirSync(subDir)) summary.push(entry);
  }

  return finish(source, 'synced', { last_commit: commit }, out, summary);
}

async function finish(source, status, patch, message, summary) {
  const fields = { status };
  if (patch.last_commit !== undefined) fields.last_commit = patch.last_commit;
  const sets = ['status = ?'];
  const params = [status];
  if (fields.last_commit) { sets.push('last_commit = ?'); params.push(fields.last_commit); }
  sets.push('last_sync_at = ?'); params.push(new Date().toISOString());
  sets.push('message = ?'); params.push(message.slice(-2000) || null);
  await db.query(`UPDATE git_sources SET ${sets.join(', ')} WHERE id = ?`, [...params, source.id]);
  return { id: source.id, ...fields, message, summary };
}

/**
 * Push changes from a stack working directory back to the source repo.
 * The stack dir is treated as a git worktree of the source:
 * commit -a -m "message" and push to origin/<branch>.
 */
async function pushStack({ source, stack_dir, message }) {
  if (!fs.existsSync(stack_dir)) return { error: 'not_found', message: `Stack dir ${stack_dir} does not exist on the server` };
  if (!fs.existsSync(path.join(stack_dir, '.git'))) {
    return { error: 'not_a_repo', message: `${stack_dir} is not a git repository — run a sync first or init the stack's Git remote` };
  }
  const gitAuth = {
    sourceId: source.id,
    token: source.token,
    sshPrivateKey: source.ssh_private_key,
  };
  const add = await execGit(['add', '-A'], { cwd: stack_dir, ...gitAuth });
  const commit = await execGit(['commit', '-m', message || 'OpsSentinel sync'], { cwd: stack_dir, ...gitAuth });
  const push = await execGit(['push', 'origin', source.branch], { cwd: stack_dir, ...gitAuth });
  const out = [add.stderr, commit.stdout, commit.stderr, push.stdout, push.stderr].filter(Boolean).join('\n');
  const ok = push.code === 0;
  if (ok) {
    const head = await execGit(['rev-parse', 'HEAD'], { cwd: stack_dir });
    await db.query(
      `UPDATE git_sources SET status = ?, last_commit = ?, last_sync_at = ? WHERE id = ?`,
      ['pushed', head.code === 0 ? head.stdout.trim() : null, new Date().toISOString(), source.id]
    );
  }
  return { status: ok ? 'pushed' : 'error', message: out };
}

module.exports = { GIT_SYNC_DIR, listSources, createSource, getSource, updateSource, deleteSource, syncSource, pushStack };
