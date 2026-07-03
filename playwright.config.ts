import { defineConfig, devices } from "@playwright/test";

/**
 * Browser E2E journeys for the active HRA and PRA tool flows.
 *
 * Prerequisites: the backend Docker stack must be running (`task up-local`).
 * The canonical entry point is `task test-e2e`, which brings the stack up
 * before invoking `npm run test:e2e`. See tests/e2e/README.md.
 *
 * The dev server is started with VITE_RELIFE_AUDIT_LOG=debug so each journey
 * can extract the structured audit trace via window.__relifeAudit.dump() and
 * persist it as an artifact for the renovation-result-validator skill.
 */
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: ".work/e2e/test-results",
  // Renovation pipelines make many sequential backend calls per run; run the
  // journeys serially so they don't contend for backend resources.
  fullyParallel: false,
  workers: 1,
  timeout: 10 * 60 * 1000,
  expect: { timeout: 30_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: ".work/e2e/report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      VITE_RELIFE_AUDIT_LOG: "debug",
    },
  },
});
