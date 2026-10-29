---
covers:
  - src/index.ts
docs:
  - README.md
journeys:
  - host-port-db
  - url-with-options
  - default-db
  - url-db-path
  - db-isolation
  - password
---

# Options

Every key but `url` and `useMock` is passed to ioredis. Without a `url` the options alone describe the connection; with both, the url picks the server and the options add to it.

## Sub-features

- `host-port-db`: `host`, `port` and `db: 3` without a url; the key lands in db 3 (`redis-cli -n 3`) and db 0 holds nothing.
- `url-with-options`: a `url` plus `db: 4` and `keyPrefix: "app:"`; `redis-cli -n 4 GET app:greeting` reads the value and db 0 is empty.
- `default-db`: a module configured with a `url` only runs on db 0 (`CLIENT INFO` says `db=0`), writes its key to db 0 and leaves the key another application keeps in db 1 untouched. This is a containment journey of the Data door.
- `url-db-path`: a `url` ending in `/5` puts the session on db 5 and the key in db 5, with db 0 empty. The ioredis url wins over the `db` default, so this journey does not contain the door.
- `db-isolation`: a module on db 1 writes a key, a module on db 2 reads `null` and deletes `0` keys, and `redis-cli -n 1` still holds the key.
- `password`: with `requirepass` set on the container, `password` authenticates and the write is stored; without it the command is rejected with `NOAUTH` and the stored value is unchanged.

## How to get to it (user POV)

- `config: { url, db, password, keyPrefix }` in the module's entry of `antelope.config.ts`; the same keys are available through `envOverrides`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" options
```

## Gotchas

- The `password` journey sets `requirepass` on the run's container; the reset command clears it before the next journey.
