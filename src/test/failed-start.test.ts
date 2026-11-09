import assert from "node:assert";
import * as net from "node:net";

import { construct, start, stop } from "../index";

const TEST_HOST = "127.0.0.1";
const TEST_PORT = 26390;
const STOP_DEADLINE_MS = 1000;
const RECONNECT_WINDOW_MS = 500;

function settlesWithin(promise: Promise<void>, ms: number): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("A module whose start failed", () => {
  let server: net.Server;
  let connections = 0;
  const url = `redis://${TEST_HOST}:${TEST_PORT}`;

  before(async () => {
    await stop();
    server = net.createServer((socket) => {
      connections += 1;
      socket.destroy();
    });
    await new Promise<void>((resolve) =>
      server.listen(TEST_PORT, TEST_HOST, resolve),
    );
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    construct({ useMock: true });
    await start();
  });

  it("rejects start and settles stop", async () => {
    construct({ url, lazyConnect: true, maxRetriesPerRequest: 0 });
    await assert.rejects(start());

    assert.strictEqual(await settlesWithin(stop(), STOP_DEADLINE_MS), true);
  });

  it("stops reconnecting once start rejects", async () => {
    construct({ url, lazyConnect: true, maxRetriesPerRequest: 0 });
    await assert.rejects(start());
    const afterReject = connections;

    await delay(RECONNECT_WINDOW_MS);

    assert.strictEqual(connections, afterReject);
    await stop();
  });
});
