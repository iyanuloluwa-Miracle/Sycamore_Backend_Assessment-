import Redis from 'ioredis';
import config from '../config';

/**
 * Redis client for distributed locking and caching
 */
class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  /**
   * Get Redis client instance (singleton pattern)
   */
  getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('✅ Redis connected');
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('Redis connection closed');
      });
    }

    return this.client;
  }

  /**
   * Acquire a distributed lock
   * @param key - Lock key
   * @param ttlMs - Time to live in milliseconds
   * @returns Lock value if acquired, null otherwise
   */
  async acquireLock(key: string, ttlMs: number = 10000): Promise<string | null> {
    const client = this.getClient();
    const lockValue = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lockKey = `lock:${key}`;

    try {
      // SET key value NX PX ttl - Set only if not exists with expiry
      const result = await client.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
      
      if (result === 'OK') {
        return lockValue;
      }
      return null;
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return null;
    }
  }

  /**
   * Release a distributed lock
   * @param key - Lock key
   * @param lockValue - The lock value returned when acquiring
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const client = this.getClient();
    const lockKey = `lock:${key}`;

    try {
      // Use Lua script to ensure atomic check-and-delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await client.eval(script, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      console.error('Error releasing lock:', error);
      return false;
    }
  }

  /**
   * Check if idempotency key exists
   * @param key - Idempotency key
   */
  async getIdempotencyResult(key: string): Promise<string | null> {
    const client = this.getClient();
    const idempotencyKey = `idempotency:${key}`;

    try {
      return await client.get(idempotencyKey);
    } catch (error) {
      console.error('Error getting idempotency result:', error);
      return null;
    }
  }

  /**
   * Store idempotency result
   * @param key - Idempotency key
   * @param result - Result to store
   * @param ttlSeconds - Time to live in seconds (default 24 hours)
   */
  async setIdempotencyResult(key: string, result: string, ttlSeconds: number = 86400): Promise<boolean> {
    const client = this.getClient();
    const idempotencyKey = `idempotency:${key}`;

    try {
      await client.setex(idempotencyKey, ttlSeconds, result);
      return true;
    } catch (error) {
      console.error('Error setting idempotency result:', error);
      return false;
    }
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    const client = this.getClient();
    if (!this.isConnected) {
      await client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const redisClient = new RedisClient();
export default redisClient;
