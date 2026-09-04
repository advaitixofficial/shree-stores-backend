// ============================================================
// Shree Stores Backend — MongoDB Connection
// Robust connection with retry, graceful shutdown, and logging.
// ============================================================

import mongoose from 'mongoose';
import { env, isProd } from './env';
import { logger } from '../utils/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export async function connectDatabase(): Promise<void> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      logger.info('✅ MongoDB connected successfully');

      mongoose.connection.on('error', (err) => {
        logger.error({ err }, '❌ MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 MongoDB reconnected');
      });

      // Debug mode in development
      if (!isProd) {
        mongoose.set('debug', false);
      }

      return;
    } catch (err) {
      retries++;
      logger.error(
        { err, attempt: retries, maxRetries: MAX_RETRIES },
        `❌ MongoDB connection failed (attempt ${retries}/${MAX_RETRIES})`
      );

      if (retries >= MAX_RETRIES) {
        logger.fatal('💀 Max MongoDB connection retries reached. Exiting.');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('🔌 MongoDB disconnected gracefully');
  } catch (err) {
    logger.error({ err }, '❌ Error disconnecting MongoDB');
  }
}
