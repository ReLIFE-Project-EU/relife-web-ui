/**
 * PRA (Portfolio Renovation Advisor) Workflow Integration Test
 *
 * Tests the complete end-to-end workflow of the PRA tool by making direct
 * HTTP calls to the Docker Compose backend services. Uses the same endpoints
 * as HRA but validates the additional fields returned with "professional"
 * output level.
 *
 * Prerequisites:
 * - Docker services must be running: `task up`
 * - Services must be healthy and accessible at localhost:8080
 *
 * Steps:
 * 1. Health checks (all 3 services)
 * 2. List archetypes
 * 3. Simulate baseline energy
 * 4. ECM renovation simulation
 * 5. Calculate ARV
 * 6. Risk assessment (professional output level)
 */

import { describe, test, expect, beforeAll } from "vitest";
import * as api from "./helpers/api-client";
import {
  ARV_REQUEST,
  RISK_ASSESSMENT_BASE_PROFESSIONAL,
  ECM_PARAMS,
  ECM_PARAMS_FLOOR,
  ECM_PARAMS_ENVELOPE_HEAT_PUMP,
  WEATHER_SOURCE,
} from "./helpers/fixtures";
import {
  createStepContext,
  formatStepFailure,
  validateResponseShape,
  validateArray,
  validateNumber,
  assertHttpStatus,
} from "./helpers/context-reporter";
import { validateECMScenarioResponse } from "./helpers/ecm-validation";

