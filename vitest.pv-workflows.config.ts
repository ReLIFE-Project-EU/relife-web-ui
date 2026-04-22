import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 180_000,
    hookTimeout: 30_000,
    include: [
      "tests/integration/hra-service-pv-workflow.test.ts",
      "tests/integration/pra-service-pv-workflow.test.ts",
    ],
    pool: "forks",
    fileParallelism: false,
    bail: 1,
    coverage: {
      enabled: false,
    },
  },
});
