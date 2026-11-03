const path = require('path');
const { Pool } = require('pg');

const isPostgres = !!process.env.DATABASE_URL;

let db;

const CREATE_TABLE_PG = `
  CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    webhook_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    github_id VARCHAR(255) UNIQUE,
    sso_id VARCHAR(255) UNIQUE,
    sso_provider VARCHAR(50),
    username VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    tenant_id INTEGER REFERENCES tenants(id),
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    workflow_name VARCHAR(255),
    status VARCHAR(255),
    conclusion VARCHAR(255),
    run_url TEXT,
    mttr_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_events_repo_name ON events(repo_name);
  CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_conclusion ON events(conclusion);

  CREATE TABLE IF NOT EXISTS infrastructure_runs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    stack_name VARCHAR(255),
    engine VARCHAR(50),
    operation VARCHAR(50),
    status VARCHAR(50),
    conclusion VARCHAR(50),
    output_url TEXT,
    mttr_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_infra_runs_tenant_id ON infrastructure_runs(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_repo_name ON infrastructure_runs(repo_name);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_stack_name ON infrastructure_runs(stack_name);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_created_at ON infrastructure_runs(created_at);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_conclusion ON infrastructure_runs(conclusion);

  CREATE TABLE IF NOT EXISTS stacks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    stack_name VARCHAR(255),
    engine VARCHAR(50),
    working_dir TEXT,
    default_vars JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_stacks_tenant_id ON stacks(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_stacks_repo_name ON stacks(repo_name);
  CREATE INDEX IF NOT EXISTS idx_stacks_stack_name ON stacks(stack_name);

  CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    title VARCHAR(255),
    description TEXT,
    severity VARCHAR(50),
    status VARCHAR(50),
    repo_name VARCHAR(255),
    stack_name VARCHAR(255),
    workflow_name VARCHAR(255),
    failure_fingerprint_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_incidents_tenant_id ON incidents(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
  CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
  CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);

  CREATE TABLE IF NOT EXISTS secrets (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    name VARCHAR(255),
    value TEXT,
    provider VARCHAR(50),
    scope VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_secrets_tenant_id ON secrets(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
  CREATE INDEX IF NOT EXISTS idx_secrets_provider ON secrets(provider);

  CREATE TABLE IF NOT EXISTS configuration_runs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    tool VARCHAR(50),
    playbook VARCHAR(255),
    inventory VARCHAR(255),
    status VARCHAR(50),
    conclusion VARCHAR(50),
    output_url TEXT,
    mttr_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_config_runs_tenant_id ON configuration_runs(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_config_runs_repo_name ON configuration_runs(repo_name);
  CREATE INDEX IF NOT EXISTS idx_config_runs_tool ON configuration_runs(tool);
  CREATE INDEX IF NOT EXISTS idx_config_runs_created_at ON configuration_runs(created_at);
  CREATE INDEX IF NOT EXISTS idx_config_runs_conclusion ON configuration_runs(conclusion);

  CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    name VARCHAR(255),
    description TEXT,
    condition TEXT,
    action VARCHAR(50),
    requires_approval BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_policies_tenant_id ON policies(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);

  CREATE TABLE IF NOT EXISTS failure_fingerprints (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    fingerprint_hash VARCHAR(255) UNIQUE,
    category VARCHAR(100),
    category_label VARCHAR(255),
    root_cause TEXT,
    suggested_fix TEXT,
    occurrence_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    repositories TEXT,
    workflows TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.00
  );

  CREATE INDEX IF NOT EXISTS idx_fingerprints_tenant_id ON failure_fingerprints(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON failure_fingerprints(fingerprint_hash);
  CREATE INDEX IF NOT EXISTS idx_fingerprints_category ON failure_fingerprints(category);

  CREATE TABLE IF NOT EXISTS remediation_actions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    fingerprint_hash VARCHAR(255),
    incident_id INTEGER,
    action_type VARCHAR(50),
    action_name VARCHAR(255),
    status VARCHAR(50),
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    result TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_remediation_tenant_id ON remediation_actions(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_remediation_fingerprint ON remediation_actions(fingerprint_hash);
  CREATE INDEX IF NOT EXISTS idx_remediation_incident ON remediation_actions(incident_id);
  CREATE INDEX IF NOT EXISTS idx_remediation_status ON remediation_actions(status);

  CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    workflow_name VARCHAR(255),
    stack_name VARCHAR(255),
    prediction_type VARCHAR(50),
    target_entity VARCHAR(255),
    probability REAL,
    risk_level VARCHAR(50),
    reasons TEXT,
    recommended_action TEXT,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_predictions_tenant_id ON predictions(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_predictions_repo_name ON predictions(repo_name);
  CREATE INDEX IF NOT EXISTS idx_predictions_target ON predictions(target_entity);
  CREATE INDEX IF NOT EXISTS idx_predictions_risk ON predictions(risk_level);

  CREATE TABLE IF NOT EXISTS drift_events (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    stack_name VARCHAR(255),
    engine VARCHAR(50),
    drift_type VARCHAR(50),
    resource_type VARCHAR(255),
    resource_name VARCHAR(255),
    expected_state TEXT,
    actual_state TEXT,
    status VARCHAR(50),
    severity VARCHAR(50),
    source_commit VARCHAR(255),
    recommended_action TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_drift_tenant_id ON drift_events(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_drift_stack ON drift_events(stack_name);
  CREATE INDEX IF NOT EXISTS idx_drift_engine ON drift_events(engine);
  CREATE INDEX IF NOT EXISTS idx_drift_status ON drift_events(status);
  CREATE INDEX IF NOT EXISTS idx_drift_severity ON drift_events(severity);
`;

