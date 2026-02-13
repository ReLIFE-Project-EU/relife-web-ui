import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment (no browser, no jsdom)
    environment: "node",

    // Long timeouts for API calls (especially simulate/ECM which can be slow)
    testTimeout: 120_000,
    hookTimeout: 30_000,

    // Only include integration tests (trace utility has its own config)
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["tests/integration/pra-trace.test.ts"],

    // Sequential execution (no parallel tests; single worker)
    pool: "forks",
    fileParallelism: false,

    // Stop on first failure (fail-fast for dependent test steps)
    bail: 1,

    // Disable coverage for integration tests
    coverage: {
      enabled: false,
    },
  },
});
