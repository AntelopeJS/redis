import type { VerifyConfig } from "@antelopejs/tooling-configs/verify";
import { PASSWORD } from "./helpers.ts";
import { connectionJourneys } from "./journeys-connection.ts";
import { lifecycleJourneys } from "./journeys-lifecycle.ts";
import { mockJourneys } from "./journeys-mock.ts";
import { optionsJourneys } from "./journeys-options.ts";

const config: VerifyConfig = {
  doors: {
    data: {
      globs: ["src/index.ts"],
      funnels: ["src/index.ts"],
      why: "the module builds the one client every consumer writes and deletes keys through: its url and db options decide which Redis database the keys land in, and the default must stay db 0 so an upgrade keeps reading the keys the last release wrote",
    },
    format: null,
    contract: {
      globs: ["package.json"],
      funnels: [],
      why: "the config keys (`url`, `useMock`, ioredis options), `antelopeJs.defaultConfig` and the implemented interfaces",
    },
    outbound: null,
    exposure: null,
    publish: {
      globs: ["package.json", ".release-it.json", "changelogen.config.json", ".github/workflows/release.yml"],
      funnels: [],
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
    ...connectionJourneys,
    ...optionsJourneys,
    ...mockJourneys,
    ...lifecycleJourneys,
  },
};

export default config;
