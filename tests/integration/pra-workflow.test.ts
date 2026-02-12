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
        openApiSpec: "api-specs/latest/forecasting.json",
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
        openApiSpec: "api-specs/latest/forecasting.json",
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
        openApiSpec: "api-specs/latest/forecasting.json",
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

    // Validate response shape
    const shapeErrors = validateResponseShape(response.body, ["scenarios"]);

    if (shapeErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: { archetype: testArchetype, ecm_params: ECM_PARAMS },
          response: { status: response.status, body: response.body },
          validationErrors: shapeErrors,
        }),
      );
      expect(shapeErrors).toEqual([]);
    }

    const body = response.body as {
      scenarios: Array<{
        results: { hourly_building: Record<string, unknown[]> };
      }>;
    };

    // Validate scenarios array
    const arrayErrors = validateArray(body.scenarios, "scenarios", {
      minLength: 1,
    });

    if (arrayErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: { archetype: testArchetype, ecm_params: ECM_PARAMS },
          response: { status: response.status, body: response.body },
          validationErrors: arrayErrors,
        }),
      );
    }

    expect(arrayErrors).toEqual([]);

    // First scenario is renovated
    const renovatedScenario = body.scenarios[0];
    const hourlyColumnar = renovatedScenario.results.hourly_building;

    // Validate columnar format
    const columnarErrors: string[] = [];
    if (typeof hourlyColumnar !== "object" || hourlyColumnar === null) {
      columnarErrors.push(
        "hourly_building is not an object (columnar format expected)",
      );
    } else {
      const hasQHC = Array.isArray(hourlyColumnar.Q_HC);
      const hasQH = Array.isArray(hourlyColumnar.Q_H);
      const hasQC = Array.isArray(hourlyColumnar.Q_C);

      if (!hasQHC && !(hasQH && hasQC)) {
        columnarErrors.push("missing Q_HC or (Q_H + Q_C) columnar arrays");
      }

      if (hasQHC && (hourlyColumnar.Q_HC as unknown[]).length < 8000) {
        columnarErrors.push(
          `Q_HC array too short: ${(hourlyColumnar.Q_HC as unknown[]).length} < 8000`,
        );
      }
    }

    if (columnarErrors.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: { archetype: testArchetype, ecm_params: ECM_PARAMS },
          response: { status: response.status, body: response.body },
          validationErrors: columnarErrors,
        }),
      );
    }

    expect(columnarErrors).toEqual([]);

    // Calculate renovated HVAC total
    const qhcArray = hourlyColumnar.Q_HC as number[];
    renovatedHvacTotal =
      qhcArray.reduce((sum, val) => sum + Math.abs(val), 0) / 1000;

    energySavingsKwh = baselineHvacTotal - renovatedHvacTotal;

    // Renovated should be less than baseline
    expect(renovatedHvacTotal).toBeLessThan(baselineHvacTotal);
    expect(energySavingsKwh).toBeGreaterThan(0);

    console.log(`Renovated HVAC total: ${renovatedHvacTotal.toFixed(2)} kWh`);
    console.log(`Energy savings: ${energySavingsKwh.toFixed(2)} kWh`);
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
        openApiSpec: "api-specs/latest/financial.json",
      },
    );

    const response = await api.post("/financial/arv", ARV_REQUEST);

    const requestPayload = ARV_REQUEST;
    assertHttpStatus(response, 200, ctx, requestPayload);
    expect(response.status).toBe(200);

    // Validate response shape
    const shapeErrors = validateResponseShape(response.body, [
      "price_per_sqm",
      "total_price",
      "floor_area",
      "energy_class",
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
      price_per_sqm: number;
      total_price: number;
      floor_area: number;
      energy_class: string;
    };

    // Validate numeric ranges
    const numericErrors = [
      ...validateNumber(body.price_per_sqm, "price_per_sqm", { min: 0 }),
      ...validateNumber(body.total_price, "total_price", { min: 0 }),
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
    const expectedTotal = body.price_per_sqm * body.floor_area;
    const tolerance = expectedTotal * 0.01; // 1% tolerance
    const diff = Math.abs(body.total_price - expectedTotal);

    expect(diff).toBeLessThan(tolerance);

    console.log(
      `ARV: ${body.total_price.toFixed(2)} EUR (${body.price_per_sqm.toFixed(2)} EUR/m²)`,
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
        openApiSpec: "api-specs/latest/financial.json",
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

    // Validate response shape (same as HRA)
    const shapeErrors = validateResponseShape(response.body, [
      "point_forecasts",
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

    const body = response.body as {
      point_forecasts: Record<string, number>;
      metadata: Record<string, unknown>;
      probabilities?: Record<string, number>;
      percentiles?: Record<string, Record<string, number>>;
    };

    // Validate point_forecasts has required indicators
    const requiredIndicators = ["NPV", "IRR", "ROI", "PBP", "DPP"];
    const missingIndicators = requiredIndicators.filter(
      (indicator) => !(indicator in body.point_forecasts),
    );

    if (missingIndicators.length > 0) {
      console.error(
        formatStepFailure({
          ...ctx,
          request: requestBody,
          response: { status: response.status, body: response.body },
          validationErrors: [
            `Missing point_forecasts indicators: ${missingIndicators.join(", ")}`,
          ],
        }),
      );
    }

    expect(missingIndicators).toEqual([]);

    // PRA-specific: Validate probabilities field (professional output level)
    const professionalErrors: string[] = [];

    // Check for probabilities in dedicated field OR in metadata (per PortfolioAnalysisService)
    const hasProbabilitiesField =
      body.probabilities && Object.keys(body.probabilities).length > 0;
    const hasProbabilitiesInMetadata = Object.keys(body.metadata).some((key) =>
      key.startsWith("Pr("),
    );

    if (!hasProbabilitiesField && !hasProbabilitiesInMetadata) {
      professionalErrors.push(
        "No probabilities found (checked both response.probabilities field and metadata)",
      );
    } else {
      // Report where probabilities were found for debugging
      if (hasProbabilitiesField) {
        console.log(
          "Probabilities found in dedicated 'probabilities' field (per OpenAPI spec)",
        );
      }
      if (hasProbabilitiesInMetadata) {
        console.log(
          "Probabilities found in 'metadata' field (per PortfolioAnalysisService extraction logic)",
        );
      }
    }

    // Validate probabilities values
    if (hasProbabilitiesField) {
      const probabilityKeys = Object.keys(body.probabilities!);
      for (const key of probabilityKeys) {
        const value = body.probabilities![key];
        if (typeof value !== "number" || value < 0 || value > 1) {
          professionalErrors.push(
            `probabilities.${key} is not a number in [0, 1]: ${value}`,
          );
        }
      }
    }

    // Check for percentiles field
    if (!body.percentiles) {
      professionalErrors.push(
        "Missing 'percentiles' field (professional output level)",
      );
    } else {
      // Validate percentiles structure
      const percentileKeys = Object.keys(body.percentiles);
      if (percentileKeys.length === 0) {
        professionalErrors.push("percentiles object is empty");
      } else {
        // Check that at least one indicator has P10-P90
        const firstIndicator = percentileKeys[0];
        const percentileData = body.percentiles[firstIndicator];
        const expectedPercentiles = [
          "P10",
          "P20",
          "P30",
          "P40",
          "P50",
          "P60",
          "P70",
          "P80",
          "P90",
        ];
        const missingPercentiles = expectedPercentiles.filter(
          (p) => !(p in percentileData),
        );
        if (missingPercentiles.length > 0) {
          professionalErrors.push(
            `percentiles.${firstIndicator} missing keys: ${missingPercentiles.join(", ")}`,
          );
        }
      }
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
      `Risk assessment complete (professional): NPV=${body.point_forecasts.NPV.toFixed(2)}, IRR=${(body.point_forecasts.IRR * 100).toFixed(2)}%`,
    );

    // Report probability values if found
    if (body.probabilities) {
      const probKeys = Object.keys(body.probabilities).slice(0, 3);
      console.log(
        `Sample probabilities: ${probKeys.map((k) => `${k}=${(body.probabilities![k] * 100).toFixed(1)}%`).join(", ")}`,
      );
    }
  });
});
