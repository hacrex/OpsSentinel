const cron = require('node-cron');
const db = require('./db');
const logger = require('./logger');

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30', 10);

function startRetentionJob() {
  // Runs every day at midnight
  cron.schedule('0 0 * * *', () => {
    const isPostgres = !!process.env.DATABASE_URL;

    // Use parameterized queries to prevent SQL injection
    if (isPostgres) {
      db.query(
        `DELETE FROM events WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
        [RETENTION_DAYS],
        (err) => {
          if (err) {
            logger.error({ err }, 'Retention job failed');
          } else {
            logger.info(`Retention job ran: deleted events older than ${RETENTION_DAYS} days`);
          }
        }
      );
    } else {
      db.query(
        `DELETE FROM events WHERE created_at < datetime('now', '-' || ? || ' days')`,
        [RETENTION_DAYS],
        (err) => {
          if (err) {
            logger.error({ err }, 'Retention job failed');
          } else {
            logger.info(`Retention job ran: deleted events older than ${RETENTION_DAYS} days`);
          }
        }
      );
    }
  });

  logger.info(`Data retention job scheduled (keeps last ${RETENTION_DAYS} days)`);
}

module.exports = { startRetentionJob };
