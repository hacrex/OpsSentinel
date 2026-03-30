const cron = require('node-cron');
const db = require('./db');
const logger = require('./logger');

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30', 10);

function startRetentionJob() {
  // Runs every day at midnight
  cron.schedule('0 0 * * *', () => {
    const sql = `DELETE FROM events WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`;
    const sqliteSql = `DELETE FROM events WHERE created_at < datetime('now', '-${RETENTION_DAYS} days')`;
    const isPostgres = !!process.env.DATABASE_URL;

    db.run(isPostgres ? sql : sqliteSql, [], (err) => {
      if (err) {
        logger.error({ err }, 'Retention job failed');
      } else {
        logger.info(`Retention job ran: deleted events older than ${RETENTION_DAYS} days`);
      }
    });
  });

  logger.info(`Data retention job scheduled (keeps last ${RETENTION_DAYS} days)`);
}

module.exports = { startRetentionJob };
