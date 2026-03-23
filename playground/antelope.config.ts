import { defineConfig } from "@antelopejs/interface-core/config";

export default defineConfig({
  name: "playground",
  modules: {
    playground: {
      source: {
        type: "local",
        path: ".",
        installCommand: ["npx tsc"],
      },
    },
    redis: {
      source: {
        type: "local",
        path: "..",
        installCommand: ["npx tsc"],
      },
      config: {
        url: "redis://127.0.0.1:6379",
      },
    },
  },
});
