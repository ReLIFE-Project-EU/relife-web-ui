/**
 * Audit logger for HRA / PRA renovation pipelines.
 *
 * Captures the structured trace consumed by the renovation-result-validator
 * skill: pipeline stage markers, backend request/response payloads, and the
 * non-API transformations the skill audits (archetype resolution, area scale
 * factor, ARV/risk request shaping, savings semantic, MCDA criteria matrix).
 *
 * Activation is gated by the Vite env var VITE_RELIFE_AUDIT_LOG. When the
 * logger is disabled, every entry point is a near-zero-cost no-op and no
 * console output or globals are created.
 *
 *   VITE_RELIFE_AUDIT_LOG unset | "false" | "off"  → disabled
 *   VITE_RELIFE_AUDIT_LOG = "info"                 → info / warn / error
 *   VITE_RELIFE_AUDIT_LOG = "true" | "debug"       → all levels
 *
 * Severity (debug/info/warn/error) and category (env/pipeline/api/...) are
 * orthogonal so DevTools filtering remains useful.
 */

export type AuditLevel = "debug" | "info" | "warn" | "error";

export type AuditScope = "hra" | "pra" | "rse" | "unknown";

export type AuditCategory =
  | "env"
  | "pipeline"
  | "api"
  | "energy"
  | "renovation"
  | "financial"
  | "mcda"
  | "portfolio";

export interface AuditEvent {
  ts: string;
  level: AuditLevel;
  category: AuditCategory;
  event: string;
  scope: AuditScope;
  runId: string;
  buildingId?: string;
  scenarioId?: string;
  data: Record<string, unknown>;
}

export interface AuditCtx {
  scope: AuditScope;
  runId: string;
  buildingId?: string;
  scenarioId?: string;
  child(extras: { buildingId?: string; scenarioId?: string }): AuditCtx;
}

const LEVEL_RANK: Record<AuditLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const RING_BUFFER_CAP = 2000;
const SENSITIVE_KEY_RE = /auth|token|password|secret|bearer|cookie/i;

function readActivation(): { enabled: boolean; minLevel: AuditLevel } {
  const raw = (
    (import.meta.env.VITE_RELIFE_AUDIT_LOG as string | undefined) ?? ""
  )
    .toString()
    .trim()
    .toLowerCase();

  if (!raw || raw === "false" || raw === "off" || raw === "0") {
    return { enabled: false, minLevel: "error" };
  }
  if (raw === "info") {
    return { enabled: true, minLevel: "info" };
  }
  if (raw === "warn") {
    return { enabled: true, minLevel: "warn" };
  }
  // "true", "debug", "1", anything else truthy → debug
  return { enabled: true, minLevel: "debug" };
}

const { enabled: ENABLED, minLevel: MIN_LEVEL } = readActivation();

let buffer: AuditEvent[] = [];
let ambientCtx: AuditCtx | null = null;
let runCounter = 0;

function newRunId(scope: AuditScope): string {
  runCounter += 1;
  const cryptoRandom =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${scope}-${Date.now().toString(36)}-${runCounter}-${cryptoRandom}`;
}

function makeCtx(
  scope: AuditScope,
  runId: string,
  buildingId?: string,
  scenarioId?: string,
): AuditCtx {
  return {
    scope,
    runId,
    buildingId,
    scenarioId,
    child(extras) {
      return makeCtx(
        scope,
        runId,
        extras.buildingId ?? buildingId,
        extras.scenarioId ?? scenarioId,
      );
    },
  };
}

/**
 * Recursively strip values whose keys match the sensitive-name pattern.
 * Defensive only — call sites should not pass auth headers in the first place.
 */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(k)) continue;
    out[k] = sanitize(v, depth + 1);
  }
  return out;
}

function emit(
  level: AuditLevel,
  category: AuditCategory,
  event: string,
  data: Record<string, unknown>,
  explicitCtx?: AuditCtx,
): void {
  if (!ENABLED) return;
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;

  const ctx = explicitCtx ?? ambientCtx ?? makeCtx("unknown", "anonymous");

  const entry: AuditEvent = {
    ts: new Date().toISOString(),
    level,
    category,
    event,
    scope: ctx.scope,
    runId: ctx.runId,
    buildingId: ctx.buildingId,
    scenarioId: ctx.scenarioId,
    data: sanitize(data) as Record<string, unknown>,
  };

  buffer.push(entry);
  if (buffer.length > RING_BUFFER_CAP) {
    buffer.splice(0, buffer.length - RING_BUFFER_CAP);
  }

  const sink = console[level] ?? console.log;
  sink.call(console, "[relife-audit]", entry);
}

function downloadJson(filename: string, payload: unknown): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const auditLog = {
  enabled: ENABLED,

  /**
   * Begin a new top-level run for a tool. Sets the ambient context so
   * sequentially-executing call sites (HRA wizard) do not need to thread it.
   * PRA-style concurrent flows must also pass the returned ctx explicitly.
   */
  startRun(scope: Exclude<AuditScope, "unknown">): AuditCtx {
    const ctx = makeCtx(scope, newRunId(scope));
    if (ENABLED) {
      ambientCtx = ctx;
    }
    return ctx;
  },

  /** Clear the ambient context (call when leaving the tool). */
  endRun(): void {
    ambientCtx = null;
  },

  /** Get the current ambient ctx, or null if no run is active. */
  current(): AuditCtx | null {
    return ambientCtx;
  },

  debug(
    category: AuditCategory,
    event: string,
    data: Record<string, unknown> = {},
    ctx?: AuditCtx,
  ): void {
    emit("debug", category, event, data, ctx);
  },
  info(
    category: AuditCategory,
    event: string,
    data: Record<string, unknown> = {},
    ctx?: AuditCtx,
  ): void {
    emit("info", category, event, data, ctx);
  },
  warn(
    category: AuditCategory,
    event: string,
    data: Record<string, unknown> = {},
    ctx?: AuditCtx,
  ): void {
    emit("warn", category, event, data, ctx);
  },
  error(
    category: AuditCategory,
    event: string,
    data: Record<string, unknown> = {},
    ctx?: AuditCtx,
  ): void {
    emit("error", category, event, data, ctx);
  },

  /** Snapshot the in-memory buffer (does not clear it). */
  dump(): AuditEvent[] {
    return [...buffer];
  },

  clear(): void {
    buffer = [];
  },

  download(filename?: string): void {
    const scope = ambientCtx?.scope ?? "trace";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(filename ?? `relife-audit-${scope}-${stamp}.json`, buffer);
  },
};

// Expose the dump/download helpers to the browser for manual extraction.
if (ENABLED && typeof window !== "undefined") {
  (window as unknown as { __relifeAudit: typeof auditLog }).__relifeAudit =
    auditLog;
}
