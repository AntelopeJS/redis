import { internal } from '@ajs.local/redis/beta';
import { createClient, RedisClientOptions, RedisClientType } from 'redis';

let redisConfig: RedisClientOptions;
export function construct(config: RedisClientOptions): void {
  redisConfig = config;
}

export function destroy(): void {}

export function start(): void {
  const client = createClient(redisConfig) as RedisClientType;
  void client.connect();
  internal.SetClient(client);
}

export async function stop(): Promise<void> {
  const client = await internal.client;
  await client.disconnect();
  void internal.UnsetClient();
}
