/**
 * Shared energy constants and helper functions.
 *
 * Used by both EnergyService (baseline estimation) and RenovationService
 * (post-renovation simulation) to ensure consistent EPC classification,
 * energy pricing, and non-HVAC multipliers.
 */

import type { HourlyBuildingRecord } from "../../../types/forecasting";

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
 * Sum annual HVAC energy from hourly building data.
 *
 * The Forecasting API returns hourly records in Wh. This function
 * aggregates Q_H (heating), Q_C (cooling), and Q_HC (total HVAC),
 * returning the totals in kWh.
 */
export function calculateAnnualTotals(
  hourlyData: HourlyBuildingRecord[],
): {
  Q_H_total: number;
  Q_C_total: number;
  Q_HC_total: number;
} {
  const WH_TO_KWH = 1000;

  const totalsInWh = hourlyData.reduce(
    (acc, record) => ({
      Q_H_total: acc.Q_H_total + (record.Q_H ?? 0),
      Q_C_total: acc.Q_C_total + (record.Q_C ?? 0),
      Q_HC_total: acc.Q_HC_total + (record.Q_HC ?? 0),
    }),
    { Q_H_total: 0, Q_C_total: 0, Q_HC_total: 0 },
  );

  return {
    Q_H_total: totalsInWh.Q_H_total / WH_TO_KWH,
    Q_C_total: totalsInWh.Q_C_total / WH_TO_KWH,
    Q_HC_total: totalsInWh.Q_HC_total / WH_TO_KWH,
  };
}
