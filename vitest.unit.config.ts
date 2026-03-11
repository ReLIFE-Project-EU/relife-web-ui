import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 10_000,
    hookTimeout: 5_000,
    include: ["tests/unit/**/*.test.ts"],
    pool: "threads",
    fileParallelism: true,
    coverage: {
      enabled: false,
    },
  },
});
