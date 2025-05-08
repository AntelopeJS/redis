import { RedisClientType } from 'redis';
export declare namespace internal {
    let client: Promise<RedisClientType>;
    let SetClient: (client: RedisClientType) => void;
    const UnsetClient: () => Promise<RedisClientType>;
}
export declare function GetClient(): Promise<RedisClientType>;
