/**
 * E2E artifact capture for the renovation-result-validator skill.
 *
 * After a journey completes, each spec calls captureRunArtifacts() to persist
 * the structured audit trace (window.__relifeAudit, see
 * src/utils/auditLogger.ts), a full-page screenshot of the results step, and
 * a small metadata file under .work/e2e/artifacts/<tool>/. The validator
 * skill consumes exactly this trio.
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export type Tool = "hra" | "pra";

export interface AuditEvent {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  category: string;
  event: string;
  scope: string;
  runId: string;
  buildingId?: string;
  scenarioId?: string;
  data: Record<string, unknown>;
}

const ARTIFACTS_ROOT = path.resolve(".work/e2e/artifacts");

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Dump the in-page audit buffer and persist the artifact trio
 * (audit.json, results.png, meta.json) for the given tool.
 */
export async function captureRunArtifacts(
  page: Page,
  tool: Tool,
): Promise<AuditEvent[]> {
  const events = (await page.evaluate(() => {
    // globalThis === window in the page; avoids needing the DOM lib in the
    // Node-side tsconfig that typechecks this file.
    const audit = (
      globalThis as unknown as { __relifeAudit?: { dump(): unknown[] } }
    ).__relifeAudit;
    if (!audit) {
      throw new Error(
        "window.__relifeAudit is unavailable. The dev server must run with " +
          "VITE_RELIFE_AUDIT_LOG=debug (playwright.config.ts sets this; a " +
          "manually started dev server that gets reused must set it too).",
      );
    }
    return audit.dump();
  })) as AuditEvent[];

  const dir = path.join(ARTIFACTS_ROOT, tool);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "audit.json"), JSON.stringify(events, null, 2));
  await page.screenshot({
    path: path.join(dir, "results.png"),
    fullPage: true,
  });
  writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify(
      {
        tool,
        capturedAt: new Date().toISOString(),
        gitSha: gitSha(),
        eventCount: events.length,
      },
      null,
      2,
    ),
  );

  return events;
}

/**
 * Assert that the audit trace contains a completed run for the given scope:
 * the latest run must include every required event and no error-level events.
 * Returns the events of that run for further tool-specific assertions.
 */
export function expectCleanAuditRun(
  events: AuditEvent[],
  scope: Tool,
  requiredEvents: string[],
): AuditEvent[] {
  const scoped = events.filter((event) => event.scope === scope);
  expect(
    scoped.length,
    `no audit events with scope "${scope}"`,
  ).toBeGreaterThan(0);

  const runIds = [...new Set(scoped.map((event) => event.runId))];
  const lastRunId = runIds[runIds.length - 1];
  const run = scoped.filter((event) => event.runId === lastRunId);

  const errors = run.filter((event) => event.level === "error");
  expect(
    errors,
    `audit run ${lastRunId} contains error events: ${errors
      .map((event) => event.event)
      .join(", ")}`,
  ).toEqual([]);

  for (const name of requiredEvents) {
    expect(
      run.some((event) => event.event === name),
      `audit run ${lastRunId} is missing required event "${name}"`,
    ).toBe(true);
  }

  return run;
}
