# `@antelopejs/redis`

<div align="center">
<a href="https://www.npmjs.com/package/@antelopejs/redis"><img data-illustration alt="npm" src="https://img.shields.io/npm/v/@antelopejs/redis?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="./LICENSE"><img data-illustration alt="License" src="https://img.shields.io/npm/l/@antelopejs/redis?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="https://discord.gg/g4pFt6eXqu"><img data-illustration alt="Discord" src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000"></a>
<a href="https://interfaces.antelopejs.com/docs/redis/introduction"><img data-illustration alt="Documentation" src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000"></a>
</div>

The Redis module of AntelopeJS. It connects one shared [`ioredis`](https://github.com/redis/ioredis) client and serves it to the Redis and Redis Scheduler interfaces.

## Interfaces

| Interface                                                                                          | Documentation                                                                          |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`@antelopejs/interface-redis`](https://github.com/AntelopeJS/interface-redis)                     | [Redis](https://interfaces.antelopejs.com/docs/redis/introduction)                     |
| [`@antelopejs/interface-redis-scheduler`](https://github.com/AntelopeJS/interface-redis-scheduler) | [Redis Scheduler](https://interfaces.antelopejs.com/docs/redis-scheduler/introduction) |

The scheduler runs inside its interface package on top of the Redis client, so it needs no module besides this one.

## Install

```bash
ajs project modules add @antelopejs/redis
```

The command writes the module's default configuration, which connects to `redis://localhost:6379`.

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

| Key           | Description                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | Redis connection URL. Optional. Without it, the client uses the options below, or `localhost:6379`.                                                               |
| `useMock`     | Serves an in-memory [`ioredis-mock`](https://github.com/stipsan/ioredis-mock) client instead of connecting, and ignores every other key. For tests only.          |
| any other key | Passed to the client as [`ioredis` options](https://github.com/redis/ioredis#connect-to-redis), such as `host`, `port`, `password`, `db`, `tls` or `lazyConnect`. |

The module creates the client when it starts, and quits it when it stops. With `lazyConnect: true`, the module waits for the connection before it serves the client.

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

`GetClient()` waits until the module has started and set its client. For distributed jobs, add `@antelopejs/interface-redis-scheduler` and read its [documentation](https://interfaces.antelopejs.com/docs/redis-scheduler/introduction).

## Documentation

- [Redis](https://interfaces.antelopejs.com/docs/redis/introduction) documents the `@antelopejs/interface-redis` contract that this module implements.
- [Redis Scheduler](https://interfaces.antelopejs.com/docs/redis-scheduler/introduction) documents the `@antelopejs/interface-redis-scheduler` contract that this module implements.
- [Configuration](https://framework.antelopejs.com/docs/concepts/configuration) documents module sources, `config` blocks and config variables in `antelope.config.ts`.

## Compatibility

<!-- antelopejs-docs-compat:start -->

| Package                                 | Supported        | Tested with |
| --------------------------------------- | ---------------- | ----------- |
| `@antelopejs/interface-core`            | `>=0.2.4 <1.0.0` | `0.2.4`     |
| `@antelopejs/interface-redis`           | `>=0.0.9 <1.0.0` | `0.0.9`     |
| `@antelopejs/interface-redis-scheduler` | `>=0.0.8 <1.0.0` | `0.0.8`     |

<!-- antelopejs-docs-compat:end -->

`.nvmrc` sets the Node.js release for development, and the `dependencies` of `package.json` set the `ioredis` range.

## Contributing

```bash
pnpm install
pnpm dev            # run the playground/ project against redis://127.0.0.1:6379
pnpm lint
pnpm format:check
pnpm knip
pnpm test           # build, then ajs module test with ioredis-mock
```

The tests need no Redis server. Read the [contribution guidelines](CONTRIBUTING.md) before you open a pull request.

## License

[Apache-2.0](LICENSE)
