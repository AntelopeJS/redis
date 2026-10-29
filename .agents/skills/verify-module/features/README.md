# Feature map

One file per feature. `covers:` lists the source globs it owns, `docs:` the pages a verdict judges, `journeys:` the journeys it runs, and `seeded-breaks/<feature>.patch` the break its journeys must catch. `pnpm exec antelopejs-verify map` checks that every user-facing file is covered. The module is one source file, so every feature covers `src/index.ts` and a change to it runs all of them.

| Feature | What the user does | Journeys |
|---|---|---|
| [connection](connection.md) | An app developer points `url` at Redis; consumers get one shared client and the Scheduler interface runs on it. | module-dev, round-trip, missing-key, native-write-visible, unreachable-server, scheduler-listener |
| [options](options.md) | The developer picks the server and database with `host`, `port`, `db`, `password` or ioredis options next to the url. | host-port-db, url-with-options, default-db, url-db-path, db-isolation, password |
| [mock](mock.md) | A test project sets `useMock` and gets an in-memory client that never touches the real server. | no-real-writes, mock-forgets-on-restart |
| [lifecycle](lifecycle.md) | The developer starts, stops and restarts the project; connections open and close with it. | survives-restart, stop-quits, lazy-connect |
| [smoke](smoke.md) | The fixed journey every verdict runs: load the module against a real Redis and round-trip a value. | module-dev, round-trip |
