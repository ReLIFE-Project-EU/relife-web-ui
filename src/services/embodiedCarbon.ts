/**
 * Embodied-carbon estimate for a renovation package, from the ReLIFE technical
 * sheet dataset (`src/constants/technical-sheets/`).
 *
 * Interim source: the Technical service exposes no technical-sheet endpoint, so
 * the transcribed sheets stand in until a verified contract arrives. When one
 * does, this module is what gets replaced — the figures are not copied anywhere
 * else.
 *
 * Geometry comes from the unmodified archetype, matching the CAPEX lookup. So
 * per-building modifications that change envelope geometry or element U-values
 * are not reflected here even though the energy simulation does apply them —
 * the same limitation `lookupPackageCosts` carries.
 */

import {
  TECHNICAL_SHEET_BY_ID,
  type EmbodiedCarbonEntry,
  type NumericRange,
  type TechnicalSheet,
  type TechnicalSheetId,
} from "../constants/technical-sheets";
import type { BuildingPayload } from "../types/archetype";
import type { ArchetypeInfo } from "../types/forecasting";
import type { RenovationMeasureId } from "../types/renovation";
import {
  envelopeElementsFromBui,
  type EnvelopeElement,
  type EnvelopeElementGeometry,
} from "../utils/archetypeModifier";
import { heatingCapacityKwFromFloorArea } from "./hvacSizing";
import {
  resolveArchetypeGeometry,
  type PackageCostLookupDeps,
} from "./packageCostLookup";
import { pvKwpFromFloorArea } from "./pvConfig";
import { U_VALUE_TARGETS } from "./renovationEcmParams";

/**
 * Which sheet stands for each measure. Several sheets can serve one measure and
 * the app never asks the user which material they will use, so one default is
 * declared per measure rather than inferred.
 *
 * EPS is the only insulation sheet without a data-quality flag against it; see
 * the source issues in `technical-sheets/README.md`. All three window sheets
 * carry identical flags, so PVC is picked as their median by carbon (wood 40,
 * PVC 86, aluminium 105 kgCO₂e/m² double-glazed), which neither flatters nor
 * penalises the measure. `solar-thermal` is absent deliberately: it is not
 * analysable anywhere in the app, matching `MEASURE_ACTION_MAP` in
 * `renovationActions.ts`.
 */
const DEFAULT_SHEET_BY_MEASURE: Partial<
  Record<RenovationMeasureId, TechnicalSheetId>
> = {
  "wall-insulation": "eps-insulation",
  "roof-insulation": "eps-insulation",
  "floor-insulation": "eps-insulation",
  windows: "pvc-window",
  "air-water-heat-pump": "air-to-water-heat-pump",
  "condensing-boiler": "condensing-boiler",
  pv: "photovoltaic-system",
};

/** Envelope element each insulation/window measure is applied to. */
const ENVELOPE_ELEMENT_BY_MEASURE: Partial<
  Record<RenovationMeasureId, EnvelopeElement>
> = {
  "wall-insulation": "wall",
  "roof-insulation": "roof",
  "floor-insulation": "floor",
  windows: "window",
};

interface Point {
  x: number;
  y: number;
}

/**
 * Linear interpolation across a sheet table, extending beyond either end from
 * the two nearest points. Extrapolation is faithful to the source: the sheets
 * themselves derive missing thicknesses and capacities by assuming linearity
 * from a measured point.
 */
function interpolate(points: Point[], x: number): number | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0].y;

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const exact = sorted.find((point) => point.x === x);
  if (exact) return exact.y;

  const upperIndex = sorted.findIndex((point) => point.x > x);
  // Below the first point extrapolates from the first pair, above the last from
  // the last pair; otherwise interpolate within the bracketing pair.
  const [left, right] =
    upperIndex === -1
      ? [sorted[sorted.length - 2], sorted[sorted.length - 1]]
      : upperIndex === 0
        ? [sorted[0], sorted[1]]
        : [sorted[upperIndex - 1], sorted[upperIndex]];

  const span = right.x - left.x;
  if (span === 0) return left.y;
  return left.y + ((x - left.x) / span) * (right.y - left.y);
}

/**
 * Extend a sheet table past its last row, using the slope measured across the
 * whole table and anchored at that last row. Preferred over continuing the
 * final segment, which on a short table is whichever pair of rows happens to
 * sit at the end and carries all the source's noise with it.
 */
function extrapolateFromTableSlope(points: Point[], x: number): number | null {
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (x <= last.x) return interpolate(sorted, x);

  const span = last.x - first.x;
  if (span === 0) return last.y;
  return last.y + ((last.y - first.y) / span) * (x - last.x);
}

function sheetFor(measureId: RenovationMeasureId): TechnicalSheet | undefined {
  const sheetId = DEFAULT_SHEET_BY_MEASURE[measureId];
  return sheetId ? TECHNICAL_SHEET_BY_ID.get(sheetId) : undefined;
}

