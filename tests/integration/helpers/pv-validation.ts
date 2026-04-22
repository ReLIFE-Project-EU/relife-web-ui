/**
 * PV ECM response validation helper.
 *
 * Actual response shape (verified against the running service):
 *   scenarios[n].results.pv_hp = {
 *     summary: {
 *       inputs: { pv_kwp, ... },
 *       annual_kwh: { pv_generation, self_consumption, grid_import, grid_export, hp_electric },
 *       indicators: { self_consumption_rate, self_sufficiency_rate },
 *     },
 *     hourly_results: [...],
 *   }
 *
 * The top-level `summary` field is null for ECM responses; PV data is
 * nested per-scenario inside `results.pv_hp`.
 */

import { expect } from "vitest";

interface PvHpSummary {
  inputs?: { pv_kwp?: number };
  annual_kwh?: {
    pv_generation?: number;
    self_consumption?: number;
    grid_import?: number;
    grid_export?: number;
    hp_electric?: number;
  };
  indicators?: {
    self_consumption_rate?: number;
    self_sufficiency_rate?: number;
  };
}

interface PvHpResult {
  summary?: PvHpSummary | null;
  hourly_results?: unknown[];
}

interface EcmResponseBody {
  pv_requested?: {
    enabled?: boolean;
    pv_kwp?: number;
  };
  scenarios?: Array<{
    results?: {
      pv_hp?: PvHpResult;
    };
  }>;
}

/**
 * Validates that the ECM response contains valid PV data.
 */
export function validatePVResponse(body: unknown, expectedKwp?: number): void {
  const responseBody = body as EcmResponseBody;

  expect(responseBody.pv_requested).toBeDefined();
  expect(responseBody.pv_requested?.enabled).toBe(true);

  if (expectedKwp !== undefined) {
    expect(responseBody.pv_requested?.pv_kwp).toBeCloseTo(expectedKwp, 1);
  } else {
    expect(typeof responseBody.pv_requested?.pv_kwp).toBe("number");
    expect(responseBody.pv_requested?.pv_kwp).toBeGreaterThan(0);
  }

  expect(Array.isArray(responseBody.scenarios)).toBe(true);
  expect(responseBody.scenarios!.length).toBeGreaterThan(0);

  const hasPvResults = responseBody.scenarios!.some(
    (scenario) =>
      scenario.results?.pv_hp != null &&
      typeof scenario.results.pv_hp === "object" &&
      scenario.results.pv_hp.summary != null,
  );
  expect(hasPvResults).toBe(true);
}

/**
 * Validates that PV summary data is present and has reasonable shape.
 *
 * PV summary is nested per-scenario in results.pv_hp.summary — not at the
 * top-level summary field (which is null for ECM responses).
 */
export function validatePVSummary(body: unknown): void {
  const responseBody = body as EcmResponseBody;

  const pvScenario = responseBody.scenarios?.find(
    (s) => s.results?.pv_hp?.summary != null,
  );
  expect(pvScenario).toBeDefined();

  const annualKwh = pvScenario!.results!.pv_hp!.summary!.annual_kwh;
  expect(
    typeof annualKwh?.pv_generation === "number" ||
      typeof annualKwh?.self_consumption === "number",
  ).toBe(true);
}
