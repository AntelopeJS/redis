import { equal, exitIs, has, lacks, type VerifyConfig } from "@antelopejs/tooling-configs/verify";
import { KEY, cli, endpoint, viaClient } from "./helpers.ts";

export const lifecycleJourneys: NonNullable<VerifyConfig["journeys"]> = {
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
};
