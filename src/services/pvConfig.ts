export const PV_DEFAULTS = {
  tiltDeg: 30,
  azimuthDeg: 0,
  usePvgis: true,
  pvgisLossPercent: 14,
  annualYieldKwhPerKwp: 1400,
} as const;

/**
 * Heuristic: 30% usable roof area times 0.15 kWp/m² panel density
 * gives roughly 0.045 kWp per m² of floor area.
 */
export function pvKwpFromFloorArea(floorAreaM2: number | null): number | null {
  if (
    floorAreaM2 === null ||
    !Number.isFinite(floorAreaM2) ||
    floorAreaM2 <= 0
  ) {
    return null;
  }

  const raw = floorAreaM2 * 0.045;
  return Math.min(Math.max(raw, 3), 100);
}
