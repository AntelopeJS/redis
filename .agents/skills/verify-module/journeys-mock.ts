import { equal, type VerifyConfig } from "@antelopejs/tooling-configs/verify";
import { KEY, cli, endpoint, viaClient } from "./helpers.ts";

export const mockJourneys: NonNullable<VerifyConfig["journeys"]> = {
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
};
