import { internal } from '@ajs.local/redis/beta';
import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfig extends RedisOptions {
  url?: string;
  useMock?: boolean;
}

let redisConfig: RedisConfig;
export function construct(config: RedisConfig): void {
  redisConfig = config;
}

export function destroy(): void {}

export async function start(): Promise<void> {
  const client = await createRedisClient(redisConfig);
  if (redisConfig.useMock || redisConfig.lazyConnect) {
    await client.connect();
  }
  internal.SetClient(client);
}

export async function stop(): Promise<void> {
  const client = await internal.client;
  await client.quit();
  void internal.UnsetClient();
}

async function createRedisClient(config: RedisConfig): Promise<Redis> {
  if (config.useMock) {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const { default: RedisMock } = await import('ioredis-mock');
    return new RedisMock({ lazyConnect: true }) as unknown as Redis;
  }
  const { url, useMock: _, ...options } = config;
  if (!url) {
    return new Redis(options);
  }
  if (Object.keys(options).length === 0) {
    return new Redis(url);
  }
  return new Redis(url, options);
}
