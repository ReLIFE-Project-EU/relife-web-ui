import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    // Longer timeout — trace collects all data and never bails early
    testTimeout: 180_000,
    hookTimeout: 30_000,

    // Only the trace file — never included in test:integration
    include: ["tests/integration/pra-trace.test.ts"],

    pool: "forks",
    fileParallelism: false,

    // Do NOT stop on first failure — collect all available data
    bail: 0,

    coverage: {
      enabled: false,
    },
  },
});
