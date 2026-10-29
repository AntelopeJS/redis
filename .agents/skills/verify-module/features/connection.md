---
covers:
  - src/index.ts
docs:
  - README.md
journeys:
  - module-dev
  - round-trip
  - missing-key
  - native-write-visible
  - unreachable-server
  - scheduler-listener
---

# Connection

The module reads `url` from its config, creates one ioredis client in `start`, hands it to `@antelopejs/interface-redis` with `internal.SetClient` and serves it through `GetClient()`. The Redis Scheduler interface runs on the same client.

## Sub-features

- `module-dev`: the module loads from its local source next to a real Redis in Docker, the consumer loads both implemented interfaces, and Ctrl+C exits 130.
- `round-trip`: `ping`, `info server`, `set` and `get` through `GetClient()`; `redis-cli GET` and `TYPE` read the same string in db 0, and `CLIENT INFO` shows the session on db 0.
- `missing-key`: an unknown key reads `null`, deleting it removes `0` keys and leaves the database empty; a stored key is deleted and `DBSIZE` is `0` again.
- `native-write-visible`: a key written with `redis-cli` before the module starts is read through `GetClient()`.
- `unreachable-server`: with nothing listening at the `url` the module still starts, a command is rejected with the retry-limit error, and the real server saw nothing.
- `scheduler-listener`: `enableListener()` of the scheduler interface subscribes `SchedulerUtil` through a duplicate of the client (`PUBSUB CHANNELS`, `CLIENT LIST`); `addTask` with an unregistered handler is rejected and queues nothing.

## How to get to it (user POV)

- `ajs project modules add @antelopejs/redis`, set `url`, then `await (await GetClient()).set(...)` in a module.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" connection
```

## Gotchas

- Every journey starts from `FLUSHALL` and `CONFIG RESETSTAT` on the run's own Redis container, never on a shared instance.
- `GetClient()` waits for the client; the driver gives a consumer call 15 seconds before it reports a timeout.
