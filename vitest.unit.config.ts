import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
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
