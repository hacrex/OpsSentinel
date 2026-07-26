const db = require('./db');
const logger = require('./logger');

const CREATE_AUDIT_LOGS_PG = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
`;

const CREATE_AUDIT_LOGS_SQLITE = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
`;

async function initAuditTable() {
  const isPostgres = !!process.env.DATABASE_URL;
  const sql = isPostgres ? CREATE_AUDIT_LOGS_PG : CREATE_AUDIT_LOGS_SQLITE;
  
  try {
    if (isPostgres) {
      const { Pool } = require('pg');
      // Use the same pool connection approach
      await db.query(sql);
    } else {
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const dbPath = path.resolve(__dirname, '../../database.sqlite');
      const sqliteDb = new sqlite3.Database(dbPath);
      await new Promise((resolve, reject) => {
        sqliteDb.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      sqliteDb.close();
    }
    logger.info('Audit logs table initialized');
  } catch (err) {
    // Table might already exist
    logger.warn({ err }, 'Audit table init warning (may already exist)');
  }
}

async function logAuditEvent({ userId, username, action, resourceType, resourceId, details, ipAddress }) {
  try {
    const isPostgres = !!process.env.DATABASE_URL;
    const detailsJson = details ? JSON.stringify(details) : null;
    
    if (isPostgres) {
      await db.query(
        `INSERT INTO audit_logs (user_id, username, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, username, action, resourceType, resourceId, detailsJson, ipAddress]
      );
    } else {
      await db.query(
        `INSERT INTO audit_logs (user_id, username, action, resource_type, resource_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, action, resourceType, resourceId, detailsJson, ipAddress]
      );
    }
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log');
  }
}

async function getAuditLogs({ page = 1, limit = 50, userId, action, startDate, endDate } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (startDate) { conditions.push('created_at >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('created_at <= ?'); params.push(endDate); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const isPostgres = !!process.env.DATABASE_URL;

  const countResult = await db.query(
    `SELECT COUNT(*) as cnt FROM audit_logs ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.cnt ?? 0, 10);

  const dataResult = await db.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

module.exports = { initAuditTable, logAuditEvent, getAuditLogs };
