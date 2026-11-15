import assert from "node:assert";

import { Logging } from "@antelopejs/interface-core/logging";
import logListener, {
  type Log,
} from "@antelopejs/interface-core/logging/listener";
import { GetClient } from "@antelopejs/interface-redis";

import { construct, start, stop } from "../index";

const CLOSED_PORT_URL = "redis://127.0.0.1:26391";
const PENDING_WINDOW_MS = 200;

function redisWarnings(logs: Log[]): unknown[] {
  return logs
    .filter(
      (log) => log.channel === "redis" && log.levelId === Logging.Level.WARN,
    )
    .flatMap((log) => log.args);
}

function settlesWithin(
  promise: Promise<unknown>,
  ms: number,
): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
  ]);
}

describe("Client errors", () => {
  const logs: Log[] = [];
  const collect = (log: Log): void => {
    logs.push(log);
  };

  beforeEach(() => {
    logs.length = 0;
    logListener.register(collect);
  });

  afterEach(async () => {
    logListener.unregister(collect);
    await stop();
    construct({ useMock: true });
    await start();
  });

  it("forwards an error emitted by the served client to the redis channel", async () => {
    const client = await GetClient();
    const error = new Error("write EPIPE");

    client.emit("error", error);

    assert.deepStrictEqual(redisWarnings(logs), [error]);
  });

  it("forwards a refused connection of a real ioredis client to the redis channel", async () => {
    await stop();
    construct({
      url: CLOSED_PORT_URL,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
    });

    await assert.rejects(start());

    const codes = redisWarnings(logs).map((error) =>
      error instanceof Error && "code" in error ? error.code : undefined,
    );
    assert(codes.includes("ECONNREFUSED"));
  });

  it("keeps GetClient pending after stop until the next start serves a new client", async () => {
    const stopped = await GetClient();
    await stop();

    const next = GetClient();
    assert.strictEqual(await settlesWithin(next, PENDING_WINDOW_MS), false);

    construct({ useMock: true });
    await start();
    const served = await next;
    assert.notStrictEqual(served, stopped);
    assert.strictEqual(await served.ping(), "PONG");
  });
});
