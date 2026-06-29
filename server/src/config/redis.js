import Redis from 'ioredis';
import { env } from './env.js';

let redis;

try {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });
} catch {
  console.warn('Redis not available, running without cache');
  redis = null;
}

export { redis };
