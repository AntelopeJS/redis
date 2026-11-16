---
covers:
  - src/index.ts
docs:
  - README.md
journeys:
  - survives-restart
  - stop-quits
  - lazy-connect
  - stop-after-failed-start
---

# Lifecycle

The client connects when the module starts and quits when it stops. Data lives in Redis, not in the module.

## Sub-features

- `survives-restart`: a key set before Ctrl+C is still in Redis while the module is down (`redis-cli GET`) and is read through `GetClient()` after the next `ajs project dev`.
- `stop-quits`: while running, `CLIENT LIST` shows the module's connection; after Ctrl+C it exits 130, only `redis-cli` is connected, and `INFO commandstats` shows `cmdstat_quit` was processed.
- `lazy-connect`: with `lazyConnect: true` the module connects on start, before any command, and writes work and stop cleanly.
- `stop-after-failed-start`: with `lazyConnect: true` and a closed port, `ajs project dev` reports `Failed to start modules` and exits 1 by itself, the refusal reaches the log as a `[WARN]` on the `redis` channel, and `ECONNREFUSED` appears once, so the client never reconnects after the failed start.

## How to get to it (user POV)

- Start the project with `ajs project dev` or `ajs project start`, stop it with Ctrl+C.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" lifecycle
```

## Gotchas

- `stop-after-failed-start` needs no Redis: it points at port 1, and what it counts is the client's own connection attempts in the project output.

- Process exit closes sockets too, so only the `QUIT` counter proves the module closed its own connection.
