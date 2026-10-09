import type { RenovationAction } from "../../types/financial";
import type { RenovationMeasureId } from "../../types/renovation";

export const CALIBRATION_COUNTRIES = ["Austria", "Italy", "Greece"] as const;
export type CalibrationCountry = (typeof CALIBRATION_COUNTRIES)[number];

export interface CostProbe {
  measureId: RenovationMeasureId;
  action: RenovationAction;
}

// Explicit quantities bypass the UI's building-dependent capacity heuristics.
export const COST_PROBES: readonly CostProbe[] = [
  {
    measureId: "wall-insulation",
    action: { action: "Wall insulation", area_m2: 100 },
  },
  {
    measureId: "roof-insulation",
    action: { action: "Roof insulation - Accessible", area_m2: 100 },
  },
  {
    measureId: "floor-insulation",
    action: { action: "Floor insulation", area_m2: 100 },
  },
  { measureId: "windows", action: { action: "Windows", area_m2: 20 } },
  {
    measureId: "air-water-heat-pump",
    action: { action: "Air-water Heat Pump", capacity_kw: 8 },
  },
  {
    measureId: "condensing-boiler",
    action: { action: "Condensing boiler", capacity_kw: 8 },
  },
  { measureId: "pv", action: { action: "PV", capacity_kw: 3 } },
];

export const BUILDING_CASES = CALIBRATION_COUNTRIES.flatMap((country, index) =>
  ["1946-1969", "2011-now"].map((period) => ({
    country,
    period,
    category: "Single Family House",
    name: `${["AT", "IT", "GR"][index]}_SFH_${period}`,
  })),
);

export function costCaseId(
  country: CalibrationCountry,
  probe: CostProbe,
): string {
  return `${country}:${probe.measureId}`;
}