/** Carbon per m² of insulation panel, for the thickness the target U demands. */
function insulationCarbonPerM2(
  sheet: TechnicalSheet,
  resistanceNeeded: number,
): number | null {
  const resistanceRows = sheet.technicalInformation.rows
    .filter(
      (row) =>
        row.thicknessMm !== undefined &&
        row.thermalResistanceM2KW !== undefined,
    )
    .map((row) => ({ x: row.thicknessMm!, y: row.thermalResistanceM2KW! }));

  const carbonRows = sheet.embodiedCarbon.entries
    .filter(
      (entry) =>
        entry.thicknessMm !== undefined && entry.functionalUnit === "per-m2",
    )
    .map((entry) => ({ x: entry.thicknessMm!, y: entry.kgCO2e }));

  if (resistanceRows.length === 0 || carbonRows.length === 0) return null;

  const byThickness = [...resistanceRows].sort((a, b) => a.x - b.x);
  const thinnest = byThickness[0];

  // An element already at or past target still gets insulated — the user chose
  // the measure and is charged for it — so it takes the thinnest panel listed.
  if (resistanceNeeded <= 0) return interpolate(carbonRows, thinnest.x);

  const sufficient = byThickness.find((row) => row.y >= resistanceNeeded);
  if (sufficient) return interpolate(carbonRows, sufficient.x);

  // Past the thickest panel the sheet lists — where roof targets (0.2 W/m²K)
  // routinely land, so clamping to the table would systematically understate
  // them. Thickness scales proportionally because resistance is proportional to
  // it. Carbon does not: a panel carries fixed extras (adhesive, mesh, render)
  // whatever its thickness, so it extends by the slope across the whole table,
  // not the closing segment, which on a short table is the noisiest choice.
  const thickest = byThickness[byThickness.length - 1];
  const thicknessNeeded = thickest.x * (resistanceNeeded / thickest.y);
  return extrapolateFromTableSlope(carbonRows, thicknessNeeded);
}

/**
 * Carbon per m² of window, for the cheapest glazing that reaches the target U.
 * Falls back to the best-performing glazing when none qualifies.
 */
function windowCarbonPerM2(
  sheet: TechnicalSheet,
  uTarget: number,
): number | null {
  const carbonByGlazing = new Map(
    sheet.embodiedCarbon.entries
      .filter(
        (entry) =>
          entry.glazing !== undefined && entry.functionalUnit === "per-m2",
      )
      .map((entry) => [entry.glazing!, entry.kgCO2e]),
  );

  const options = sheet.technicalInformation.rows
    .filter(
      (row) =>
        row.glazing !== undefined &&
        row.thermalResistanceM2KW !== undefined &&
        carbonByGlazing.has(row.glazing),
    )
    .map((row) => ({
      uValue: 1 / row.thermalResistanceM2KW!,
      kgCO2e: carbonByGlazing.get(row.glazing!)!,
    }));

  if (options.length === 0) return null;

  const qualifying = options.filter((option) => option.uValue <= uTarget);
  if (qualifying.length > 0) {
    return Math.min(...qualifying.map((option) => option.kgCO2e));
  }

  return options.reduce((best, option) =>
    option.uValue < best.uValue ? option : best,
  ).kgCO2e;
}

/**
 * Carbon for a whole heating unit at the sized capacity.
 *
 * Sheets express this two ways. The heat pump gives banded capacities, where
 * the nearest band applies. The boiler gives discrete capacities derived
 * linearly from one measured 14 kW point, so interpolating across them matches
 * how the source built the table.
 */
function heatingUnitCarbon(
  sheet: TechnicalSheet,
  capacityKw: number,
): number | null {
  const entries = sheet.embodiedCarbon.entries.filter(
    (entry) =>
      entry.capacityKw !== undefined && entry.functionalUnit === "per-unit",
  );
  if (entries.length === 0) return null;

  const banded = entries.filter(
    (entry) => typeof entry.capacityKw === "object",
  );

  if (banded.length > 0) {
    const bandOf = (entry: EmbodiedCarbonEntry) =>
      entry.capacityKw as NumericRange;
    const distanceToBand = (entry: EmbodiedCarbonEntry): number => {
      const band = bandOf(entry);
      if (capacityKw < band.min) return band.min - capacityKw;
      if (capacityKw > band.max) return capacityKw - band.max;
      return 0;
    };

    const largest = banded.reduce((best, entry) =>
      bandOf(entry).max > bandOf(best).max ? entry : best,
    );

    // Past the biggest unit the sheet lists, extend from the band midpoints.
    // Pinning to the top band instead would flatten every larger building onto
    // one figure — the heat pump's table stops at 15 kW while the boiler's
    // numeric rows keep scaling, so the two would stop being comparable exactly
    // where RSE puts them side by side.
    if (capacityKw > bandOf(largest).max) {
      return interpolate(
        banded.map((entry) => ({
          x: (bandOf(entry).min + bandOf(entry).max) / 2,
          y: entry.kgCO2e,
        })),
        capacityKw,
      );
    }

    // Inside the table: the band that contains the capacity, or the nearest one
    // where the sheet leaves a gap between bands.
    return banded.reduce((best, entry) =>
      distanceToBand(entry) < distanceToBand(best) ? entry : best,
    ).kgCO2e;
  }

  return interpolate(
    entries.map((entry) => ({
      x: entry.capacityKw as number,
      y: entry.kgCO2e,
    })),
    capacityKw,
  );
}