describe.sequential("PRA Workflow", () => {
  // Shared state across steps
  let testArchetype: { category: string; country: string; name: string };
  let baselineHvacTotal: number;
  let renovatedHvacTotal: number;
  let energySavingsKwh: number;

  beforeAll(() => {
    api.clearRequestHistory();
  });

  test("Step 1: Health checks", async () => {
    const services = ["forecasting", "financial", "technical"];
    const results: Array<{ service: string; status: number }> = [];

    for (const service of services) {
      const response = await api.get(`/${service}/health`);
      results.push({ service, status: response.status });

      if (response.status !== 200) {
        const ctx = createStepContext(
          "PRA",
          1,
          "Health checks",
          `GET /${service}/health`,
          "HealthResponse",
          {},
        );
        console.error(
          formatStepFailure({
            ...ctx,
            request: null,
            response: { status: response.status, body: response.body },
            validationErrors: [
              `Service ${service} returned status ${response.status}`,
            ],
          }),
        );
      }

      const requestPayload = { service };
      const ctx = createStepContext(
        "PRA",
        1,
        "Health checks",
        `GET /${service}/health`,
        "HealthResponse",
        {},
      );
      assertHttpStatus(response, 200, ctx, requestPayload);
      expect(response.status).toBe(200);
    }
  });

  test("Step 2: List archetypes", async () => {
    const ctx = createStepContext(
      "PRA",
      2,
      "List archetypes",
      "GET /forecasting/building/available",
      "ArchetypeInfo[]",
      {
        typeDefinition: "src/types/forecasting.ts",
        apiWrapper: "src/api/forecasting.ts",
        serviceConsumer: "src/services/BuildingService.ts",
      },
    );

    const response = await api.get("/forecasting/building/available");

    const requestPayload = { endpoint: "/forecasting/building/available" };
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    // Validate response shape
    const errors = validateArray(response.body, "archetypes", {
      minLength: 1,
      itemValidator: (item) => {
        if (typeof item !== "object" || item === null) {
          return "item is not an object";
        }
        const obj = item as Record<string, unknown>;
        if (typeof obj.category !== "string") return "missing category";
        if (typeof obj.country !== "string") return "missing country";
        if (typeof obj.name !== "string") return "missing name";
        return null;
      },
    });

    if (errors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: null,
          response: { status: response.status, body: response.body },
          validationErrors: errors,
        }),
      );
    }

    expect(errors).toEqual([]);

    // Save first archetype for next steps
    const archetypes = response.body as Array<{
      category: string;
      country: string;
      name: string;
    }>;
    testArchetype = archetypes[0];

    console.log(
      `Using archetype: ${testArchetype.country} / ${testArchetype.category} / ${testArchetype.name}`,
    );
  });

  test("Step 3: Simulate baseline energy", async () => {
    const ctx = createStepContext(
      "PRA",
      3,
      "Simulate baseline energy",
      "POST /forecasting/simulate?archetype=true&...",
      "SimulateDirectResponse",
      {
        typeDefinition: "src/types/forecasting.ts",
        apiWrapper: "src/api/forecasting.ts",
        serviceConsumer: "src/services/EnergyService.ts",
      },
    );

    const searchParams = new URLSearchParams({
      archetype: "true",
      category: testArchetype.category,
      country: testArchetype.country,
      name: testArchetype.name,
      weather_source: WEATHER_SOURCE,
    });

    const formData = new FormData();
    const response = await api.postForm(
      `/forecasting/simulate?${searchParams.toString()}`,
      formData,
    );

    const requestPayload = {
      archetype: testArchetype,
      weather_source: WEATHER_SOURCE,
      endpoint: `/forecasting/simulate?${searchParams.toString()}`,
    };
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    // Validate response shape
    const shapeErrors = validateResponseShape(response.body, [
      "results",
      "results.hourly_building",
    ]);

    if (shapeErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: { archetype: testArchetype, weather_source: WEATHER_SOURCE },
          response: { status: response.status, body: response.body },
          validationErrors: shapeErrors,
        }),
      );
      expect(shapeErrors).toEqual([]);
    }

    const body = response.body as {
      results: { hourly_building: Array<Record<string, unknown>> };
    };

    // Validate hourly_building is array with reasonable length
    const arrayErrors = validateArray(
      body.results.hourly_building,
      "results.hourly_building",
      {
        minLength: 8000, // ~1 year hourly data
        itemValidator: (item) => {
          const record = item as Record<string, unknown>;
          const hasQH = typeof record.Q_H === "number";
          const hasQC = typeof record.Q_C === "number";
          const hasQHC = typeof record.Q_HC === "number";
          if (!hasQH && !hasQC && !hasQHC) {
            return "missing Q_H, Q_C, or Q_HC numeric fields";
          }
          return null;
        },
      },
    );

    if (arrayErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: { archetype: testArchetype, weather_source: WEATHER_SOURCE },
          response: { status: response.status, body: response.body },
          validationErrors: arrayErrors,
        }),
      );
    }

    expect(arrayErrors).toEqual([]);

    // Calculate baseline HVAC total (Wh to kWh)
    baselineHvacTotal =
      body.results.hourly_building.reduce((sum, record) => {
        const qhc = (record.Q_HC as number) || 0;
        return sum + Math.abs(qhc);
      }, 0) / 1000; // Wh to kWh

    expect(baselineHvacTotal).toBeGreaterThan(0);

    console.log(`Baseline HVAC total: ${baselineHvacTotal.toFixed(2)} kWh`);
  });

  test("Step 4: ECM renovation simulation", async () => {
    const ctx = createStepContext(
      "PRA",
      4,
      "ECM renovation simulation",
      "POST /forecasting/ecm_application?archetype=true&...",
      "ECMApplicationResponse",
      {
        typeDefinition: "src/types/forecasting.ts",
        apiWrapper: "src/api/forecasting.ts",
        serviceConsumer: "src/services/RenovationService.ts",
      },
    );

    const searchParams = new URLSearchParams({
      archetype: "true",
      category: testArchetype.category,
      country: testArchetype.country,
      name: testArchetype.name,
      weather_source: WEATHER_SOURCE,
      scenario_elements: ECM_PARAMS.scenario_elements,
      u_wall: ECM_PARAMS.u_wall.toString(),
    });

    const formData = new FormData();
    const response = await api.postForm(
      `/forecasting/ecm_application?${searchParams.toString()}`,
      formData,
    );

    const requestPayload = {
      archetype: testArchetype,
      ecm_params: ECM_PARAMS,
      endpoint: `/forecasting/ecm_application?${searchParams.toString()}`,
    };
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    const result = validateECMScenarioResponse(
      response.body,
      baselineHvacTotal,
    );

    renovatedHvacTotal = result.renovatedHvacTotal;
    energySavingsKwh = result.energySavingsKwh;

    // Renovated should be less than baseline
    expect(renovatedHvacTotal).toBeLessThan(baselineHvacTotal);
    expect(energySavingsKwh).toBeGreaterThan(0);

    console.log(`Renovated HVAC total: ${renovatedHvacTotal.toFixed(2)} kWh`);
    console.log(`Energy savings: ${energySavingsKwh.toFixed(2)} kWh`);
  });

  test("Step 4b: ECM with floor insulation", async () => {
    const ctx = createStepContext(
      "PRA",
      4,
      "ECM with floor insulation",
      "POST /forecasting/ecm_application?archetype=true&...",
      "ECMApplicationResponse",
      {
        typeDefinition: "src/types/forecasting.ts",
        apiWrapper: "src/api/forecasting.ts",
        serviceConsumer: "src/services/RenovationService.ts",
      },
    );

    const searchParams = new URLSearchParams({
      archetype: "true",
      category: testArchetype.category,
      country: testArchetype.country,
      name: testArchetype.name,
      weather_source: WEATHER_SOURCE,
      scenario_elements: ECM_PARAMS_FLOOR.scenario_elements,
      u_slab: ECM_PARAMS_FLOOR.u_slab.toString(),
    });

    const formData = new FormData();
    const response = await api.postForm(
      `/forecasting/ecm_application?${searchParams.toString()}`,
      formData,
    );

    const requestPayload = {
      archetype: testArchetype,
      ecm_params: ECM_PARAMS_FLOOR,
      endpoint: `/forecasting/ecm_application?${searchParams.toString()}`,
    };
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    const {
      renovatedHvacTotal: floorRenovated,
      energySavingsKwh: floorSavings,
    } = validateECMScenarioResponse(response.body, baselineHvacTotal);

    // Floor-only insulation may slightly increase or decrease Q_HC depending on
    // archetype and climate (e.g. ground-cooling effect in Mediterranean climates).
    // Assert only that the simulation produced a valid positive result.
    expect(floorRenovated).toBeGreaterThan(0);

    console.log(
      `Floor insulation renovated HVAC total: ${floorRenovated.toFixed(2)} kWh`,
    );
    console.log(
      `Floor insulation delta vs baseline: ${floorSavings >= 0 ? "-" : "+"}${Math.abs(floorSavings).toFixed(2)} kWh`,
    );
  });

  test("Step 4c: ECM with envelope + heat pump", async () => {
    const ctx = createStepContext(
      "PRA",
      4,
      "ECM with envelope + heat pump",
      "POST /forecasting/ecm_application?archetype=true&...",
      "ECMApplicationResponse",
      {
        typeDefinition: "src/types/forecasting.ts",
        apiWrapper: "src/api/forecasting.ts",
        serviceConsumer: "src/services/RenovationService.ts",
      },
    );

    const searchParams = new URLSearchParams({
      archetype: "true",
      category: testArchetype.category,
      country: testArchetype.country,
      name: testArchetype.name,
      weather_source: WEATHER_SOURCE,
      scenario_elements: ECM_PARAMS_ENVELOPE_HEAT_PUMP.scenario_elements,
      u_wall: ECM_PARAMS_ENVELOPE_HEAT_PUMP.u_wall.toString(),
      u_slab: ECM_PARAMS_ENVELOPE_HEAT_PUMP.u_slab.toString(),
      use_heat_pump: ECM_PARAMS_ENVELOPE_HEAT_PUMP.use_heat_pump,
      heat_pump_cop: ECM_PARAMS_ENVELOPE_HEAT_PUMP.heat_pump_cop,
    });

    const formData = new FormData();
    const response = await api.postForm(
      `/forecasting/ecm_application?${searchParams.toString()}`,
      formData,
    );

    const requestPayload = {
      archetype: testArchetype,
      ecm_params: ECM_PARAMS_ENVELOPE_HEAT_PUMP,
      endpoint: `/forecasting/ecm_application?${searchParams.toString()}`,
    };
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    const { renovatedHvacTotal: ehpRenovated, energySavingsKwh: ehpSavings } =
      validateECMScenarioResponse(response.body, baselineHvacTotal);

    expect(ehpRenovated).toBeLessThan(baselineHvacTotal);
    expect(ehpSavings).toBeGreaterThan(0);

    console.log(
      `Envelope+heat-pump renovated HVAC total: ${ehpRenovated.toFixed(2)} kWh`,
    );
    console.log(
      `Envelope+heat-pump energy savings: ${ehpSavings.toFixed(2)} kWh`,
    );
  });

  test("Step 5: Calculate ARV", async () => {
    const ctx = createStepContext(
      "PRA",
      5,
      "Calculate ARV",
      "POST /financial/arv",
      "ARVResponse",
      {
        typeDefinition: "src/types/financial.ts",
        apiWrapper: "src/api/financial.ts",
        serviceConsumer: "src/services/FinancialService.ts",
      },
    );

    const response = await api.post("/financial/arv", ARV_REQUEST);

    const requestPayload = ARV_REQUEST;
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    // Validate response shape
    const shapeErrors = validateResponseShape(response.body, [
      "after",
      "floor_area",
    ]);

    if (shapeErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: ARV_REQUEST,
          response: { status: response.status, body: response.body },
          validationErrors: shapeErrors,
        }),
      );
      expect(shapeErrors).toEqual([]);
    }

    const body = response.body as {
      after: {
        price_per_sqm: number;
        total_price: number;
        greek_epc_class: string;
      };
      floor_area: number;
    };

    // Validate numeric ranges
    const numericErrors = [
      ...validateNumber(body.after.price_per_sqm, "after.price_per_sqm", {
        min: 0,
      }),
      ...validateNumber(body.after.total_price, "after.total_price", {
        min: 0,
      }),
      ...validateNumber(body.floor_area, "floor_area", { min: 0 }),
    ];

    if (numericErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: ARV_REQUEST,
          response: { status: response.status, body: response.body },
          validationErrors: numericErrors,
        }),
      );
    }

    expect(numericErrors).toEqual([]);

    // Validate calculation: total_price ≈ price_per_sqm * floor_area
    const expectedTotal = body.after.price_per_sqm * body.floor_area;
    const tolerance = expectedTotal * 0.01; // 1% tolerance
    const diff = Math.abs(body.after.total_price - expectedTotal);

    expect(diff).toBeLessThan(tolerance);

    console.log(
      `ARV: ${body.after.total_price.toFixed(2)} EUR (${body.after.price_per_sqm.toFixed(2)} EUR/m²)`,
    );
  });

  test("Step 6: Risk assessment (professional)", async () => {
    const ctx = createStepContext(
      "PRA",
      6,
      "Risk assessment (professional)",
      "POST /financial/risk-assessment",
      "RiskAssessmentResponse",
      {
        typeDefinition: "src/types/financial.ts",
        apiWrapper: "src/api/financial.ts",
        serviceConsumer: "src/services/FinancialService.ts",
      },
    );

    const requestBody = {
      ...RISK_ASSESSMENT_BASE_PROFESSIONAL,
      annual_energy_savings: energySavingsKwh,
    };

    const response = await api.post("/financial/risk-assessment", requestBody);

    const requestPayload = requestBody;
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    // New multi-scheme response shape: results keyed by scheme_type + metadata.
    const shapeErrors = validateResponseShape(response.body, [
      "results",
      "metadata",
    ]);

    if (shapeErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: requestBody,
          response: { status: response.status, body: response.body },
          validationErrors: shapeErrors,
        }),
      );
      expect(shapeErrors).toEqual([]);
    }

    type SchemeResult = {
      summary: {
        percentiles: Record<string, Record<string, number>>;
        probabilities: Record<string, number>;
      };
      kpi_histograms?: Record<string, unknown>;
    };
    const body = response.body as {
      results: Record<string, SchemeResult>;
      metadata: Record<string, unknown>;
    };

    const professionalErrors: string[] = [];

    // We requested a single equity scheme; it must be present.
    const scheme = body.results.equity;
    if (!scheme) {
      professionalErrors.push(
        `Missing equity scheme in results (got: ${Object.keys(body.results).join(", ")})`,
      );
    }

    const percentiles = scheme?.summary.percentiles ?? {};
    const requiredIndicators = ["NPV", "IRR", "ROI", "PBP", "DPP"];
    const missingIndicators = requiredIndicators.filter(
      (indicator) => !(indicator in percentiles),
    );
    if (missingIndicators.length > 0) {
      professionalErrors.push(
        `Missing summary.percentiles indicators: ${missingIndicators.join(", ")}`,
      );
    }

    // Each indicator must expose at least P10/P50/P90.
    const npvPercentiles = percentiles.NPV ?? {};
    const missingNpvBands = ["P10", "P50", "P90"].filter(
      (p) => !(p in npvPercentiles),
    );
    if (missingNpvBands.length > 0) {
      professionalErrors.push(
        `summary.percentiles.NPV missing bands: ${missingNpvBands.join(", ")}`,
      );
    }

    // Professional output: probabilities present, with values in [0, 1].
    const probabilities = scheme?.summary.probabilities ?? {};
    if (Object.keys(probabilities).length === 0) {
      professionalErrors.push("summary.probabilities is empty");
    }
    for (const [key, value] of Object.entries(probabilities)) {
      if (typeof value !== "number" || value < 0 || value > 1) {
        professionalErrors.push(
          `probabilities.${key} is not a number in [0, 1]: ${value}`,
        );
      }
    }

    // Professional output adds KPI histograms.
    if (!scheme?.kpi_histograms) {
      professionalErrors.push(
        "Missing 'kpi_histograms' (professional output level)",
      );
    }

    if (professionalErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: requestBody,
          response: { status: response.status, body: response.body },
          validationErrors: professionalErrors,
        }),
      );
    }

    expect(professionalErrors).toEqual([]);

    console.log(
      `Risk assessment complete (professional): NPV(P50)=${npvPercentiles.P50?.toFixed(2)}, IRR(P50)=${((percentiles.IRR?.P50 ?? 0) * 100).toFixed(2)}%`,
    );
  });
});
