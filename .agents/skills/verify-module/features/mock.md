---
covers:
  - src/index.ts
docs:
  - README.md
journeys:
  - no-real-writes
  - mock-forgets-on-restart
---

# Mock

`useMock: true` replaces the connection with an in-memory `ioredis-mock` client, for tests only.

## Sub-features

- `no-real-writes`: with `useMock` and a real `url`, a key set through `GetClient()` is read back from the mock while `DBSIZE` of the real server stays `0` and no client of the module is connected.
- `mock-forgets-on-restart`: after Ctrl+C and a second `ajs project dev`, the key written to the mock reads `null`.

## How to get to it (user POV)

- `config: { useMock: true }` in a test project's `antelope.config.ts`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" mock
```

## Gotchas

- The mock needs no server: the journeys still start the run's container so they can prove nothing reached it.