/**
 * Carbon for a PV array, modules only.
 *
 * The sheet's "Inverter 3000 Watt" row (about 347 kg/kW) runs some 5-10x above
 * published EPDs, so including it overstates PV by roughly 70% where omitting
 * it understates by roughly 7%, and counting whole units would step the total
 * by 1040 kg at every 3 kWp boundary. Restoring it means counting the per-unit
 * rows here too.
 */
function pvCarbon(sheet: TechnicalSheet, kwp: number): number | null {
  const moduleEntry = sheet.embodiedCarbon.entries.find(
    (entry) => entry.functionalUnit === "per-wp",
  );
  if (!moduleEntry) return null;
  return moduleEntry.kgCO2e * kwp * 1000;
}

function measureCarbon(
  measureId: RenovationMeasureId,
  elements: Record<EnvelopeElement, EnvelopeElementGeometry>,
  floorArea: number | null,
): number | null {
  const sheet = sheetFor(measureId);
  if (!sheet) return null;

  const element = ENVELOPE_ELEMENT_BY_MEASURE[measureId];
  if (element) {
    const geometry = elements[element];
    const uTarget = U_VALUE_TARGETS[measureId];
    if (geometry.areaM2 <= 0 || geometry.uValue === null || !uTarget) {
      return null;
    }

    const perM2 =
      measureId === "windows"
        ? windowCarbonPerM2(sheet, uTarget)
        : insulationCarbonPerM2(sheet, 1 / uTarget - 1 / geometry.uValue);

    return perM2 === null ? null : perM2 * geometry.areaM2;
  }

  if (measureId === "pv") {
    const kwp = pvKwpFromFloorArea(floorArea);
    return kwp === null ? null : pvCarbon(sheet, kwp);
  }

  const capacityKw = heatingCapacityKwFromFloorArea(floorArea);
  return capacityKw === null ? null : heatingUnitCarbon(sheet, capacityKw);
}

/**
 * Total embodied carbon (kgCO₂e) of a package's measures.
 *
 * Returns null when a measure that *should* have a figure cannot be quantified
 * — a missing surface, or geometry the classifier could not resolve — rather
 * than a partial sum, which consumers cannot tell from a genuinely small total
 * (see the exclusion guard in `TechnicalMCDAService.ts`). Measures with no
 * sheet of their own are skipped rather than fatal, mirroring how
 * `lookupPackageCostsFromDetails` ignores measures it cannot price.
 */
export function estimatePackageEmbodiedCarbonFromBui(params: {
  bui: BuildingPayload;
  floorArea: number | null;
  measureIds: RenovationMeasureId[];
}): number | null {
  const elements = envelopeElementsFromBui(params.bui);

  let total = 0;
  let counted = 0;
  for (const measureId of params.measureIds) {
    if (!DEFAULT_SHEET_BY_MEASURE[measureId]) continue;

    const kgCO2e = measureCarbon(measureId, elements, params.floorArea);
    if (kgCO2e === null) return null;

    total += kgCO2e;
    counted += 1;
  }

  return counted > 0 ? total : null;
}

/**
 * Same estimate, resolving the archetype geometry first. Shares
 * `resolveArchetypeGeometry` with the cost lookup so both work from identical
 * surfaces, including the apartment floor-area scaling.
 */
export async function estimatePackageEmbodiedCarbon(
  params: {
    archetype: ArchetypeInfo | undefined;
    floorArea: number | null;
    measureIds: RenovationMeasureId[];
    scaleEnvelopeToFloorArea?: boolean;
  },
  deps: Pick<PackageCostLookupDeps, "building">,
): Promise<number | null> {
  if (!params.archetype) return null;

  const geometry = await resolveArchetypeGeometry(
    {
      archetype: params.archetype,
      floorArea: params.floorArea,
      scaleEnvelopeToFloorArea: params.scaleEnvelopeToFloorArea,
    },
    deps,
  );

  return estimatePackageEmbodiedCarbonFromBui({
    bui: geometry.bui,
    floorArea: geometry.floorArea,
    measureIds: params.measureIds,
  });
}
