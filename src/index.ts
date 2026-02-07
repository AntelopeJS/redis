import { internal } from '@ajs.local/redis/beta';
import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfig extends RedisOptions {
  url?: string;
}

let redisConfig: RedisConfig;
export function construct(config: RedisConfig): void {
  redisConfig = config;
}

export function destroy(): void {}

export async function start(): Promise<void> {
  const client = createRedisClient(redisConfig);
  if (redisConfig.lazyConnect) {
    await client.connect();
  }
  internal.SetClient(client);
}

export async function stop(): Promise<void> {
  const client = await internal.client;
  await client.quit();
  void internal.UnsetClient();
}

function createRedisClient(config: RedisConfig): Redis {
  const { url, ...options } = config;
  if (!url) {
    return new Redis(options);
  }
  if (Object.keys(options).length === 0) {
    return new Redis(url);
  }
  return new Redis(url, options);
}
