import { equal, has, type VerifyConfig } from "@antelopejs/tooling-configs/verify";
import { KEY, PASSWORD, cli, endpoint, reconfigure, viaClient } from "./helpers.ts";

export const optionsJourneys: NonNullable<VerifyConfig["journeys"]> = {
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
    "default-db": {
      title: "without a db option the module uses db 0: keys land there, and the keys another application keeps in db 1 stay untouched",
      entryPoint: "`GetClient()` on a module configured with a `url` only",
      async run(context) {
        const other = await cli(context, "redis-cli SET in db 1", ["-n", "1", "SET", KEY, "other-app"]);
        context.expect(other.folder, [equal("another application's key is stored in db 1", other.stdout.trim(), "OK")], { critical: true });
        const app = await context.dev("ajs project dev", context.fixture());
        const session = await viaClient(context, "CLIENT INFO through the module", app, "call", "CLIENT", "INFO");
        context.expect(session.folder, [has("the module's session uses db 0", JSON.stringify(session.value), /\bdb=0\b/)]);
        const seen = await viaClient(context, "get the db 1 key", app, "get", KEY);
        context.expect(seen.folder, [equal("the module does not see the db 1 key", seen.value, null)]);
        const set = await viaClient(context, "set through the module", app, "set", KEY, "default");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const del = await viaClient(context, "del a second key", app, "del", "verify:other");
        context.expect(del.folder, [equal("del removed nothing", del.value, 0)]);
        const inZero = await cli(context, "redis-cli GET in db 0", ["-n", "0", "GET", KEY]);
        context.expect(inZero.folder, [equal("db 0 holds the value", inZero.stdout.trim(), "default")]);
        const inOne = await cli(context, "redis-cli GET in db 1", ["-n", "1", "GET", KEY]);
        context.expect(inOne.folder, [equal("db 1 still holds the other application's value", inOne.stdout.trim(), "other-app")]);
        await context.stop("SIGINT", app);
      },
    },
    "url-db-path": {
      title: "a url that names a database in its path selects it, and no option overrides it",
      entryPoint: "`config: { url: \"redis://host:port/5\" }` read by the module, then `GetClient()`",
      async run(context) {
        const redis = endpoint(context);
        const fixture = context.fixture({ moduleConfig: { url: `redis://${redis.host}:${redis.port}/5` } });
        const app = await context.dev("ajs project dev", fixture);
        const session = await viaClient(context, "CLIENT INFO through the module", app, "call", "CLIENT", "INFO");
        context.expect(session.folder, [has("the module's session uses db 5", JSON.stringify(session.value), /\bdb=5\b/)]);
        const set = await viaClient(context, "set through the module", app, "set", KEY, "in-db-5");
        context.expect(set.folder, [equal("set answered OK", set.value, "OK")]);
        const inFive = await cli(context, "redis-cli GET in db 5", ["-n", "5", "GET", KEY]);
        context.expect(inFive.folder, [equal("db 5 holds the value", inFive.stdout.trim(), "in-db-5")]);
        const elsewhere = await cli(context, "redis-cli DBSIZE in db 0", ["-n", "0", "DBSIZE"]);
        context.expect(elsewhere.folder, [equal("db 0 holds nothing", elsewhere.stdout.trim(), "0")]);
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
};
