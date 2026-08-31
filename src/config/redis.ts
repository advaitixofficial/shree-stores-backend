// ============================================================
// Shree Stores Backend — Redis Client
// Graceful fallback in development if Redis is unavailable.
// ============================================================

import Redis from 'ioredis';
import { env, isDev } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let isRedisConnected = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return isRedisConnected;
}

export async function connectRedis(): Promise<void> {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (isDev) return null; // Don't retry in development, just fallback immediately
        
        if (times > 5) {
          logger.warn('⚠️ Redis max retries reached, stopping reconnection');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      if (isDev) {
        logger.warn('⚠️ Redis unavailable in development — using fallback');
      } else {
        logger.error({ err }, '❌ Redis connection error');
      }
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
      logger.warn('⚠️ Redis connection closed');
    });

    await redisClient.connect();
  } catch (err) {
    isRedisConnected = false;
    if (isDev) {
      logger.warn('⚠️ Redis unavailable in development — app will continue without Redis');
      redisClient = null;
    } else {
      logger.error({ err }, '❌ Failed to connect to Redis');
      throw err;
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('🔌 Redis disconnected gracefully');
    } catch (err) {
      logger.error({ err }, '❌ Error disconnecting Redis');
    }
  }
}

// ============================================================
// In-memory fallback for development when Redis is unavailable
// ============================================================
const memoryStore = new Map<string, { value: string; expiresAt?: number }>();

export const redisOps = {
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (redisClient && isRedisConnected) {
      if (ttlSeconds) {
        await redisClient.setex(key, ttlSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
    } else {
      memoryStore.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      });
    }
  },

  async get(key: string): Promise<string | null> {
    if (redisClient && isRedisConnected) {
      return redisClient.get(key);
    }
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async del(key: string): Promise<void> {
    if (redisClient && isRedisConnected) {
      await redisClient.del(key);
    } else {
      memoryStore.delete(key);
    }
  },

  async incr(key: string): Promise<number> {
    if (redisClient && isRedisConnected) {
      return redisClient.incr(key);
    }
    const entry = memoryStore.get(key);
    const val = entry ? parseInt(entry.value, 10) + 1 : 1;
    memoryStore.set(key, { value: val.toString(), expiresAt: entry?.expiresAt });
    return val;
  },

  async expire(key: string, seconds: number): Promise<void> {
    if (redisClient && isRedisConnected) {
      await redisClient.expire(key, seconds);
    } else {
      const entry = memoryStore.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + seconds * 1000;
      }
    }
  },
};
