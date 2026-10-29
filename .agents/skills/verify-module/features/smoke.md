---
covers:
docs:
  - README.md
journeys:
  - module-dev
  - round-trip
---

# Smoke

The fixed journey every verdict runs, whatever the diff touches: load the module as `local` against the run's Redis container, round-trip a value through `GetClient()` and read it back with `redis-cli`.

## Sub-features

- `module-dev` and `round-trip`: as in [connection](connection.md).

## How to get to it (user POV)

- A project with `@antelopejs/redis` and a module that imports `@antelopejs/interface-redis`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" smoke
```

## Gotchas

- The smoke feature covers no glob, so it never marks a file as mapped.
