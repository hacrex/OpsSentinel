const path = require('path');
const { Pool } = require('pg');

const isPostgres = !!process.env.DATABASE_URL;

let db;

if (isPostgres) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to PostgreSQL database', err.stack);
    } else {
      console.log('Connected to the PostgreSQL database.');
      client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          repo_name VARCHAR(255),
          workflow_name VARCHAR(255),
          status VARCHAR(255),
          conclusion VARCHAR(255),
          run_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating table', err);
        release();
      });
    }
  });

  db = {
    run: (sql, params, callback) => {
      // Convert SQLite ? syntax to PostgreSQL $1, $2, etc.
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      pool.query(pgSql, params, (err, res) => {
        if (callback) callback(err, res);
      });
    },
    all: (sql, params, callback) => {
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      pool.query(pgSql, params, (err, res) => {
        if (callback) callback(err, res ? res.rows : null);
      });
    }
  };

} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_name TEXT,
        workflow_name TEXT,
        status TEXT,
        conclusion TEXT,
        run_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    }
  });
  db = sqliteDb;
}

module.exports = db;
