import { GetClient } from '@ajs/redis/beta';
import { Logging } from '@ajs/logging/beta';

// Store Redis client for cleanup
let redisClient: Awaited<ReturnType<typeof GetClient>> | null = null;

export function construct(config: unknown): void {
  // Set things up when module is loaded
  Logging.Debug('Redis module playground initialized with config:' + JSON.stringify(config));
}

export async function start(): Promise<void> {
  try {
    Logging.Debug('[REDIS] Starting Redis tests...');

    // Get Redis client
    redisClient = await GetClient();

    // Test 1: Basic key-value operations
    Logging.Debug('[REDIS] Test 1: Basic key-value operations');
    await redisClient.set('test:string', 'Hello Redis!');
    const stringValue = await redisClient.get('test:string');
    Logging.Debug('[REDIS] String value:' + stringValue);

    // Test 2: Working with numbers
    Logging.Debug('[REDIS] Test 2: Working with numbers');
    await redisClient.set('test:counter', '0');
    await redisClient.incr('test:counter');
    await redisClient.incrBy('test:counter', 5);
    const counter = await redisClient.get('test:counter');
    Logging.Debug('[REDIS] Counter value:' + counter);

    // Test 3: Hash operations
    Logging.Debug('[REDIS] Test 3: Hash operations');
    await redisClient.hSet('test:user:1', {
      name: 'John Doe',
      email: 'john@example.com',
      age: '30',
    });
    const userData = await redisClient.hGetAll('test:user:1');
    Logging.Debug('[REDIS] User data:' + JSON.stringify(userData));

    // Test 4: List operations
    Logging.Debug('[REDIS] Test 4: List operations');
    await redisClient.lPush('test:list', ['item1', 'item2', 'item3']);
    const listItems = await redisClient.lRange('test:list', 0, -1);
    Logging.Debug('[REDIS] List items:' + listItems.join(', '));

    // Test 5: Expiration
    Logging.Debug('[REDIS] Test 5: Testing expiration');
    await redisClient.set('test:expiring', 'This will expire soon', {
      EX: 10, // 10 seconds
    });
    const ttl = await redisClient.ttl('test:expiring');
    Logging.Debug('[REDIS] TTL of expiring key:' + ttl);

    Logging.Debug('[REDIS] All Redis tests completed successfully');
  } catch (error) {
    Logging.Error('[REDIS] Error in Redis tests:', error);
  }
}

export async function stop(): Promise<void> {
  // Pause operation
  Logging.Debug('[REDIS] Stopping Redis playground...');
  if (redisClient) {
    // We'll just perform a quick cleanup of some keys
    await redisClient.del('test:counter');
    await redisClient.del('test:list');
    Logging.Debug('[REDIS] Removed some test keys');
  }
}

export async function destroy(): Promise<void> {
  // Clean up resources
  Logging.Debug('[REDIS] Destroying Redis playground...');
  if (redisClient) {
    // Clean up all test keys
    const keys = await redisClient.keys('test:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
      Logging.Debug('[REDIS] Removed all test keys:' + keys.join(', '));
    }

    // We don't disconnect the client here as it's managed externally
    redisClient = null;
    Logging.Debug('[REDIS] Redis cleanup completed');
  }
}
