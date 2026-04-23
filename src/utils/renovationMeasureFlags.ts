import type { RenovationMeasureId } from "../types/renovation";

const ENVELOPE_MEASURES: ReadonlySet<RenovationMeasureId> = new Set([
  "wall-insulation",
  "roof-insulation",
  "floor-insulation",
  "windows",
]);

const SYSTEM_MEASURES: ReadonlySet<RenovationMeasureId> = new Set([
  "condensing-boiler",
  "air-water-heat-pump",
]);

export interface RenovationMeasureFlags {
  hasEnvelope: boolean;
  hasSystem: boolean;
  hasPv: boolean;
}

export function getRenovationMeasureFlags(
  measureIds: readonly RenovationMeasureId[],
): RenovationMeasureFlags {
  let hasEnvelope = false;
  let hasSystem = false;
  let hasPv = false;

  for (const id of measureIds) {
    if (ENVELOPE_MEASURES.has(id)) {
      hasEnvelope = true;
    }
    if (SYSTEM_MEASURES.has(id)) {
      hasSystem = true;
    }
    if (id === "pv") {
      hasPv = true;
    }
  }

  return { hasEnvelope, hasSystem, hasPv };
}

/**
 * Short tooltip lines scoped to how this scenario mixes envelope, heating
 * system, and PV relative to the needs-based estimated EPC class.
 */
export function getEpcScenarioTooltipNotes(
  flags: RenovationMeasureFlags,
): string[] {
  const notes: string[] = [];

  if (flags.hasSystem) {
    if (flags.hasEnvelope) {
      notes.push(
        "This class reflects modeled thermal needs after envelope changes. Heating equipment also affects bills and delivered energy, shown in other rows when available.",
      );
    } else {
      notes.push(
        "This class mostly reflects modeled thermal needs per m². A heating-system upgrade can still improve bills and delivered energy even if this letter changes little.",
      );
    }
  }

  if (flags.hasPv) {
    notes.push(
      "Solar (PV) mainly changes electricity generation and grid use; this needs-based class may not capture those benefits.",
    );
  }

  return notes;
}

export function renovationScenariosNeedEpcComparisonNote(
  scenarios: ReadonlyArray<{ measureIds: readonly RenovationMeasureId[] }>,
): boolean {
  return scenarios.some((scenario) => {
    const flags = getRenovationMeasureFlags(scenario.measureIds);
    return flags.hasSystem || flags.hasPv;
  });
}