const CREATE_TABLE_SQLITE = `
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    webhook_secret TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id TEXT UNIQUE,
    sso_id TEXT UNIQUE,
    sso_provider TEXT,
    username TEXT,
    email TEXT,
    avatar_url TEXT,
    tenant_id INTEGER,
    role TEXT DEFAULT 'viewer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    repo_name TEXT,
    workflow_name TEXT,
    status TEXT,
    conclusion TEXT,
    run_url TEXT,
    mttr_seconds INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_events_repo_name ON events(repo_name);
  CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_conclusion ON events(conclusion);

  CREATE TABLE IF NOT EXISTS infrastructure_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    repo_name TEXT,
    stack_name TEXT,
    engine TEXT,
    operation TEXT,
    status TEXT,
    conclusion TEXT,
    output_url TEXT,
    mttr_seconds INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_infra_runs_tenant_id ON infrastructure_runs(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_repo_name ON infrastructure_runs(repo_name);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_stack_name ON infrastructure_runs(stack_name);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_created_at ON infrastructure_runs(created_at);
  CREATE INDEX IF NOT EXISTS idx_infra_runs_conclusion ON infrastructure_runs(conclusion);

  CREATE TABLE IF NOT EXISTS stacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    repo_name TEXT,
    stack_name TEXT,
    engine TEXT,
    working_dir TEXT,
    default_vars TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_stacks_tenant_id ON stacks(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_stacks_repo_name ON stacks(repo_name);
  CREATE INDEX IF NOT EXISTS idx_stacks_stack_name ON stacks(stack_name);

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    title TEXT,
    description TEXT,
    severity TEXT,
    status TEXT,
    repo_name TEXT,
    stack_name TEXT,
    workflow_name TEXT,
    failure_fingerprint_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_incidents_tenant_id ON incidents(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
  CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
  CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);

  CREATE TABLE IF NOT EXISTS secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    name TEXT,
    value TEXT,
    provider TEXT,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_secrets_tenant_id ON secrets(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
  CREATE INDEX IF NOT EXISTS idx_secrets_provider ON secrets(provider);

  CREATE TABLE IF NOT EXISTS configuration_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    repo_name TEXT,
    tool TEXT,
    playbook TEXT,
    inventory TEXT,
    status TEXT,
    conclusion TEXT,
    output_url TEXT,
    mttr_seconds INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_config_runs_tenant_id ON configuration_runs(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_config_runs_repo_name ON configuration_runs(repo_name);
  CREATE INDEX IF NOT EXISTS idx_config_runs_tool ON configuration_runs(tool);
  CREATE INDEX IF NOT EXISTS idx_config_runs_created_at ON configuration_runs(created_at);
  CREATE INDEX IF NOT EXISTS idx_config_runs_conclusion ON configuration_runs(conclusion);

  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    name TEXT,
    description TEXT,
    condition TEXT,
    action TEXT,
    requires_approval BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_policies_tenant_id ON policies(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);

  CREATE TABLE IF NOT EXISTS failure_fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    fingerprint_hash TEXT UNIQUE,
    category TEXT,
    category_label TEXT,
    root_cause TEXT,
    suggested_fix TEXT,
    occurrence_count INTEGER DEFAULT 1,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    repositories TEXT,
    workflows TEXT,
    confidence_score REAL DEFAULT 0.0
  );

  CREATE INDEX IF NOT EXISTS idx_fingerprints_tenant_id ON failure_fingerprints(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON failure_fingerprints(fingerprint_hash);
  CREATE INDEX IF NOT EXISTS idx_fingerprints_category ON failure_fingerprints(category);

  CREATE TABLE IF NOT EXISTS remediation_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    fingerprint_hash VARCHAR(255),
    incident_id INTEGER,
    action_type VARCHAR(50),
    action_name VARCHAR(255),
    status VARCHAR(50),
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    result TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_remediation_tenant_id ON remediation_actions(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_remediation_fingerprint ON remediation_actions(fingerprint_hash);
  CREATE INDEX IF NOT EXISTS idx_remediation_incident ON remediation_actions(incident_id);
  CREATE INDEX IF NOT EXISTS idx_remediation_status ON remediation_actions(status);

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    workflow_name VARCHAR(255),
    stack_name VARCHAR(255),
    prediction_type VARCHAR(50),
    target_entity VARCHAR(255),
    probability REAL,
    risk_level VARCHAR(50),
    reasons TEXT,
    recommended_action TEXT,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_predictions_tenant_id ON predictions(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_predictions_repo_name ON predictions(repo_name);
  CREATE INDEX IF NOT EXISTS idx_predictions_target ON predictions(target_entity);
  CREATE INDEX IF NOT EXISTS idx_predictions_risk ON predictions(risk_level);

  CREATE TABLE IF NOT EXISTS drift_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    repo_name VARCHAR(255),
    stack_name VARCHAR(255),
    engine VARCHAR(50),
    drift_type VARCHAR(50),
    resource_type VARCHAR(255),
    resource_name VARCHAR(255),
    expected_state TEXT,
    actual_state TEXT,
    status VARCHAR(50),
    severity VARCHAR(50),
    source_commit VARCHAR(255),
    recommended_action TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_drift_tenant_id ON drift_events(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_drift_stack ON drift_events(stack_name);
  CREATE INDEX IF NOT EXISTS idx_drift_engine ON drift_events(engine);
  CREATE INDEX IF NOT EXISTS idx_drift_status ON drift_events(status);
  CREATE INDEX IF NOT EXISTS idx_drift_severity ON drift_events(severity);
`;

