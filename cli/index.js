#!/usr/bin/env node
'use strict';

const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

// ── Configuration ──────────────────────────────────────────────────────────
const CONFIG_FILE = require('os').homedir() + '/.opsctl/config.json';
const DEFAULT_API_URL = 'http://localhost:3001';

let config = {
  apiUrl: DEFAULT_API_URL,
  token: null,
};

function loadConfig() {
  try {
    const fs = require('fs');
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    // Ignore config load errors, use defaults
  }
}

function saveConfig() {
  const fs = require('fs');
  const path = require('path');
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getApiUrl() {
  return config.apiUrl || DEFAULT_API_URL;
}

function getToken() {
  return config.token;
}

function setToken(token) {
  config.token = token;
  saveConfig();
}

function clearToken() {
  config.token = null;
  saveConfig();
}

function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function printTable(headers, rows) {
  const table = new Table({
    head: headers.map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
      'padding-left': 1,
      'padding-right': 1,
    },
  });
  rows.forEach((row) => table.push(row));
  console.log(table.toString());
}

function formatTs(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts.endsWith('Z') ? ts : ts + 'Z').toLocaleString();
  } catch {
    return ts;
  }
}

function formatMttr(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

// ── Commands ───────────────────────────────────────────────────────────────

async function cmdLogin(args) {
  const [code] = args;
  if (!code) {
    console.error(chalk.red('Usage: opsctl login <github-oauth-code>'));
    process.exit(1);
  }

  const spinner = ora('Logging in...').start();
  try {
    const res = await axios.post(`${getApiUrl()}/auth/github`, { code });
    const { token } = res.data; // backend sets cookie; we also accept token in body for CLI
    if (token) {
      setToken(token);
      spinner.succeed(chalk.green('Logged in successfully'));
    } else {
      spinner.warn(chalk.yellow('Login completed but no token received (cookie-based auth)'));
    }
    console.log(chalk.gray('Run: opsctl whoami'));
  } catch (err) {
    spinner.fail(chalk.red('Login failed'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdLogout() {
  clearToken();
  console.log(chalk.green('Logged out'));
}

async function cmdWhoami() {
  const spinner = ora('Checking auth...').start();
  try {
    const res = await axios.get(`${getApiUrl()}/auth/me`, { headers: apiHeaders() });
    spinner.succeed(chalk.green('Authenticated'));
    console.log(chalk.gray(JSON.stringify(res.data, null, 2)));
  } catch (err) {
    spinner.fail(chalk.red('Not authenticated'));
    console.error(chalk.gray('Run: opsctl login <code>'));
    process.exit(1);
  }
}

async function cmdRepos() {
  const spinner = ora('Fetching repos...').start();
  try {
    const res = await axios.get(`${getApiUrl()}/repos`, { headers: apiHeaders() });
    spinner.stop();
    const repos = res.data || [];
    if (repos.length === 0) {
      console.log(chalk.gray('No repositories found'));
      return;
    }
    printTable(['Repository'], repos.map((r) => [r]));
  } catch (err) {
    spinner.fail(chalk.red('Failed to fetch repos'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdWorkflows(args) {
  const [repo] = args;
  if (!repo) {
    console.error(chalk.red('Usage: opsctl workflows <repo>'));
    process.exit(1);
  }

  const spinner = ora(`Fetching workflows for ${repo}...`).start();
  try {
    const res = await axios.get(`${getApiUrl()}/repos/${encodeURIComponent(repo)}/stats`, {
      headers: apiHeaders(),
    });
    spinner.stop();
    const data = res.data || {};
    console.log(chalk.bold(`Repository: ${data.repo_name || repo}`));
    console.log(chalk.gray(`Total runs: ${data.total_runs || 0}`));
    console.log(chalk.gray(`Failed runs: ${data.failed_runs || 0}`));
    console.log(chalk.gray(`Success rate: ${data.success_rate || '100.0'}%`));
    console.log(chalk.gray(`Avg MTTR: ${formatMttr(data.avg_mttr_seconds)}`));

    if (data.flaky_workflows && data.flaky_workflows.length > 0) {
      console.log(chalk.yellow(`\nFlaky workflows: ${data.flaky_workflows.join(', ')}`));
    }

    if (data.recent_runs && data.recent_runs.length > 0) {
      console.log(chalk.bold('\nRecent runs:'));
      printTable(
        ['ID', 'Workflow', 'Status', 'Conclusion', 'MTTR', 'Time'],
        data.recent_runs.map((r) => [
          String(r.id).padStart(4, '0'),
          r.workflow_name,
          r.status,
          r.conclusion || 'PENDING',
          formatMttr(r.mttr_seconds),
          formatTs(r.created_at),
        ])
      );
    }
  } catch (err) {
    spinner.fail(chalk.red('Failed to fetch workflows'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdInfra(args) {
  const [repo, stack] = args;
  if (!repo || !stack) {
    console.error(chalk.red('Usage: opsctl infra <repo> <stack>'));
    process.exit(1);
  }

  const spinner = ora(`Fetching infra stats for ${repo}/${stack}...`).start();
  try {
    const res = await axios.get(
      `${getApiUrl()}/infrastructure/stats/${encodeURIComponent(repo)}/${encodeURIComponent(stack)}`,
      { headers: apiHeaders() }
    );
    spinner.stop();
    const data = res.data || {};
    console.log(chalk.bold(`Stack: ${data.repo_name || repo}/${data.stack_name || stack}`));
    console.log(chalk.gray(`Total runs: ${data.total_runs || 0}`));
    console.log(chalk.gray(`Failed runs: ${data.failed_runs || 0}`));
    console.log(chalk.gray(`Success rate: ${data.success_rate || '100.0'}%`));

    if (data.flaky_operations && data.flaky_operations.length > 0) {
      console.log(chalk.yellow(`\nFlaky operations: ${data.flaky_operations.join(', ')}`));
    }

    if (data.recent_runs && data.recent_runs.length > 0) {
      console.log(chalk.bold('\nRecent runs:'));
      printTable(
        ['ID', 'Engine', 'Operation', 'Status', 'Conclusion', 'Time'],
        data.recent_runs.map((r) => [
          String(r.id).padStart(4, '0'),
          r.engine,
          r.operation,
          r.status,
          r.conclusion || 'PENDING',
          formatTs(r.created_at),
        ])
      );
    }
  } catch (err) {
    spinner.fail(chalk.red('Failed to fetch infra stats'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdInfraRuns(args) {
  const [engine, operation] = args;
  const params = {};
  if (engine) params.engine = engine;
  if (operation) params.operation = operation;

  const spinner = ora('Fetching infra runs...').start();
  try {
    const res = await axios.get(`${getApiUrl()}/infrastructure/runs`, {
      headers: apiHeaders(),
      params,
    });
    spinner.stop();
    const data = res.data || {};
    const runs = data.data || [];
    if (runs.length === 0) {
      console.log(chalk.gray('No infra runs found'));
      return;
    }
    printTable(
      ['ID', 'Repo', 'Stack', 'Engine', 'Operation', 'Status', 'Conclusion', 'Time'],
      runs.map((r) => [
        String(r.id).padStart(4, '0'),
        r.repo_name,
        r.stack_name,
        r.engine,
        r.operation,
        r.status,
        r.conclusion || 'PENDING',
        formatTs(r.created_at),
      ])
    );
  } catch (err) {
    spinner.fail(chalk.red('Failed to fetch infra runs'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdIncidents(args) {
  const [status] = args;
  const params = {};
  if (status) params.status = status;

  const spinner = ora('Fetching incidents...').start();
  try {
    const res = await axios.get(`${getApiUrl()}/incidents`, {
      headers: apiHeaders(),
      params,
    });
    spinner.stop();
    const data = res.data || {};
    const incidents = data.data || [];
    if (incidents.length === 0) {
      console.log(chalk.gray('No incidents found'));
      return;
    }
    printTable(
      ['ID', 'Title', 'Severity', 'Status', 'Repo/Stack', 'Time'],
      incidents.map((i) => [
        String(i.id).padStart(4, '0'),
        i.title,
        i.severity,
        i.status,
        `${i.repo_name || '—'}${i.stack_name ? '/' + i.stack_name : ''}`,
        formatTs(i.created_at),
      ])
    );
  } catch (err) {
    spinner.fail(chalk.red('Failed to fetch incidents'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdIncidentShow(args) {
  const [id] = args;
  if (!id) {
    console.error(chalk.red('Usage: opsctl incident <id>'));
    process.exit(1);
  }

  const spinner = ora(`Fetching incident ${id}...`).start();
  try {
    const res = await axios.get(`${getApiUrl()}/incidents/${id}`, {
      headers: apiHeaders(),
    });
    spinner.stop();
    console.log(chalk.bold(JSON.stringify(res.data, null, 2)));
  } catch (err) {
    spinner.fail(chalk.red('Failed to fetch incident'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdRerun(args) {
  const [type, id] = args;
  if (!type || !id) {
    console.error(chalk.red('Usage: opsctl rerun <workflow|infra> <id>'));
    process.exit(1);
  }

  const spinner = ora(`Re-running ${type} ${id}...`).start();
  try {
    if (type === 'workflow') {
      // Need run_url from events - for CLI simplicity, we accept run_id and look up
      console.error(chalk.yellow('Workflow rerun requires run_url. Use opsctl workflows <repo> to find runs.'));
      process.exit(1);
    } else if (type === 'infra') {
      await axios.post(`${getApiUrl()}/infrastructure/rerun`, { run_id: parseInt(id) }, { headers: apiHeaders() });
    } else {
      console.error(chalk.red(`Unknown type: ${type}. Use 'workflow' or 'infra'.`));
      process.exit(1);
    }
    spinner.succeed(chalk.green(`Re-run triggered for ${type} ${id}`));
  } catch (err) {
    spinner.fail(chalk.red('Re-run failed'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdInfraTrigger(args) {
  const [repo, stack, engine, operation, workingDir] = args;
  if (!repo || !stack || !engine || !operation) {
    console.error(chalk.red('Usage: opsctl infra-trigger <repo> <stack> <engine> <operation> [workingDir]'));
    process.exit(1);
  }

  const spinner = ora(`Triggering ${engine}:${operation} for ${repo}/${stack}...`).start();
  try {
    await axios.post(
      `${getApiUrl()}/infrastructure/runs`,
      {
        repo_name: repo,
        stack_name: stack,
        engine,
        operation,
        workingDir: workingDir || `./infra/${stack}`,
        vars: {},
      },
      { headers: apiHeaders() }
    );
    spinner.succeed(chalk.green('Infrastructure run triggered'));
  } catch (err) {
    spinner.fail(chalk.red('Failed to trigger infra run'));
    console.error(chalk.red(err.response?.data?.error || err.message));
    process.exit(1);
  }
}

async function cmdSecrets(args) {
  const [action] = args;
  if (!action) {
    console.error(chalk.red('Usage: opsctl secrets <list|create|delete> [args...]'));
    process.exit(1);
  }

  if (action === 'list') {
    const spinner = ora('Fetching secrets...').start();
    try {
      const res = await axios.get(`${getApiUrl()}/secrets`, { headers: apiHeaders() });
      spinner.stop();
      const secrets = res.data.data || [];
      if (secrets.length === 0) {
        console.log(chalk.gray('No secrets found'));
        return;
      }
      printTable(
        ['ID', 'Name', 'Provider', 'Scope', 'Updated'],
        secrets.map((s) => [
          String(s.id).padStart(4, '0'),
          s.name,
          s.provider,
          s.scope,
          formatTs(s.updated_at || s.created_at),
        ])
      );
    } catch (err) {
      spinner.fail(chalk.red('Failed to fetch secrets'));
      console.error(chalk.red(err.response?.data?.error || err.message));
      process.exit(1);
    }
  } else if (action === 'create') {
    const [name, value, provider, scope] = args.slice(1);
    if (!name || !value || !provider || !scope) {
      console.error(chalk.red('Usage: opsctl secrets create <name> <value> <provider> <scope>'));
      process.exit(1);
    }
    const spinner = ora('Creating secret...').start();
    try {
      await axios.post(
        `${getApiUrl()}/secrets`,
        { name, value, provider, scope },
        { headers: apiHeaders() }
      );
      spinner.succeed(chalk.green('Secret created'));
    } catch (err) {
      spinner.fail(chalk.red('Failed to create secret'));
      console.error(chalk.red(err.response?.data?.error || err.message));
      process.exit(1);
    }
  } else if (action === 'delete') {
    const [id] = args.slice(1);
    if (!id) {
      console.error(chalk.red('Usage: opsctl secrets delete <id>'));
      process.exit(1);
    }
    const spinner = ora('Deleting secret...').start();
    try {
      await axios.delete(`${getApiUrl()}/secrets/${id}`, { headers: apiHeaders() });
      spinner.succeed(chalk.green('Secret deleted'));
    } catch (err) {
      spinner.fail(chalk.red('Failed to delete secret'));
      console.error(chalk.red(err.response?.data?.error || err.message));
      process.exit(1);
    }
  } else {
    console.error(chalk.red(`Unknown secrets action: ${action}`));
    process.exit(1);
  }
}

async function cmdSetApi(url) {
  if (!url) {
    console.log(chalk.gray(`Current API URL: ${getApiUrl()}`));
    return;
  }
  config.apiUrl = url;
  saveConfig();
  console.log(chalk.green(`API URL set to ${url}`));
}

// ── Router ─────────────────────────────────────────────────────────────────

const command = process.argv[2];
const args = process.argv.slice(3);

loadConfig();

switch (command) {
  case 'login':
    cmdLogin(args);
    break;
  case 'logout':
    cmdLogout();
    break;
  case 'whoami':
    cmdWhoami();
    break;
  case 'repos':
    cmdRepos();
    break;
  case 'workflows':
    cmdWorkflows(args);
    break;
  case 'infra':
    cmdInfra(args);
    break;
  case 'infra-runs':
    cmdInfraRuns(args);
    break;
  case 'infra-trigger':
    cmdInfraTrigger(args);
    break;
  case 'incidents':
    cmdIncidents(args);
    break;
  case 'incident':
    cmdIncidentShow(args);
    break;
  case 'rerun':
    cmdRerun(args);
    break;
  case 'secrets':
    cmdSecrets(args);
    break;
  case 'api':
    cmdSetApi(args[0]);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    console.log(chalk.bold('OpsSentinel CLI (opsctl)'));
    console.log(chalk.gray('Version: 1.0.0\n'));
    console.log('Usage: opsctl <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  login <code>              Authenticate with GitHub OAuth code');
    console.log('  logout                    Clear stored credentials');
    console.log('  whoami                    Check authentication status');
    console.log('  repos                     List repositories');
    console.log('  workflows <repo>          Show workflow stats for a repo');
    console.log('  infra <repo> <stack>      Show infra stack stats');
    console.log('  infra-runs [engine] [op]  List infrastructure runs');
    console.log('  infra-trigger <repo> <stack> <engine> <op> [dir]  Trigger an infra run');
    console.log('  rerun <workflow|infra> <id>  Re-run a workflow or infra run');
    console.log('  incidents [status]        List incidents');
    console.log('  incident <id>             Show incident details');
    console.log('  secrets <list|create|del> Manage secrets');
    console.log('  api [url]                 Set or show API URL');
    console.log('  help                      Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  opsctl login abc123def456');
    console.log('  opsctl workflows my-org/my-repo');
    console.log('  opsctl infra my-org/my-repo production tofu plan');
    console.log('  opsctl infra-trigger my-org/my-repo production tofu apply ./infra/prod');
    console.log('  opsctl incidents');
    console.log('  opsctl secrets list');
    break;
  default:
    console.error(chalk.red(`Unknown command: ${command}`));
    console.error(chalk.gray('Run: opsctl help'));
    process.exit(1);
}
