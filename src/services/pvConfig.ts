export const PV_DEFAULTS = {
  tiltDeg: 30,
  azimuthDeg: 0,
  usePvgis: true,
  pvgisLossPercent: 14,
  annualYieldKwhPerKwp: 1400,
} as const;

/** Heuristic for an array covering a building's whole roof. */
const PV_SIZING = {
  usableRoofShare: 0.3,
  kwpPerRoofM2: 0.15,
  minKwp: 3,
  maxKwp: 100,
} as const;

export function pvKwpFromRoofArea(roofAreaM2: number | null): number | null {
  if (roofAreaM2 === null || !Number.isFinite(roofAreaM2) || roofAreaM2 <= 0) {
    return null;
  }

  const raw = roofAreaM2 * PV_SIZING.usableRoofShare * PV_SIZING.kwpPerRoofM2;
  return Math.min(Math.max(raw, PV_SIZING.minKwp), PV_SIZING.maxKwp);
}
