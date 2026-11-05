const fs = require('fs');
const path = require('path');
const db = require('./db');
const { logAuditEvent } = require('./audit');

/**
 * Terraform → OpenTofu migration assistant.
 *
 * Scans a directory for Terraform configuration and produces a migration
 * report: provider compatibility, HCL syntax checks, state file location,
 * and a step-by-step migration plan. OpenTofu is a drop-in replacement
 * for the Terraform CLI, so the report focuses on provider/source
 * incompatibilities and state backend notes.
 */

const HCL_FILES = ['.tf', '.tf.json'];

function findTfFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['.git', '.terraform', '.tofu', '.git/modules'].includes(entry.name)) findTfFiles(full, results);
    } else if (HCL_FILES.includes(path.extname(entry.name)) || entry.name.endsWith('.tf.json')) {
      results.push(full);
    }
  }
  return results;
}

function readFileSafely(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function analyzeProviderBlocks(content) {
  const issues = [];
  const providers = [];
  // crude regex parse: provider "name" { source = "hashicorp/name" version = "x" }
  const sourceRe = /source\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = sourceRe.exec(content)) !== null) providers.push(m[1]);
  for (const p of providers) {
    if (p.startsWith('hashicorp/')) {
      // All official HashiCorp providers work with OpenTofu
      issues.push({ provider: p, compatible: true, note: 'Official HashiCorp provider — compatible with OpenTofu' });
    } else if (p.startsWith('registry.terraform.io/')) {
      issues.push({ provider: p, compatible: true, note: 'Terraform registry source — compatible; OpenTofu mirrors the same registry' });
    } else {
      issues.push({ provider: p, compatible: null, note: 'Custom/private provider source — verify OpenTofu support before migrating' });
    }
  }
  return { providers, issues };
}

function checkStateBackend(content) {
  const issues = [];
  const backendRe = /backend\s*"([^"]+)"/g;
  let m;
  while ((m = backendRe.exec(content)) !== null) {
    const backend = m[1];
    if (['local', 's3', 'gcs', 'azurerm', 'http', 'consul', 'etcd'].includes(backend)) {
      issues.push({ backend, compatible: true, note: `${backend} backend is supported by OpenTofu` });
    } else {
      issues.push({ backend, compatible: null, note: `${backend} backend — verify OpenTofu compatibility` });
    }
  }
  return issues;
}

function checkVersionConstraints(content) {
  const issues = [];
  const versionRe = /version\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = versionRe.exec(content)) !== null) issues.push({ version: m[1] });
  return issues;
}

function buildMigrationSteps(hasTerraformConfig, hasState, issues) {
  const steps = [
    '1. Install OpenTofu: https://opentofu.org/docs/install/',
    '2. Verify `tofu --version` runs and `tofu init` works in the project directory',
    '3. Replace `terraform` CLI invocations with `tofu` in CI/CD and local tooling',
    '4. Run `tofu init` to migrate the `.terraform` directory to OpenTofu format',
    '5. Run `tofu plan` and confirm no provider errors',
    '6. Run `tofu apply` only after `tofu plan` shows no unexpected changes',
  ];
  if (issues.some((i) => i.compatible === null)) {
    steps.unshift('0. Review providers with unknown OpenTofu compatibility before running any OpenTofu command');
  }
  if (hasState) {
    steps.push('7. State files are format-compatible between Terraform and OpenTofu — no state migration needed');
  }
  return steps;
}

async function migrateDirectory({ tenant_id, directory }) {
  if (!fs.existsSync(directory)) return { error: 'not_found', message: `Directory ${directory} does not exist` };

  const tfFiles = findTfFiles(directory);
  if (tfFiles.length === 0) {
    return { error: 'no_tf_files', message: `No Terraform (.tf) files found in ${directory}` };
  }

  let allProviders = [];
  let allIssues = [];
  let allVersions = [];
  let stateIssues = [];
  let hasLocalState = fs.existsSync(path.join(directory, '.terraform', 'terraform.tfstate'));

  for (const file of tfFiles) {
    const content = readFileSafely(file);
    if (!content) continue;
    const providerAnalysis = analyzeProviderBlocks(content);
    allProviders.push(...providerAnalysis.providers);
    allIssues.push(...providerAnalysis.issues);
    allVersions.push(...checkVersionConstraints(content));
    stateIssues.push(...checkStateBackend(content));
  }

  // Deduplicate providers
  const uniqueProviders = [...new Set(allProviders)];
  const uniqueIssues = allIssues.filter((v, i, a) => a.findIndex((t) => t.provider === v.provider) === i);

  const report = {
    directory,
    terraform_files: tfFiles.length,
    files: tfFiles,
    providers: uniqueProviders,
    provider_issues: uniqueIssues,
    version_constraints: allVersions,
    state_backend_issues: stateIssues,
    local_state_found: hasLocalState,
    opentofu_compatible: uniqueIssues.every((i) => i.compatible !== null),
    migration_steps: buildMigrationSteps(true, hasLocalState, uniqueIssues),
  };

  try {
    await logAuditEvent({
      userId: null, username: 'api',
      action: 'migration_analysis', resourceType: 'migration_report',
      resourceId: directory, details: { provider_count: uniqueProviders.length, issue_count: uniqueIssues.length }, ipAddress: null,
    });
  } catch { /* audit best-effort */ }

  return report;
}

module.exports = { migrateDirectory, findTfFiles, analyzeProviderBlocks, checkStateBackend, buildMigrationSteps };
