import type { App, CommandResult, JourneyContext, ServiceEndpoint } from "@antelopejs/tooling-configs/verify";

export const KEY = "verify:greeting";
export const PASSWORD = "verify-secret";

/** Runs `redis-cli` inside the run's own Redis container, the second view every journey reads state back through. */
export function cli(context: JourneyContext, name: string, args: string[]): Promise<CommandResult> {
  return context.native(name, "redis", ["redis-cli", ...args]);
}

/** Calls one ioredis method on the client `GetClient()` hands to a consumer module. */
export function viaClient(context: JourneyContext, name: string, app: App, method: string, ...args: (string | number)[]) {
  return context.call(name, app, { path: ["GetClient"], chain: [[method, ...args]] });
}


type ModuleConfig = NonNullable<NonNullable<Parameters<JourneyContext["fixture"]>[0]>["moduleConfig"]>;

/** Rewrites the fixture project's module config in place: `fixture()` can write a project only once per journey. */
export function reconfigure(context: JourneyContext, project: string, moduleConfig: ModuleConfig): void {
  const modules = {
    redis: { source: { type: "local", path: context.repo }, config: moduleConfig },
    "verify-driver": { source: { type: "local", path: "./driver" } },
  };
  context.edit("switch the module config", `${project}/antelope.config.ts`, `export default ${JSON.stringify({ name: "verify-redis", modules }, null, 2)};\n`);
}

export function endpoint(context: JourneyContext): ServiceEndpoint {
  return context.service("redis");
}
