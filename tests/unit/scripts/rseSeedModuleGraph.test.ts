import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** Keep in sync with the `rse:seed` script in package.json. */
const NODE_FLAGS = ["--experimental-strip-types"];

const SEED_ENTRYPOINT = "./scripts/rse-cache/generate.ts";

/**
 * The seed script runs under plain Node ESM resolution, which requires explicit
 * file extensions on relative imports, while the rest of the repo is built by
 * Vite and omits them. Neither `tsc` (moduleResolution "bundler") nor ESLint
 * flags the mismatch, so this spawns the real command to catch it in CI rather
 * than when an operator runs `task rse-seed`.
 *
 * Importing the module only exercises the static import graph: `generate.ts`
 * guards `main()` behind an `import.meta.url` check, so no CLI, network, or
 * Supabase access happens here.
 */
describe("RSE cache seed module graph", () => {
  test("loads under plain Node ESM resolution", () => {
    const result = spawnSync(
      process.execPath,
      [
        ...NODE_FLAGS,
        "--input-type=module",
        "--eval",
        `await import(${JSON.stringify(SEED_ENTRYPOINT)});`,
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );

    const unresolved = /Cannot find module .*/.exec(result.stderr)?.[0];

    expect(
      unresolved,
      `${SEED_ENTRYPOINT} failed to load: ${unresolved}. Node ESM needs an ` +
        `explicit ".ts" extension on the relative import of that module.`,
    ).toBeUndefined();

    expect(result.status, result.stderr).toBe(0);
  }, 30_000);
});
