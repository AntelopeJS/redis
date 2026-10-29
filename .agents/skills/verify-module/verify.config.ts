import { join } from "node:path";

import {
  equal,
  exitIs,
  has,
  lacks,
  type App,
  type CommandResult,
  type JourneyContext,
  type ServiceEndpoint,
  type VerifyConfig,
} from "@antelopejs/tooling-configs/verify";

const KEY = "verify:greeting";
const PASSWORD = "verify-secret";

/** Runs `redis-cli` inside the run's own Redis container, the second view every journey reads state back through. */
function cli(context: JourneyContext, name: string, args: string[]): Promise<CommandResult> {
  return context.native(name, "redis", ["redis-cli", ...args]);
}

/** Calls one ioredis method on the client `GetClient()` hands to a consumer module. */
function viaClient(context: JourneyContext, name: string, app: App, method: string, ...args: (string | number)[]) {
  return context.call(name, app, { path: ["GetClient"], chain: [[method, ...args]] });
}


type ModuleConfig = NonNullable<NonNullable<Parameters<JourneyContext["fixture"]>[0]>["moduleConfig"]>;

/** Rewrites the fixture project's module config in place: `fixture()` can write a project only once per journey. */
function reconfigure(context: JourneyContext, project: string, moduleConfig: ModuleConfig): void {
  const modules = {
    redis: { source: { type: "local", path: context.repo }, config: moduleConfig },
    "verify-driver": { source: { type: "local", path: "./driver" } },
  };
  context.edit("switch the module config", join(project, "antelope.config.ts"), `export default ${JSON.stringify({ name: "verify-redis", modules }, null, 2)};\n`);
}

function endpoint(context: JourneyContext): ServiceEndpoint {
  return context.service("redis");
}

