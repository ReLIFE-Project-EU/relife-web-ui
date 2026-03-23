import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 180_000,
    hookTimeout: 30_000,
    include: ["tests/integration/forecasting-concurrency-smoke.test.ts"],
    pool: "forks",
    fileParallelism: false,
    bail: 1,
    coverage: {
      enabled: false,
    },
  },
});
