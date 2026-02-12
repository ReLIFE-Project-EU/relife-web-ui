/**
 * Shared ECM scenario response validation helper.
 *
 * Validates the shape of the ECM application API response and computes the
 * renovated HVAC total from the first scenario's hourly_building data.
 *
 * Called by Step 4, Step 4b, and Step 4c in both HRA and PRA workflow tests.
 */

import { expect } from "vitest";

type HourlyColumnar = Record<string, unknown[]>;

/**
 * Validates the ECM response has the expected columnar structure and returns
 * the renovated HVAC total (kWh) and energy savings relative to baseline.
 */
export function validateECMScenarioResponse(
  body: unknown,
  baselineHvacTotal: number,
): { renovatedHvacTotal: number; energySavingsKwh: number } {
  const scenarios = (body as { scenarios: unknown[] }).scenarios;
  expect(Array.isArray(scenarios) && scenarios.length >= 1).toBe(true);

  const hourlyColumnar = (
    scenarios[0] as { results: { hourly_building: HourlyColumnar } }
  ).results.hourly_building;

  // Accept Q_HC (combined) or Q_H + Q_C (split) — both are valid API formats
  const hasQHC = Array.isArray(hourlyColumnar.Q_HC);
  const hasQHandQC =
    Array.isArray(hourlyColumnar.Q_H) && Array.isArray(hourlyColumnar.Q_C);

  expect(hasQHC || hasQHandQC).toBe(true);

  const referenceArray = hasQHC ? hourlyColumnar.Q_HC : hourlyColumnar.Q_H;
  expect((referenceArray as unknown[]).length).toBeGreaterThanOrEqual(8000);

  // Compute renovated HVAC total — prefer Q_HC; fall back to Q_H + Q_C
  let renovatedHvacTotal: number;
  if (hasQHC) {
    renovatedHvacTotal =
      (hourlyColumnar.Q_HC as number[]).reduce(
        (sum, val) => sum + Math.abs(val),
        0,
      ) / 1000;
  } else {
    renovatedHvacTotal =
      (hourlyColumnar.Q_H as number[]).reduce(
        (sum, val) => sum + Math.abs(val),
        0,
      ) /
        1000 +
      (hourlyColumnar.Q_C as number[]).reduce(
        (sum, val) => sum + Math.abs(val),
        0,
      ) /
        1000;
  }

  return {
    renovatedHvacTotal,
    energySavingsKwh: baselineHvacTotal - renovatedHvacTotal,
  };
}
