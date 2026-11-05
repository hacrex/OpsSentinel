/**
 * Input validation and sanitization for infrastructure operations.
 *
 * Defense-in-depth: spawn() is called with an args array (no shell), so
 * classic shell injection (`; rm -rf /`) cannot execute through arg
 * passing. However, user-supplied values can still:
 *  - break HCL/JSON parsing when injected as `-var key=value`
 *  - reach shell-based stages (bash/pwsh) in pipelines
 *  - cause path traversal in file/export operations
 *
 * Every user-controlled value is validated before it reaches a child
 * process or filesystem operation.
 */

const path = require('path');

// HCL / Terraform identifier pattern: letter or underscore, then
// alphanumerics, underscores, hyphens, dots.
const VAR_KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
// Control characters and null bytes are never valid in a var value or arg.
// Printable shell metacharacters are allowed since spawn() uses an args
// array (no shell) — they are passed literally to the IaC binary.
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

// Maximum length for any single var value (prevents abuse)
const MAX_VAR_VALUE_LEN = 64 * 1024;

/** Validate a variable key is a safe identifier. */
function validateVarKey(key) {
  if (typeof key !== 'string' || !VAR_KEY_RE.test(key)) {
    return { ok: false, error: `Invalid variable key: "${key}". Keys must match [A-Za-z_][A-Za-z0-9_.-]*` };
  }
  return { ok: true };
}

/** Validate a variable value: no control characters, bounded length. */
function validateVarValue(value) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return { ok: false, error: 'Variable value must be a string, number, or boolean' };
  }
  const str = String(value);
  if (str.length > MAX_VAR_VALUE_LEN) {
    return { ok: false, error: `Variable value exceeds ${MAX_VAR_VALUE_LEN} characters` };
  }
  if (CONTROL_CHARS.test(str)) {
    return { ok: false, error: 'Variable value contains control characters' };
  }
  return { ok: true };
}

/** Sanitize and validate a full vars object. Returns { ok, vars, errors }. */
function validateVars(vars = {}) {
  const errors = [];
  const safe = {};
  for (const [k, v] of Object.entries(vars)) {
    const kOk = validateVarKey(k);
    if (!kOk.ok) { errors.push(kOk.error); continue; }
    const vOk = validateVarValue(v);
    if (!vOk.ok) { errors.push(`${k}: ${vOk.error}`); continue; }
    safe[k] = v;
  }
  return { ok: errors.length === 0, vars: safe, errors };
}

/** Validate a pipeline script body. Rejects empty/null and extreme size. */
function validateScript(script) {
  if (typeof script !== 'string' || script.trim().length === 0) {
    return { ok: false, error: 'Script must be a non-empty string' };
  }
  if (script.length > 64 * 1024) {
    return { ok: false, error: 'Script exceeds 64 KiB limit' };
  }
  return { ok: true };
}

/**
 * Validate a working directory path against traversal.
 * Resolves against an allowed base directory and rejects escapes.
 */
function validateWorkingDir(workingDir, allowedBase = process.cwd()) {
  if (typeof workingDir !== 'string' || workingDir.trim().length === 0) {
    return { ok: false, error: 'working_dir is required' };
  }
  const resolved = path.resolve(allowedBase, workingDir);
  const baseResolved = path.resolve(allowedBase);
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
    return { ok: false, error: 'working_dir escapes the allowed base directory' };
  }
  return { ok: true, resolved };
}

module.exports = { validateVarKey, validateVarValue, validateVars, validateScript, validateWorkingDir };
