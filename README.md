# @antelopejs/redis

<div align="center">
<a href="https://www.npmjs.com/package/@antelopejs/redis"><img alt="npm" src="https://img.shields.io/npm/v/@antelopejs/redis?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/@antelopejs/redis?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="https://discord.gg/sjK28QHrA7"><img src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000" alt="Discord"></a>
<a href="https://interfaces.antelopejs.com/docs/redis/introduction"><img src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000" alt="Documentation"></a>
</div>

The Redis module of AntelopeJS: it connects one shared [`ioredis`](https://github.com/redis/ioredis) client and serves it to the Redis and Redis Scheduler interfaces.

## Interfaces

| Interface                                                                                          | Documentation                                                                          |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`@antelopejs/interface-redis`](https://github.com/AntelopeJS/interface-redis)                     | [Redis](https://interfaces.antelopejs.com/docs/redis/introduction)                     |
| [`@antelopejs/interface-redis-scheduler`](https://github.com/AntelopeJS/interface-redis-scheduler) | [Redis Scheduler](https://interfaces.antelopejs.com/docs/redis-scheduler/introduction) |

The scheduler runs inside the interface package on top of the Redis client, so this module is all it needs.

## Install

```bash
ajs project modules add @antelopejs/redis
```

The command writes the module's default configuration: `redis://localhost:6379`.

## Configuration

```typescript [antelope.config.ts]
import { defineConfig } from "@antelopejs/interface-core/config";

export default defineConfig({
  name: "my-project",
  modules: {
    redis: {
      source: {
        type: "package",
        package: "@antelopejs/redis",
        version: "^1.0.3",
      },
      config: {
        url: "redis://localhost:6379",
        useMock: false,
        lazyConnect: true,
      },
    },
  },
  envOverrides: {
    REDIS_URL: "modules.redis.config.url",
  },
});
```

| Key           | Description                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | Redis connection URL. Optional: without it, the client uses the options below, or `localhost:6379`.                                                       |
| `useMock`     | Serve an in-memory [`ioredis-mock`](https://github.com/stipsan/ioredis-mock) client instead of connecting. For tests only.                                |
| any other key | Passed to the client as [`ioredis` options](https://github.com/redis/ioredis#connect-to-redis) (`host`, `port`, `password`, `db`, `tls`, `lazyConnect`…). |

The client connects when the module starts, and quits when it stops.

## Quick start

In the module that uses Redis, add the interface:

```bash
pnpm add @antelopejs/interface-redis
```

```typescript
import { GetClient } from "@antelopejs/interface-redis";

const client = await GetClient();
await client.set("greeting", "hello", "EX", 60);
const greeting = await client.get("greeting");
```

`GetClient()` waits until the module has connected. For distributed jobs, add `@antelopejs/interface-redis-scheduler` and read its [documentation](https://interfaces.antelopejs.com/docs/redis-scheduler/introduction).

## Documentation

- [Redis](https://interfaces.antelopejs.com/docs/redis/introduction): the `@antelopejs/interface-redis` contract this module implements
- [Redis Scheduler](https://interfaces.antelopejs.com/docs/redis-scheduler/introduction): the `@antelopejs/interface-redis-scheduler` contract this module implements
- [Configuration](https://framework.antelopejs.com/docs/concepts/configuration): module sources, `config` blocks and config variables in `antelope.config.ts`

## Compatibility

| Package                                 | Supported range  |
| --------------------------------------- | ---------------- |
| `@antelopejs/interface-redis`           | `>=0.0.9 <1.0.0` |
| `@antelopejs/interface-redis-scheduler` | `>=0.0.8 <1.0.0` |
| `@antelopejs/interface-core`            | `>=0.2.4 <1.0.0` |

The module is developed and tested against `@antelopejs/core` `^1.16.0` on Node.js 24, with `ioredis` `^5.10.1`.

## Contributing

```bash
pnpm install
pnpm dev            # run the playground/ project against redis://127.0.0.1:6379
pnpm lint
pnpm format:check
pnpm knip
pnpm test           # build, then ajs module test with ioredis-mock
```

The tests need no Redis server. Read the [contribution guidelines](CONTRIBUTING.md) before opening a pull request.

## License

[Apache-2.0](LICENSE)
