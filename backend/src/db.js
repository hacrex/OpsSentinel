const path = require('path');
const { Pool } = require('pg');

const isPostgres = !!process.env.DATABASE_URL;

let db;

const CREATE_TABLE_PG = `
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    repo_name VARCHAR(255),
    workflow_name VARCHAR(255),
    status VARCHAR(255),
    conclusion VARCHAR(255),
    run_url TEXT,
    mttr_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

const CREATE_TABLE_SQLITE = `
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_name TEXT,
    workflow_name TEXT,
    status TEXT,
    conclusion TEXT,
    run_url TEXT,
    mttr_seconds INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
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
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      sqliteDb.run(CREATE_TABLE_SQLITE);
    }
  });

  sqliteDb.query = (sql, params) =>
    new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    });

  db = sqliteDb;
}

module.exports = db;