const config: VerifyConfig = {
  doors: {
    data: {
      globs: ["src/index.ts"],
      funnels: ["src/index.ts"],
      containments: ["options/db-isolation", "mock/no-real-writes"],
      why: "the module builds the one client every consumer writes and deletes keys through: its url, db and mock switch decide which Redis and which database the keys land in",
    },
    format: null,
    contract: {
      globs: ["package.json"],
      funnels: [],
      containments: [],
      why: "the config keys (`url`, `useMock`, ioredis options), `antelopeJs.defaultConfig` and the implemented interfaces",
    },
    outbound: null,
    exposure: null,
    publish: {
      globs: ["package.json", ".release-it.json", "changelogen.config.json", ".github/workflows/release.yml"],
      funnels: [],
      containments: [],
      why: "the package name and release workflow claim @antelopejs/redis on npm",
    },
  },
  services: {
    redis: {
      image: "redis:7-alpine",
      port: 6379,
      ready: ["redis-cli", "ping"],
      reset: [
        "sh",
        "-c",
        'redis-cli CONFIG SET requirepass "" >/dev/null 2>&1; redis-cli -a ' +
          PASSWORD +
          ' CONFIG SET requirepass "" >/dev/null 2>&1; redis-cli FLUSHALL >/dev/null && redis-cli CONFIG RESETSTAT >/dev/null',
      ],
    },
  },
  moduleConfig(services) {
    const redis = services.find((service) => service.name === "redis");
    return { url: `redis://${redis?.host}:${redis?.port}` };
  },
  journeys: {
    "round-trip": {
      title: "a key set through GetClient() is stored in Redis and read back with redis-cli, with a typed reply",
      entryPoint: "`await (await GetClient()).set(...)` and `.get(...)` from a consumer module",
      async run(context) {
        const app = await context.dev("ajs project dev", context.fixture());
        const ping = await viaClient(context, "ping through the module", app, "ping");
        context.expect(ping.folder, [equal("ping answered PONG", ping.value, "PONG")]);
        const info = await viaClient(context, "INFO server through the module", app, "info", "server");
        context.expect(info.folder, [has("INFO server reply", JSON.stringify(info.value), /redis_version:\d+\.\d+/)]);
        const set = await viaClient(context, "set through the module", app, "set", KEY, "hello");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const get = await viaClient(context, "get through the module", app, "get", KEY);
        context.expect(get.folder, [equal("get answered the stored value", get.value, "hello")]);
        const stored = await cli(context, "redis-cli GET", ["GET", KEY]);
        context.expect(stored.folder, [exitIs(stored, 0), equal("redis-cli reads the stored value in db 0", stored.stdout.trim(), "hello")]);
        const kind = await cli(context, "redis-cli TYPE", ["TYPE", KEY]);
        context.expect(kind.folder, [equal("the key is a string", kind.stdout.trim(), "string")]);
        const session = await viaClient(context, "CLIENT INFO through the module", app, "call", "CLIENT", "INFO");
        context.expect(session.folder, [has("the module's session uses db 0", JSON.stringify(session.value), /\bdb=0\b/)]);
        await context.stop("SIGINT", app);
      },
    },
    "missing-key": {
      title: "a key nobody wrote reads back null through the module and does not exist in Redis; deleting it removes nothing",
      entryPoint: "`(await GetClient()).get(...)` and `.del(...)` on an empty database",
      async run(context) {
        const app = await context.dev("ajs project dev", context.fixture());
        const empty = await cli(context, "redis-cli DBSIZE before", ["DBSIZE"]);
        context.expect(empty.folder, [equal("the database starts empty", empty.stdout.trim(), "0")], { critical: true });
        const get = await viaClient(context, "get a missing key", app, "get", KEY);
        context.expect(get.folder, [equal("get answered null", get.value, null)]);
        const del = await viaClient(context, "del a missing key", app, "del", KEY);
        context.expect(del.folder, [equal("del removed nothing", del.value, 0)]);
        const exists = await cli(context, "redis-cli EXISTS", ["EXISTS", KEY]);
        context.expect(exists.folder, [equal("redis-cli finds no such key", exists.stdout.trim(), "0")]);
        const set = await viaClient(context, "set then delete", app, "set", KEY, "x");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const removed = await viaClient(context, "del the stored key", app, "del", KEY);
        context.expect(removed.folder, [equal("del removed one key", removed.value, 1)]);
        const gone = await cli(context, "redis-cli DBSIZE after", ["DBSIZE"]);
        context.expect(gone.folder, [equal("the database is empty again", gone.stdout.trim(), "0")]);
        await context.stop("SIGINT", app);
      },
    },
    "native-write-visible": {
      title: "a key written with redis-cli before the module starts is read by a consumer through GetClient()",
      entryPoint: "`(await GetClient()).get(...)` on data that already lives in Redis",
      async run(context) {
        const seeded = await cli(context, "redis-cli SET before start", ["SET", KEY, "native"]);
        context.expect(seeded.folder, [equal("redis-cli stored the key", seeded.stdout.trim(), "OK")], { critical: true });
        const app = await context.dev("ajs project dev", context.fixture());
        const get = await viaClient(context, "get the native key", app, "get", KEY);
        context.expect(get.folder, [equal("the module reads what redis-cli wrote", get.value, "native")]);
        await context.stop("SIGINT", app);
      },
    },
    "unreachable-server": {
      title: "with nothing listening at the url the module still starts and a consumer command is rejected, never hangs",
      entryPoint: "`(await GetClient()).ping()` with a `url` nobody answers",
      async run(context) {
        const fixture = context.fixture({ moduleConfig: { url: "redis://127.0.0.1:1", maxRetriesPerRequest: 1 } });
        const app = await context.dev("ajs project dev", fixture);
        const ping = await viaClient(context, "ping an unreachable server", app, "ping");
        context.expect(ping.folder, [
          equal("the command was rejected", ping.ok, false),
          has("the rejection names the retry limit", JSON.stringify(ping.value), /max retries per request/i),
        ]);
        const stats = await cli(context, "redis-cli DBSIZE", ["DBSIZE"]);
        context.expect(stats.folder, [equal("the run's Redis saw no write", stats.stdout.trim(), "0")]);
        await context.stop("SIGINT", app);
      },
    },
    "scheduler-listener": {
      title: "the Redis Scheduler interface runs on the module's client: enableListener() subscribes through a duplicate connection",
      entryPoint: "`enableListener()` of `@antelopejs/interface-redis-scheduler` from a consumer module",
      async run(context) {
        const app = await context.dev("ajs project dev", context.fixture());
        const before = await cli(context, "redis-cli PUBSUB CHANNELS before", ["PUBSUB", "CHANNELS"]);
        context.expect(before.folder, [equal("no channel is subscribed yet", before.stdout.trim(), "")], { critical: true });
        const enabled = await context.call("enableListener", app, {
          interface: "@antelopejs/interface-redis-scheduler",
          path: ["enableListener"],
        });
        context.expect(enabled.folder, [equal("enableListener resolved", enabled.ok, true)], { critical: true });
        const channels = await cli(context, "redis-cli PUBSUB CHANNELS after", ["PUBSUB", "CHANNELS"]);
        context.expect(channels.folder, [has("the scheduler channel is subscribed", channels.stdout, /^SchedulerUtil$/m)]);
        const clients = await cli(context, "redis-cli CLIENT LIST", ["CLIENT", "LIST"]);
        context.expect(clients.folder, [has("a duplicate connection is in subscriber mode", clients.stdout, /\bcmd=subscribe\b/)]);
        const unknown = await context.call("addTask without a handler", app, {
          interface: "@antelopejs/interface-redis-scheduler",
          path: ["addTask"],
          args: ["verify-missing", Date.now() + 60_000, "payload"],
        });
        context.expect(unknown.folder, [
          equal("addTask was rejected", unknown.ok, false),
          has("the rejection names the handler", JSON.stringify(unknown.value), /Unknown SchedulerUtil handler: verify-missing/),
        ]);
        const queued = await cli(context, "redis-cli EXISTS task queue", ["EXISTS", "SchedulerUtil.Tasks"]);
        context.expect(queued.folder, [equal("nothing was queued", queued.stdout.trim(), "0")]);
        await context.stop("SIGINT", app);
      },
    },
    "host-port-db": {
      title: "without a url, host, port and db select the database; keys land in it and nowhere else",
      entryPoint: "`config: { host, port, db }` read by the module, then `GetClient()`",
      async run(context) {
        const redis = endpoint(context);
        const fixture = context.fixture({ moduleConfig: { host: redis.host, port: redis.port, db: 3 } });
        const app = await context.dev("ajs project dev", fixture);
        const set = await viaClient(context, "set through the module", app, "set", KEY, "in-db-3");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const session = await viaClient(context, "CLIENT INFO through the module", app, "call", "CLIENT", "INFO");
        context.expect(session.folder, [has("the module's session uses db 3", JSON.stringify(session.value), /\bdb=3\b/)]);
        const inThree = await cli(context, "redis-cli GET in db 3", ["-n", "3", "GET", KEY]);
        context.expect(inThree.folder, [equal("db 3 holds the value", inThree.stdout.trim(), "in-db-3")]);
        const inZero = await cli(context, "redis-cli EXISTS in db 0", ["-n", "0", "EXISTS", KEY]);
        context.expect(inZero.folder, [equal("db 0 holds nothing", inZero.stdout.trim(), "0")]);
        await context.stop("SIGINT", app);
      },
    },
    "url-with-options": {
      title: "a url combined with ioredis options applies both: the url picks the server, the options pick db and key prefix",
      entryPoint: "`config: { url, db, keyPrefix }` read by the module, then `GetClient()`",
      async run(context) {
        const redis = endpoint(context);
        const fixture = context.fixture({ moduleConfig: { url: `redis://${redis.host}:${redis.port}`, db: 4, keyPrefix: "app:" } });
        const app = await context.dev("ajs project dev", fixture);
        const set = await viaClient(context, "set through the module", app, "set", "greeting", "prefixed");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const stored = await cli(context, "redis-cli GET in db 4", ["-n", "4", "GET", "app:greeting"]);
        context.expect(stored.folder, [equal("db 4 holds the prefixed key", stored.stdout.trim(), "prefixed")]);
        const inZero = await cli(context, "redis-cli DBSIZE in db 0", ["-n", "0", "DBSIZE"]);
        context.expect(inZero.folder, [equal("db 0 holds nothing", inZero.stdout.trim(), "0")]);
        await context.stop("SIGINT", app);
      },
    },
    "db-isolation": {
      title: "two modules on different dbs of one server never see each other's keys, and a delete in one leaves the other intact",
      entryPoint: "`config.db` of two runs against the same server",
      async run(context) {
        const redis = endpoint(context);
        const url = `redis://${redis.host}:${redis.port}`;
        const project = context.fixture({ moduleConfig: { url, db: 1 } });
        const first = await context.dev("db 1 ajs project dev", project);
        const set = await viaClient(context, "set in db 1", first, "set", KEY, "one");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        await context.stop("SIGINT", first);
        reconfigure(context, project, { url, db: 2 });
        const second = await context.dev("db 2 ajs project dev", project);
        const seen = await viaClient(context, "get from db 2", second, "get", KEY);
        context.expect(seen.folder, [equal("db 2 does not see the db 1 key", seen.value, null)]);
        const removed = await viaClient(context, "del in db 2", second, "del", KEY);
        context.expect(removed.folder, [equal("the delete in db 2 removed nothing", removed.value, 0)]);
        await context.stop("SIGINT", second);
        const kept = await cli(context, "redis-cli GET in db 1", ["-n", "1", "GET", KEY]);
        context.expect(kept.folder, [equal("db 1 still holds its key", kept.stdout.trim(), "one")]);
      },
    },
    password: {
      title: "a password option authenticates the client; a module without it is rejected by a protected server",
      entryPoint: "`config: { url, password }` read by the module, then `GetClient()`",
      async run(context) {
        const redis = endpoint(context);
        const url = `redis://${redis.host}:${redis.port}`;
        const protect = await cli(context, "redis-cli CONFIG SET requirepass", ["CONFIG", "SET", "requirepass", PASSWORD]);
        context.expect(protect.folder, [equal("the server now requires a password", protect.stdout.trim(), "OK")], { critical: true });
        const project = context.fixture({ moduleConfig: { url, password: PASSWORD } });
        const allowed = await context.dev("authenticated ajs project dev", project);
        const set = await viaClient(context, "set with the password", allowed, "set", KEY, "secret");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        await context.stop("SIGINT", allowed);
        const stored = await cli(context, "redis-cli GET with the password", ["-a", PASSWORD, "--no-auth-warning", "GET", KEY]);
        context.expect(stored.folder, [equal("the value is stored", stored.stdout.trim(), "secret")]);
        reconfigure(context, project, { url, maxRetriesPerRequest: 1 });
        const anonymous = await context.dev("anonymous ajs project dev", project);
        const denied = await viaClient(context, "set without the password", anonymous, "set", KEY, "intruder");
        context.expect(denied.folder, [
          equal("the command was rejected", denied.ok, false),
          has("the server answered NOAUTH", JSON.stringify(denied.value), /NOAUTH|Authentication required/i),
        ]);
        await context.stop("SIGINT", anonymous);
        const intact = await cli(context, "redis-cli GET after the denied write", ["-a", PASSWORD, "--no-auth-warning", "GET", KEY]);
        context.expect(intact.folder, [equal("the denied write changed nothing", intact.stdout.trim(), "secret")]);
      },
    },
    "no-real-writes": {
      title: "with useMock the client is in memory: a write is readable through the module and absent from the real Redis",
      entryPoint: "`config: { url, useMock: true }` read by the module, then `GetClient()`",
      async run(context) {
        const redis = endpoint(context);
        const fixture = context.fixture({ moduleConfig: { url: `redis://${redis.host}:${redis.port}`, useMock: true } });
        const app = await context.dev("ajs project dev", fixture);
        const set = await viaClient(context, "set through the mock", app, "set", KEY, "in-memory");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const get = await viaClient(context, "get through the mock", app, "get", KEY);
        context.expect(get.folder, [equal("the mock returns the value", get.value, "in-memory")]);
        const size = await cli(context, "redis-cli DBSIZE", ["DBSIZE"]);
        context.expect(size.folder, [equal("the real Redis holds no key", size.stdout.trim(), "0")]);
        const clients = await cli(context, "redis-cli CLIENT LIST", ["CLIENT", "LIST"]);
        context.expect(clients.folder, [equal("only redis-cli itself is connected", clients.stdout.trim().split("\n").length, 1)]);
        await context.stop("SIGINT", app);
      },
    },
    "mock-forgets-on-restart": {
      title: "a mock client keeps nothing across a restart, and an unknown key reads null",
      entryPoint: "Ctrl+C then `ajs project dev` again with `useMock: true`",
      async run(context) {
        const fixture = context.fixture({ moduleConfig: { useMock: true } });
        const first = await context.dev("first ajs project dev", fixture);
        const set = await viaClient(context, "set through the mock", first, "set", KEY, "gone-soon");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        await context.stop("SIGINT", first);
        const second = await context.dev("second ajs project dev", fixture);
        const get = await viaClient(context, "get after restart", second, "get", KEY);
        context.expect(get.folder, [equal("the mock forgot the key", get.value, null)]);
        await context.stop("SIGINT", second);
      },
    },
    "survives-restart": {
      title: "a value written before a restart is read back after it, and the key stays in Redis while the module is down",
      entryPoint: "Ctrl+C on `ajs project dev`, then `ajs project dev` again",
      async run(context) {
        const fixture = context.fixture();
        const first = await context.dev("first ajs project dev", fixture);
        const set = await viaClient(context, "set before restart", first, "set", KEY, "kept");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const stopped = await context.stop("SIGINT", first);
        context.expect(stopped.folder, [exitIs(stopped, 130)]);
        const down = await cli(context, "redis-cli GET while the module is down", ["GET", KEY]);
        context.expect(down.folder, [equal("Redis still holds the value", down.stdout.trim(), "kept")]);
        const second = await context.dev("second ajs project dev", fixture);
        const get = await viaClient(context, "get after restart", second, "get", KEY);
        context.expect(get.folder, [equal("the value survived the restart", get.value, "kept")]);
        await context.stop("SIGINT", second);
      },
    },
    "stop-quits": {
      title: "stopping the module sends QUIT on its connection and leaves no client connected",
      entryPoint: "Ctrl+C on `ajs project dev`",
      async run(context) {
        const app = await context.dev("ajs project dev", context.fixture());
        const ping = await viaClient(context, "ping through the module", app, "ping");
        context.expect(ping.folder, [equal("ping answered PONG", ping.value, "PONG")]);
        const running = await cli(context, "redis-cli CLIENT LIST while running", ["CLIENT", "LIST"]);
        context.expect(running.folder, [equal("the module and redis-cli are connected", running.stdout.trim().split("\n").length, 2)], { critical: true });
        const stopped = await context.stop("SIGINT", app);
        context.expect(stopped.folder, [exitIs(stopped, 130)]);
        const after = await cli(context, "redis-cli CLIENT LIST after stop", ["CLIENT", "LIST"]);
        context.expect(after.folder, [equal("only redis-cli itself is connected", after.stdout.trim().split("\n").length, 1)]);
        const stats = await cli(context, "redis-cli INFO commandstats", ["INFO", "commandstats"]);
        context.expect(stats.folder, [has("the module closed its connection with QUIT", stats.stdout, /cmdstat_quit:calls=[1-9]/)]);
      },
    },
    "lazy-connect": {
      title: "with lazyConnect the module connects on start, so the first consumer command is not delayed and the client quits on stop",
      entryPoint: "`config: { url, lazyConnect: true }` read by the module, then `GetClient()`",
      async run(context) {
        const redis = endpoint(context);
        const fixture = context.fixture({ moduleConfig: { url: `redis://${redis.host}:${redis.port}`, lazyConnect: true } });
        const app = await context.dev("ajs project dev", fixture);
        const clients = await cli(context, "redis-cli CLIENT LIST before any command", ["CLIENT", "LIST"]);
        context.expect(clients.folder, [equal("the module connected without a command", clients.stdout.trim().split("\n").length, 2)], { critical: true });
        const set = await viaClient(context, "set through the module", app, "set", KEY, "lazy");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const stored = await cli(context, "redis-cli GET", ["GET", KEY]);
        context.expect(stored.folder, [equal("redis-cli reads the stored value", stored.stdout.trim(), "lazy")]);
        const stopped = await context.stop("SIGINT", app);
        context.expect(stopped.folder, [lacks("stderr", stopped.stderr, /unhandled|ECONNRESET/i)]);
      },
    },
  },
};

export default config;
