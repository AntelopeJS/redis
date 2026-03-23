import { defineConfig } from "@antelopejs/interface-core/config";

export default defineConfig({
  name: "redis-test",
  cacheFolder: ".antelope/cache",
  modules: {
    local: {
      source: { type: "local", path: "." },
      config: { useMock: true },
    },
  },
  test: {
    folder: "dist/test",
  },
});
