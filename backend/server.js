require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

const start = async () => {
  const connected = await testConnection();
  if (!connected) {
    logger.warn('Starting server without a confirmed database connection. Check DATABASE_URL / DB_* env vars.');
  }

  const server = app.listen(PORT, () => {
    logger.info(`🚀 EduCMS API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    logger.info(`📚 API docs available at /api/docs`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
