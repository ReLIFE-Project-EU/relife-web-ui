/**
 * Forecasting Service PV ECM Integration Tests
 *
 * Direct API tests that verify the forecasting service's PV ECM contract.
 * These tests call the backend endpoint directly and do not exercise UI code.
 *
 * Note: /ecm_application uses FastAPI Query() for all params, so everything
 * must be sent as URL query parameters, not as a JSON body.
 */

import { describe, expect, test } from "vitest";
import { postQuery } from "./helpers/api-client";
import {
  FALLBACK_ARCHETYPE,
  WEATHER_SOURCE,
  PV_ECM_PARAMS,
  PV_ENVELOPE_ECM_PARAMS,
} from "./helpers/fixtures";
import { validatePVResponse, validatePVSummary } from "./helpers/pv-validation";

const ARCHETYPE_QUERY = {
  archetype: "true",
  category: FALLBACK_ARCHETYPE.category,
  country: FALLBACK_ARCHETYPE.country,
  name: FALLBACK_ARCHETYPE.name,
  weather_source: WEATHER_SOURCE,
};

describe("Forecasting PV ECM API", () => {
  test("PV-only ECM (no envelope measures)", async () => {
    const response = await postQuery("/forecasting/ecm_application", {
      ...ARCHETYPE_QUERY,
      ...PV_ECM_PARAMS,
    });

    expect(response.status).toBe(200);
    validatePVResponse(response.body, 10.0);
    validatePVSummary(response.body);
  });

  test("Envelope + PV ECM (wall insulation + PV)", async () => {
    const response = await postQuery("/forecasting/ecm_application", {
      ...ARCHETYPE_QUERY,
      ...PV_ENVELOPE_ECM_PARAMS,
    });

    expect(response.status).toBe(200);
    validatePVResponse(response.body, 10.0);
    validatePVSummary(response.body);

    const scenarios = (response.body as { scenarios: unknown[] }).scenarios;
    expect(Array.isArray(scenarios) && scenarios.length >= 1).toBe(true);
  });

  test("Invalid PV request (use_pv=true without pv_kwp)", async () => {
    const response = await postQuery("/forecasting/ecm_application", {
      ...ARCHETYPE_QUERY,
      use_pv: "true",
    });

    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
  });
});
