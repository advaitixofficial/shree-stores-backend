// ============================================================
// Shree Stores Backend — Transaction Helpers
// Graceful fallback to non-transactional database operations
// if standalone MongoDB instance is running (no replica set).
// ============================================================

import mongoose from 'mongoose';
import { logger } from './logger';

let cachedSupportsTransactions: boolean | null = null;

/**
 * Execute operations within a transaction.
 * Gracefully falls back to standalone execution if replica set is not available.
 */
export async function runInTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  if (mongoose.connection.readyState !== 1) {
    return fn(null);
  }

  if (cachedSupportsTransactions === null) {
    try {
      const db = mongoose.connection.db;
      if (db) {
        const result = await db.admin().command({ hello: 1 });
        cachedSupportsTransactions = !!result.setName;
        logger.info(
          `Database transaction capability check: ${
            cachedSupportsTransactions ? 'ReplicaSet (Enabled)' : 'Standalone (Disabled, falling back gracefully)'
          }`
        );
      } else {
        cachedSupportsTransactions = false;
      }
    } catch (err) {
      cachedSupportsTransactions = false;
      logger.warn({ err }, 'Failed to determine database transaction support, disabling by default');
    }
  }

  if (!cachedSupportsTransactions) {
    // Run operations without a transaction session
    return fn(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      logger.error({ err: abortErr }, 'Failed to abort transaction');
    }
    throw error;
  } finally {
    try {
      session.endSession();
    } catch {}
  }
}
