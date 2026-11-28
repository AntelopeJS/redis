# redis

The ioredis implementation of `@antelopejs/interface-redis` and `@antelopejs/interface-redis-scheduler`, published as `@antelopejs/redis`.

## Layout

- `src/index.ts` holds the whole module: the `RedisConfig` type and the lifecycle (`construct`, `start`, `stop`, `destroy`). `useMock: true` serves an in-memory `ioredis-mock` client instead of connecting.
- `src/test/antelope.test.ts` is the `ajs module test` project (`antelopeJs.test` in `package.json`). It loads this module with `useMock: true` and runs the conformance suites shipped in `dist/tests` of each package listed in `antelopeJs.implements`; this repository has no suites of its own.
- `playground/` is a pnpm workspace package that `pnpm dev` runs against `redis://127.0.0.1:6379`.

## Versioning

- Every `@antelopejs/*` range stops below the next minor of its floor: `>=0.5.1 <0.6.0` on a 0.x package, `~1.23.3` on a 1.x one. The `dependency:ranges` step of `pnpm run checks` enforces it in every tracked `package.json`, and `pnpm run sync` regenerates the compatibility tables in `README.md` and `playground/README.md` from those ranges.
- `ioredis-mock` is a runtime dependency, not a devDependency, because `useMock` loads it from the published module.
- `chai` stays in devDependencies although no source imports it: the compiled conformance suites inside the interface packages `require("chai")` from this module's `node_modules`. knip also ignores `@types/chai` and `@types/mocha`, which no source uses either.

## Tests

- `pnpm test` builds `dist` once, then runs `ajs module test .`. It needs no Redis server, so `pnpm run checks` passes offline.
- `checks` never talks to a real Redis. To exercise the module against one, start Redis on `127.0.0.1:6379` (for example `docker run --rm -p 6379:6379 redis:7`) and run `pnpm dev`.

<!-- antelopejs-guardrails:start -->
<!-- Managed by @antelopejs/tooling-configs. `antelopejs-sync` rewrites everything between these markers; write repository-specific guidance outside them. -->

## Guardrails

CI runs `pnpm run checks` in full on every pull request and reports what failed. The commit hook formats and lints the staged files. Locally, check only what you touched, one test file and not the suite, as the [`verify-changes`](.agents/skills/verify-changes/SKILL.md) skill says.

### Comments

Say it in code: a constraint in a type, a lint rule or a test, a public item's contract in TSDoc. Other comments are lint directives naming their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, and license or tool directives. A reason states what the code does now.

### Tests

Each test names the wrong implementation it fails on, or is deleted. Drive behaviour through the public interface. An invariant over many files is a lint rule.

### Review

No tool checks these:

- A type guard checks the nested elements and values it claims.
- A no-upward import rule rejects same-tier peers; probe it with an import.
- A finding only an evasion or a patched internal can trigger goes under Attention and never blocks.

### Suppressions

`guardrails.suppressions.json` caps lint directives, `@ts-expect-error`, `SAFETY:` comments and rules a lint config turns off. Over a cap, fix the code or remove another suppression of that kind; only the operator raises a number. After removing suppressions, run `pnpm run suppressions:update` and commit the file.

<!-- antelopejs-guardrails:end -->
