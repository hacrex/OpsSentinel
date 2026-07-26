const cron = require('node-cron');
const db = require('./db');
const logger = require('./logger');

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30', 10);

async function runRetention() {
  const isPostgres = !!process.env.DATABASE_URL;

  try {
    if (isPostgres) {
      await db.query(
        `DELETE FROM events WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
        [RETENTION_DAYS]
      );
    } else {
      await db.query(
        `DELETE FROM events WHERE created_at < datetime('now', '-' || ? || ' days')`,
        [RETENTION_DAYS]
      );
    }
    logger.info(`Retention job ran: deleted events older than ${RETENTION_DAYS} days`);
  } catch (err) {
    logger.error({ err }, 'Retention job failed');
  }
}

function startRetentionJob() {
  cron.schedule('0 0 * * *', runRetention);
  logger.info(`Data retention job scheduled (keeps last ${RETENTION_DAYS} days)`);
}

module.exports = { startRetentionJob };
