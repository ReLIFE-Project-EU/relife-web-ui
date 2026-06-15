/**
 * ⚠️ TEMPORARY STOPGAP — heating-system capacity sizing.
 *
 * The Financial CAPEX/OPEX lookup (`POST /risk-assessment`) requires a
 * `capacity_kw` for heat-pump / boiler actions, but the frontend never learns
 * that figure: the forecasting service auto-sizes HVAC internally and returns
 * only annual heating demand, not a peak-kW rating. Until the backend exposes
 * the sized capacity, we approximate it here with a crude floor-area heuristic.
 *
 * This module is intentionally isolated and free of feature imports so it can be
 * deleted wholesale once a real sized capacity becomes available. It parallels
 * `pvKwpFromFloorArea` in `pvConfig.ts`.
 */

/**
 * Rough residential design heating power per m² of floor area (kW/m²). A
 * mid-range value for European dwellings spanning older and renovated stock.
 */
const HEATING_KW_PER_M2 = 0.05;

/** Clamp bounds (kW) keeping the estimate within plausible residential sizing. */
const MIN_HEATING_KW = 3;
const MAX_HEATING_KW = 50;

/**
 * Estimate a heating-system capacity (kW) from usable floor area. Used for both
 * air-water heat pumps and condensing boilers, which the lookup prices per kW.
 * Returns null for invalid input so callers can skip the action.
 */
export function heatingCapacityKwFromFloorArea(
  floorAreaM2: number | null,
): number | null {
  if (
    floorAreaM2 === null ||
    !Number.isFinite(floorAreaM2) ||
    floorAreaM2 <= 0
  ) {
    return null;
  }

  const raw = floorAreaM2 * HEATING_KW_PER_M2;
  return Math.min(Math.max(raw, MIN_HEATING_KW), MAX_HEATING_KW);
}
