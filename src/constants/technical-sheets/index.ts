/**
 * ReLIFE technical sheet dataset.
 *
 * Eleven sheets covering envelope materials, heating/cooling systems and
 * on-site renewables, transcribed from the D3.2 source documents. See
 * `README.md` in this directory for provenance, unit conventions and the
 * data-quality register.
 */

import type { RenovationMeasureId } from "../../types/renovation";
import { INSULATION_SHEETS } from "./envelopeInsulation";
import { WINDOW_SHEETS } from "./envelopeWindows";
import { RENEWABLE_SHEETS } from "./renewables";
import { SYSTEM_SHEETS } from "./systems";
import type { TechnicalSheet, TechnicalSheetId } from "./types";

export * from "./types";

export const TECHNICAL_SHEETS: readonly TechnicalSheet[] = [
  ...INSULATION_SHEETS,
  ...WINDOW_SHEETS,
  ...SYSTEM_SHEETS,
  ...RENEWABLE_SHEETS,
];

/** Sheet lookup by id, built once at module load. */
export const TECHNICAL_SHEET_BY_ID: ReadonlyMap<
  TechnicalSheetId,
  TechnicalSheet
> = new Map(TECHNICAL_SHEETS.map((sheet) => [sheet.id, sheet]));

/**
 * Sheets grouped by the renovation measures they inform.
 *
 * The relationship is many-to-many: each insulation material serves all three
 * insulation measures, the three window materials share `windows`, and the
 * air-to-air heat pump appears under no measure at all.
 */
export const TECHNICAL_SHEETS_BY_MEASURE_ID: ReadonlyMap<
  RenovationMeasureId,
  readonly TechnicalSheet[]
> = TECHNICAL_SHEETS.reduce((acc, sheet) => {
  for (const measureId of sheet.relatedMeasureIds) {
    acc.set(measureId, [...(acc.get(measureId) ?? []), sheet]);
  }
  return acc;
}, new Map<RenovationMeasureId, readonly TechnicalSheet[]>());
