import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initializeSocketIO } from './config/socket';
import { logger } from './utils/logger';

import { configureCloudinary } from './config/cloudinary';

const server = http.createServer(app);

// Initialize Socket.IO & Cloudinary
initializeSocketIO(server);
configureCloudinary();

// Start Server
async function startServer() {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Connect to Redis (non-fatal — app works without it using in-memory fallback)
    try {
      await connectRedis();
    } catch (redisErr) {
      logger.warn('⚠️ Redis unavailable — continuing without Redis (in-memory fallback active)');
    }

    // 3. Start listening
    server.listen(env.PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled Rejection - shutting down');
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

startServer();
