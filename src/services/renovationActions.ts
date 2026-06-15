/**
 * Maps the frontend's renovation measures onto the Financial service's canonical
 * `renovation_actions`, attaching the quantity each action needs for the
 * CAPEX/OPEX lookup: a surface `area_m2` for envelope measures, or a
 * `capacity_kw` for PV and heating systems.
 *
 * Pure: callers supply the building's surface areas and floor area. Actions
 * whose quantity cannot be resolved are skipped, so the caller can decide
 * whether the remaining list is enough to request a lookup.
 */

import type {
  RenovationAction,
  RenovationActionName,
} from "../types/financial";
import type { RenovationMeasureId } from "../types/renovation";
import { heatingCapacityKwFromFloorArea } from "./hvacSizing";
import { pvKwpFromFloorArea } from "./pvConfig";

/** Per-element surface areas (m²); shape matches `surfaceAreasFromBui`. */
export interface SurfaceAreas {
  wallM2: number;
  roofM2: number;
  floorM2: number;
  windowM2: number;
}

type QuantitySource =
  | { kind: "area"; surface: keyof SurfaceAreas }
  | { kind: "pvCapacity" }
  | { kind: "heatingCapacity" };

/**
 * Measure → canonical action + quantity source. Roof maps to the "Accessible"
 * variant (the lookup averages material variants when `material` is omitted).
 * `solar-thermal` is intentionally absent: it is unsupported in HRA packages and
 * has no reliable capacity sizing.
 */
const MEASURE_ACTION_MAP: Partial<
  Record<
    RenovationMeasureId,
    { action: RenovationActionName; quantity: QuantitySource }
  >
> = {
  "wall-insulation": {
    action: "Wall insulation",
    quantity: { kind: "area", surface: "wallM2" },
  },
  "roof-insulation": {
    action: "Roof insulation - Accessible",
    quantity: { kind: "area", surface: "roofM2" },
  },
  "floor-insulation": {
    action: "Floor insulation",
    quantity: { kind: "area", surface: "floorM2" },
  },
  windows: {
    action: "Windows",
    quantity: { kind: "area", surface: "windowM2" },
  },
  pv: {
    action: "PV",
    quantity: { kind: "pvCapacity" },
  },
  "air-water-heat-pump": {
    action: "Air-water Heat Pump",
    quantity: { kind: "heatingCapacity" },
  },
  "condensing-boiler": {
    action: "Condensing boiler",
    quantity: { kind: "heatingCapacity" },
  },
};

/**
 * Measures whose `capacity_kw` is sized by the temporary HVAC stopgap heuristic
 * (see `hvacSizing.ts`). The UI surfaces a notice when a package uses these, so
 * the source of truth stays here alongside the mapping.
 */
export const HEATING_STOPGAP_MEASURE_IDS: ReadonlySet<RenovationMeasureId> =
  new Set(
    (
      Object.entries(MEASURE_ACTION_MAP) as [
        RenovationMeasureId,
        { quantity: QuantitySource },
      ][]
    )
      .filter(([, mapping]) => mapping.quantity.kind === "heatingCapacity")
      .map(([measureId]) => measureId),
  );

/** True when a package contains a measure sized by the HVAC stopgap heuristic. */
export function packageUsesHeatingStopgap(
  measureIds: RenovationMeasureId[],
): boolean {
  return measureIds.some((id) => HEATING_STOPGAP_MEASURE_IDS.has(id));
}

/**
 * Build the `renovation_actions` list for the CAPEX/OPEX lookup from a package's
 * measures. Skips any action whose quantity is missing or non-positive.
 */
export function buildRenovationActions(params: {
  measureIds: RenovationMeasureId[];
  surfaceAreas: SurfaceAreas;
  floorArea: number | null;
}): RenovationAction[] {
  const actions: RenovationAction[] = [];

  for (const measureId of params.measureIds) {
    const mapping = MEASURE_ACTION_MAP[measureId];
    if (!mapping) continue;

    const { action, quantity } = mapping;

    if (quantity.kind === "area") {
      const area = params.surfaceAreas[quantity.surface];
      if (area > 0) actions.push({ action, area_m2: area });
      continue;
    }

    const capacityKw =
      quantity.kind === "pvCapacity"
        ? pvKwpFromFloorArea(params.floorArea)
        : heatingCapacityKwFromFloorArea(params.floorArea);
    if (capacityKw !== null) actions.push({ action, capacity_kw: capacityKw });
  }

  return actions;
}