// Convert SQLite ? placeholders to PostgreSQL $1, $2, ...
function toPostgresSQL(sql) {
  let i = 1;
  return sql.replace(/\?/g, () => '$' + (i++));
}

async function connectWithRetry(pool, retries = 10, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query(CREATE_TABLE_PG);
      try {
        await client.query("ALTER TABLE events ADD COLUMN tenant_id INTEGER");
      } catch (err) { /* ignore if column exists */ }
      // Create indexes if they don't exist
      await client.query("CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id)");
      await client.query("CREATE INDEX IF NOT EXISTS idx_events_repo_name ON events(repo_name)");
      await client.query("CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)");
      await client.query("CREATE INDEX IF NOT EXISTS idx_events_conclusion ON events(conclusion)");
      client.release();
      console.log('Connected to the PostgreSQL database.');
      return;
    } catch (err) {
      console.error(`PostgreSQL connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        console.error('Could not connect to PostgreSQL. Exiting.');
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

if (isPostgres) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  connectWithRetry(pool);

  db = {
    run: (sql, params, callback) => {
      const pgSql = toPostgresSQL(sql);
      pool.query(pgSql, params, (err, res) => {
        if (callback) callback.call({ lastID: res?.rows?.[0]?.id ?? null }, err, res);
      });
    },
    all: (sql, params, callback) => {
      const pgSql = toPostgresSQL(sql);
      pool.query(pgSql, params, (err, res) => {
        if (callback) callback(err, res ? res.rows : null);
      });
    },
    // Promise-based query for use in async routes
    query: (sql, params) => {
      const pgSql = toPostgresSQL(sql);
      return pool.query(pgSql, params);
    },
    close: (callback) => {
      pool.end().then(() => callback?.()).catch(() => callback?.());
    },
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      sqliteDb.exec(CREATE_TABLE_SQLITE, (err) => {
        if (!err) {
          sqliteDb.run("ALTER TABLE events ADD COLUMN tenant_id INTEGER", () => {});
          sqliteDb.run("ALTER TABLE users ADD COLUMN sso_id TEXT", () => {});
          sqliteDb.run("ALTER TABLE users ADD COLUMN sso_provider TEXT", () => {});
          sqliteDb.run("ALTER TABLE users ADD COLUMN email TEXT", () => {});
          // Create indexes if they don't exist
          sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id)", () => {});
          sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_events_repo_name ON events(repo_name)", () => {});
          sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)", () => {});
          sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_events_conclusion ON events(conclusion)", () => {});
        }
      });
    }
  });

  sqliteDb.query = (sql, params) =>
    new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    });

  sqliteDb.close = (callback) => {
    sqliteDb.close((err) => {
      if (callback) callback(err);
    });
  };

  db = sqliteDb;
}

module.exports = db;
