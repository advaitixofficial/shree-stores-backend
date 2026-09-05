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
 * Retries automatically on TransientTransactionError or WriteConflict (e.g. Code 112).
 * Gracefully falls back to standalone execution if replica set is not available.
 */
export async function runInTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>,
  maxRetries = 5
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

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.error({ err: abortErr }, 'Failed to abort transaction');
      } finally {
        try {
          session.endSession();
        } catch {}
      }

      const isTransientError =
        error?.hasErrorLabel?.('TransientTransactionError') ||
        error?.hasErrorLabel?.('UnknownTransactionCommitResult') ||
        (Array.isArray(error?.errorLabels) && error.errorLabels.includes('TransientTransactionError')) ||
        (Array.isArray(error?.errorLabels) && error.errorLabels.includes('UnknownTransactionCommitResult')) ||
        error?.code === 112 ||
        error?.codeName === 'WriteConflict' ||
        (typeof error?.message === 'string' && error.message.includes('Write conflict'));

      if (isTransientError && attempt < maxRetries) {
        const backoffMs = Math.min(50 * Math.pow(2, attempt - 1), 500);
        logger.warn(
          `Transient transaction error on attempt ${attempt}/${maxRetries} (${error.message}). Retrying in ${backoffMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Transaction failed after maximum retry attempts');
}
