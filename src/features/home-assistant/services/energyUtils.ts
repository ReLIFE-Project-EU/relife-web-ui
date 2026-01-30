/**
 * Shared energy constants and helper functions.
 *
 * Used by both EnergyService (baseline estimation) and RenovationService
 * (post-renovation simulation) to ensure consistent EPC classification,
 * energy pricing, and non-HVAC multipliers.
 */

import type {
  HourlyBuildingRecord,
  HourlyBuildingColumnar,
} from "../../../types/forecasting";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EPC class thresholds based on energy intensity (kWh/m²/year).
 * Aligned with European energy performance standards.
 */
export const EPC_THRESHOLDS: { class: string; maxValue: number }[] = [
  { class: "A+", maxValue: 30 },
  { class: "A", maxValue: 50 },
  { class: "B", maxValue: 90 },
  { class: "C", maxValue: 150 },
  { class: "D", maxValue: 230 },
  { class: "E", maxValue: 330 },
  { class: "F", maxValue: 450 },
  { class: "G", maxValue: Infinity },
];

/**
 * Average energy price in EUR/kWh for cost calculations.
 */
export const ENERGY_PRICE_EUR_PER_KWH = 0.25;

/**
 * Multiplier for total energy needs to account for hot water, lighting, etc.
 */
export const NON_HVAC_ENERGY_MULTIPLIER = 1.2;

/**
 * Default floor area if not provided (m²).
 */
export const DEFAULT_FLOOR_AREA = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine EPC class from energy intensity (kWh/m²/year).
 */
export function getEPCClass(energyIntensity: number): string {
  for (const threshold of EPC_THRESHOLDS) {
    if (energyIntensity <= threshold.maxValue) {
      return threshold.class;
    }
  }
  return "G";
}

/**
 * Transform hourly building data from columnar format to row format.
 *
 * The ECM API returns data in columnar format (object with arrays):
 *   { Q_H: [1,2,3], Q_C: [4,5,6], Q_HC: [5,7,9] }
 *
 * This function transforms it to row format (array of objects):
 *   [ {Q_H:1, Q_C:4, Q_HC:5}, {Q_H:2, Q_C:5, Q_HC:7}, ... ]
 *
 * Used by RenovationService to process ECM simulation results.
 */
export function transformColumnarToRowFormat(
  columnarData: HourlyBuildingColumnar,
): HourlyBuildingRecord[] {
  // Find the length of arrays (should be 8760 for a full year)
  const keys = Object.keys(columnarData);
  if (keys.length === 0) {
    return [];
  }

  // Get array length from first key
  const firstArray = columnarData[keys[0]];
  if (!Array.isArray(firstArray)) {
    throw new Error(
      `Invalid columnar data: ${keys[0]} is not an array. Type: ${typeof firstArray}`,
    );
  }

  const numHours = firstArray.length;

  // Transform each hour into a record
  const records: HourlyBuildingRecord[] = [];
  for (let i = 0; i < numHours; i++) {
    const record: HourlyBuildingRecord = {
      timestamp: "", // ECM responses don't include timestamps
    };

    // Extract value at index i from each array
    for (const key of keys) {
      const array = columnarData[key];
      if (Array.isArray(array) && i < array.length) {
        record[key] = array[i];
      }
    }

    records.push(record);
  }

  return records;
}

/**
 * Sum annual HVAC energy from hourly building data.
 *
 * The Forecasting API returns hourly records in Wh with different sign conventions
 * depending on the endpoint:
 *
 * - `/simulate` endpoint (row format): May include Q_H, Q_C, Q_HC as separate positive values
 * - `/ecm_application` endpoint (columnar format): Uses Q_HC with sign convention:
 *   - Positive Q_HC = heating demand
 *   - Negative Q_HC = cooling demand
 *
 * This function handles both cases by checking if Q_H/Q_C are available.
 * If not, it extracts heating/cooling from Q_HC using the sign convention.
 */
export function calculateAnnualTotals(hourlyData: HourlyBuildingRecord[]): {
  Q_H_total: number;
  Q_C_total: number;
  Q_HC_total: number;
} {
  const WH_TO_KWH = 1000;

  const totalsInWh = hourlyData.reduce(
    (acc, record) => {
      // Check if Q_H and Q_C are provided separately
      const hasQH = record.Q_H !== undefined && record.Q_H !== null;
      const hasQC = record.Q_C !== undefined && record.Q_C !== null;

      let heating = 0;
      let cooling = 0;

      if (hasQH && hasQC) {
        // Case 1: Separate Q_H and Q_C fields (e.g., /simulate endpoint)
        heating = record.Q_H ?? 0;
        cooling = record.Q_C ?? 0;
      } else {
        // Case 2: Q_HC with sign convention (e.g., /ecm_application endpoint)
        // - Positive Q_HC = heating demand
        // - Negative Q_HC = cooling demand
        const qHC = record.Q_HC ?? 0;
        if (qHC > 0) {
          heating = qHC;
        } else if (qHC < 0) {
          cooling = Math.abs(qHC);
        }
      }

      return {
        Q_H_total: acc.Q_H_total + heating,
        Q_C_total: acc.Q_C_total + cooling,
        Q_HC_total: acc.Q_HC_total + heating + cooling,
      };
    },
    { Q_H_total: 0, Q_C_total: 0, Q_HC_total: 0 },
  );

  return {
    Q_H_total: totalsInWh.Q_H_total / WH_TO_KWH,
    Q_C_total: totalsInWh.Q_C_total / WH_TO_KWH,
    Q_HC_total: totalsInWh.Q_HC_total / WH_TO_KWH,
  };
}
