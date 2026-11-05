import { equal, exitIs, has, type VerifyConfig } from "@antelopejs/tooling-configs/verify";
import { KEY, cli, viaClient } from "./helpers.ts";

export const connectionJourneys: NonNullable<VerifyConfig["journeys"]> = {
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
};
