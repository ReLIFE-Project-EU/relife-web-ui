import { auditLog } from "../../utils/auditLogger";
import type { AuditScope } from "../../utils/auditLogger";
import type { BuildingLineage } from "./lineageModel";
import { projectLineage } from "./projectLineage";

export interface LineageSnapshot {
  capturedAt: string;
  runId: string;
  commitSha: string;
  lineage: BuildingLineage;
}

const STORAGE_KEY_PREFIX = "relife-lineage:";

/**
 * Projects the tool's latest run and stores only the displayed lineage, so the
 * page opened in a new tab can read it. Throws when there is nothing to show
 * or storage is unavailable, leaving any previous snapshot in place.
 */
export function saveLineageSnapshot(scope: AuditScope): void {
  const scoped = auditLog.dump().filter((event) => event.scope === scope);
  const runId = scoped.at(-1)?.runId;
  const lineage = projectLineage(
    scoped.filter((event) => event.runId === runId),
  );
  if (
    runId === undefined ||
    lineage.energyProfile.length + lineage.renovation.length === 0
  ) {
    throw new Error("No calculation trace found for this tool yet.");
  }

  const snapshot: LineageSnapshot = {
    capturedAt: new Date().toISOString(),
    runId,
    commitSha: __APP_COMMIT_SHA__,
    lineage,
  };
  localStorage.setItem(STORAGE_KEY_PREFIX + scope, JSON.stringify(snapshot));
}

/** Returns null when no snapshot exists; throws on unreadable storage. */
export function loadLineageSnapshot(scope: string): LineageSnapshot | null {
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + scope);
  return stored === null ? null : (JSON.parse(stored) as LineageSnapshot);
}
