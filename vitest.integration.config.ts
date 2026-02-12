import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment (no browser, no jsdom)
    environment: "node",

    // Long timeouts for API calls (especially simulate/ECM which can be slow)
    testTimeout: 120_000,
    hookTimeout: 30_000,

    // Only include integration tests
    include: ["tests/integration/**/*.test.ts"],

    // Sequential execution (no parallel tests)
    pool: "forks",
    singleFork: true,

    // Stop on first failure (fail-fast for dependent test steps)
    bail: 1,

    // Disable coverage for integration tests
    coverage: {
      enabled: false,
    },
  },
});
