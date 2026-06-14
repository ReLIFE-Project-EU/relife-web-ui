export interface DeliveredEnergyCarrierBreakdown {
  naturalGasKwh: number;
  gridElectricityKwh: number;
}

/**
 * Which energy quantity backed an EPC rating.
 * - `primary`: UNI/TS 11300 primary energy (EU EPC standard, preferred).
 * - `delivered`: UNI/TS 11300 delivered energy (system-aware fallback).
 * - `thermal-demand`: ideal HVAC needs, ignores system efficiency (rough fallback).
 */
export type EpcEnergyBasis = "primary" | "delivered" | "thermal-demand";
