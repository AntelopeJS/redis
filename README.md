![Redis](.github/social-card.png)

# @antelopejs/redis

[![npm version](https://img.shields.io/npm/v/@antelopejs/redis.svg)](https://www.npmjs.com/package/@antelopejs/redis)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

A Redis client module that implements the Redis and Redis Scheduler interfaces for AntelopeJS.

## Installation

```bash
ajs project modules add @antelopejs/redis
```

## Interfaces

This module implements two key interfaces:

- **Redis Interface**: Promise-based Redis client with key-value operations and pub/sub messaging.
- **Redis Scheduler Interface**: Redis-based distributed task scheduler with job queuing and automatic retries.

Both interfaces can be used independently or together depending on your application's needs. The interfaces are installed separately to maintain modularity and minimize dependencies.

| Name            | Install command                          |                                                                          |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| Redis           | `ajs module imports add redis`           | [Documentation](https://github.com/AntelopeJS/interface-redis)           |
| Redis Scheduler | `ajs module imports add redis_scheduler` | [Documentation](https://github.com/AntelopeJS/interface-redis-scheduler) |

## Overview

The AntelopeJS Redis module provides functionality for interacting with Redis:

- Redis client connection management
- Task scheduling with retry capabilities

## Configuration

The Redis module can be configured with standard Redis client options:

```json
{
  "url": "redis://localhost:6379",
  "socket": {
    "reconnectStrategy": true
  }
}
```

### Configuration Details

The module accepts the following configuration properties:

- All standard Redis client options from the `redis` package
- Supports all connection methods including URL string, socket options, etc.

## Integration with Other Modules

The Redis module is designed to be used as a dependency for other AntelopeJS modules:

```typescript
// Example of another module depending on Redis
import { GetClient } from '@ajs/redis/beta';

async function storeValueInRedis(key: string, value: string) {
  const client = await GetClient();
  await client.set(key, value);
}
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
