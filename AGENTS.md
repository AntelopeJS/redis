# redis

The ioredis implementation of `@antelopejs/interface-redis` and `@antelopejs/interface-redis-scheduler`, published as `@antelopejs/redis`.

## Layout

- `src/index.ts` holds the whole module: the `RedisConfig` type and the lifecycle (`construct`, `start`, `stop`, `destroy`). `useMock: true` serves an in-memory `ioredis-mock` client instead of connecting.
- `src/test/antelope.test.ts` is the `ajs module test` project (`antelopeJs.test` in `package.json`). It loads this module with `useMock: true` and runs the conformance suites shipped in `dist/tests` of each package listed in `antelopeJs.implements`; this repository has no suites of its own.
- `playground/` is a pnpm workspace package that `pnpm dev` runs against `redis://127.0.0.1:6379`.

## Versioning

- The interface packages stay ranges below `1.0.0` (`>=x <1.0.0`). When a dependency range changes, update the compatibility table in `README.md` too.
- `ioredis-mock` is a runtime dependency, not a devDependency, because `useMock` loads it from the published module.
- `chai` stays in devDependencies although no source imports it: the compiled conformance suites inside the interface packages `require("chai")` from this module's `node_modules`. knip also ignores `@types/chai` and `@types/mocha`, which no source uses either.

## Tests

- `pnpm test` builds `dist` once, then runs `ajs module test .`. It needs no Redis server, so `pnpm run checks` passes offline.
- `checks` never talks to a real Redis. To exercise the module against one, start Redis on `127.0.0.1:6379` (for example `docker run --rm -p 6379:6379 redis:7`) and run `pnpm dev`.

<!-- antelopejs-guardrails:start -->
<!-- Managed by @antelopejs/tooling-configs. `antelopejs-sync` rewrites everything between these markers; write repository-specific guidance outside them. -->

## Guardrails

Finish every change with `pnpm run checks`. It runs typecheck, lint, format, knip, tests, size, ratchet, and sync, and prints only what failed. The change is done when it prints no failure.

The tools enforce most rules, listed in the table at the end. The sections below hold the rules no tool checks.

### Comments

Say it in code. A constraint belongs in a type, a lint rule, or a test. A public item's contract belongs in TSDoc (`/** */`) on that item. The only other comments are lint directives that name their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, `/*!` license headers, and bundler or formatter directives.

### Tests

Hold every test you write or keep to this checklist:

- Name the wrong implementation this test fails on. A test with no answer is deleted, not kept.
- No test reads the file it tests. Drive the behaviour through the public interface.
- An invariant over many files is a lint rule, not a test.

### Debt

`guardrails.ratchet.json` records the lint findings and oversize files this repository already had. Its numbers only go down. After you remove debt, run `pnpm run ratchet:update` and commit the lowered file. A rule listed there is off for `oxlint`. The ratchet counts it instead, and the pre-commit hook rejects it on every line you add.

### What enforces what

| Rule                                                                           | Enforced by                               |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Formatting                                                                     | oxfmt                                     |
| Lint findings are errors; no rule warns                                        | oxlint preset                             |
| Comments are TSDoc, directives, or `SAFETY:` only                              | `antelopejs/no-comments`                  |
| Every test asserts                                                             | `antelopejs/require-assertion`            |
| Tests read no files outside fixtures, helpers, locales                         | `antelopejs/no-fs-read-in-tests`          |
| No assertion that restates a constant                                          | `antelopejs/no-constant-value-assertion`  |
| No test whose only check is "is a function"                                    | `antelopejs/no-typeof-function-only-test` |
| Params ≤ 5, function ≤ 120 lines, file ≤ 500 lines, depth ≤ 4, complexity ≤ 20 | `eslint/max-*`, `eslint/complexity`       |
| Files ≤ 20,000 bytes, tests included                                           | `antelopejs-check-size` (pre-commit)      |
| Existing debt only shrinks                                                     | `antelopejs-ratchet`                      |
| Types check                                                                    | `tsc` (pre-push)                          |
| No dead files, exports, or dependencies                                        | knip                                      |
| Managed files match the pack                                                   | `antelopejs-sync --check`                 |
| A test names the wrong implementation it catches                               | review; no tool                           |

<!-- antelopejs-guardrails:end -->
