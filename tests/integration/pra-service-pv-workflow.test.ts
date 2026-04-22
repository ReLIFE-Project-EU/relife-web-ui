/**
 * PRA Service-Orchestrator PV Integration Test
 *
 * Exercises the PRA production service path with PV ECM packages and per-building overrides.
 * Uses the src/api/client mock/redirect pattern to record HTTP exchanges.
 */

import { beforeAll, describe, expect, test, vi } from "vitest";
import { BuildingService } from "../../src/services/BuildingService";
import { EnergyService } from "../../src/services/EnergyService";
import { RenovationService } from "../../src/services/RenovationService";
import { FinancialService } from "../../src/services/FinancialService";
import { PortfolioAnalysisService } from "../../src/features/portfolio-advisor/services/PortfolioAnalysisService";
import type { PRABuilding } from "../../src/features/portfolio-advisor/context/types";
import type {
  RenovationMeasureId,
  FundingOptions,
} from "../../src/types/renovation";
import {
  lastRequest,
  requestsTo,
  type HttpExchange,
} from "./helpers/api-client-mock";

// ---------------------------------------------------------------------------
// Mock API Client Setup
//
// vi.mock() is hoisted before static imports are initialized, so:
//   - httpHistory must be declared with vi.hoisted() to be available in the factory
//   - setupApiClientMock must be imported dynamically inside the factory
// ---------------------------------------------------------------------------

const httpHistory = vi.hoisted<HttpExchange[]>(() => []);

vi.mock("../../src/api/client", async (importOriginal) => {
  const { setupApiClientMock } = await import("./helpers/api-client-mock");
  return setupApiClientMock(httpHistory, importOriginal);
});

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const BUILDING_A: PRABuilding = {
  id: "pra-building-a",
  name: "Building A (Athens)",
  source: "manual",
  category: "Multi family House",
  country: "GR",
  lat: 37.981,
  lng: 23.728,
  floorArea: 85,
  constructionPeriod: "1971-1990",
  numberOfFloors: 5,
  propertyType: "apartment",
  floorNumber: 2,
  validationStatus: "valid",
};

const BUILDING_B: PRABuilding = {
  id: "pra-building-b",
  name: "Building B (Thessaloniki)",
  source: "manual",
  category: "Multi family House",
  country: "GR",
  lat: 40.64,
  lng: 22.94,
  floorArea: 100,
  constructionPeriod: "1971-1990",
  numberOfFloors: 4,
  propertyType: "apartment",
  floorNumber: 3,
  validationStatus: "valid",
};

const FUNDING: FundingOptions = {
  financingType: "self-funded",
  loan: { percentage: 0, duration: 0, interestRate: 0 },
  incentives: {
    upfrontPercentage: 0,
    lifetimeAmount: 0,
    lifetimeYears: 0,
  },
};

const PROJECT_LIFETIME = 20;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.sequential("PRA Service PV Workflow", () => {
  const buildingService = new BuildingService();
  const energyService = new EnergyService(buildingService);
  const renovationService = new RenovationService();
  const financialService = new FinancialService("professional");
  const portfolioAnalysisService = new PortfolioAnalysisService(
    energyService,
    renovationService,
    financialService,
  );

  beforeAll(() => {
    httpHistory.length = 0;
  });

  test("Global PV mixed package (wall-insulation + pv)", async () => {
    const selectedMeasures: RenovationMeasureId[] = ["wall-insulation", "pv"];

    const results = await portfolioAnalysisService.analyzePortfolio({
      buildings: [BUILDING_A],
      selectedMeasures,
      financingScheme: "equity",
      funding: FUNDING,
      projectLifetime: PROJECT_LIFETIME,
      onProgress: () => {},
      globalCapex: 10000,
      globalMaintenanceCost: 200,
    });

    expect(results[BUILDING_A.id]).toBeDefined();
    expect(
      results[BUILDING_A.id].status,
      `Analysis failed: ${(results[BUILDING_A.id] as { error?: string }).error}`,
    ).toBe("success");

    const buildingResult = results[BUILDING_A.id];
    if (buildingResult.status !== "success") {
      throw new Error("Expected successful analysis");
    }

    if (!buildingResult.scenarios) {
      throw new Error("Expected scenarios in successful analysis");
    }
    const renovatedScenarios = buildingResult.scenarios.filter(
      (s) => s.id !== "current",
    );
    expect(renovatedScenarios.length).toBeGreaterThan(0);
    const renovatedScenario = renovatedScenarios[0];
    expect(renovatedScenario.measureIds).toContain("wall-insulation");
    expect(renovatedScenario.measureIds).toContain("pv");

    const forecastingRequests = requestsTo(
      httpHistory,
      "/forecasting/ecm_application",
    );
    expect(forecastingRequests.length).toBeGreaterThan(0);

    const lastUrl = new URL(
      forecastingRequests[forecastingRequests.length - 1].request.url,
    );

    expect(lastUrl.searchParams.get("scenario_elements")).toBe("wall");
    expect(lastUrl.searchParams.get("use_pv")).toBe("true");
    expect(lastUrl.searchParams.has("pv_kwp")).toBe(true);
    expect(Number(lastUrl.searchParams.get("pv_kwp"))).toBeGreaterThan(0);
  });

  test("Per-building override with system + PV (air-water-heat-pump + pv)", async () => {
    const globalMeasures: RenovationMeasureId[] = ["wall-insulation"];

    const buildingBWithOverride: PRABuilding = {
      ...BUILDING_B,
      selectedMeasures: ["air-water-heat-pump", "pv"],
    };

    const results = await portfolioAnalysisService.analyzePortfolio({
      buildings: [BUILDING_A, buildingBWithOverride],
      selectedMeasures: globalMeasures,
      financingScheme: "equity",
      funding: FUNDING,
      projectLifetime: PROJECT_LIFETIME,
      onProgress: () => {},
      globalCapex: 10000,
      globalMaintenanceCost: 200,
    });

    expect(results[BUILDING_A.id]).toBeDefined();
    expect(results[buildingBWithOverride.id]).toBeDefined();

    const buildingAResult = results[BUILDING_A.id];
    const buildingBResult = results[buildingBWithOverride.id];

    if (
      buildingAResult.status !== "success" ||
      buildingBResult.status !== "success"
    ) {
      throw new Error("Expected successful analysis for both buildings");
    }

    if (!buildingAResult.scenarios || !buildingBResult.scenarios) {
      throw new Error("Expected scenarios in successful analysis");
    }
    const renovatedA = buildingAResult.scenarios.filter(
      (s) => s.id !== "current",
    );
    const renovatedB = buildingBResult.scenarios.filter(
      (s) => s.id !== "current",
    );

    expect(renovatedA[0].measureIds).toContain("wall-insulation");
    expect(renovatedA[0].measureIds).not.toContain("air-water-heat-pump");

    expect(renovatedB[0].measureIds).toContain("air-water-heat-pump");
    expect(renovatedB[0].measureIds).toContain("pv");
    expect(renovatedB[0].measureIds).not.toContain("wall-insulation");

    // Building B uses heat pump — filter by use_heat_pump=true in the URL
    // (lat/lng are not query params of the ECM endpoint; use_heat_pump is unique to building B)
    const buildingBRequests = requestsTo(
      httpHistory,
      "/forecasting/ecm_application",
    ).filter(
      (exchange) =>
        new URL(exchange.request.url).searchParams.get("use_heat_pump") ===
        "true",
    );
    expect(buildingBRequests.length).toBeGreaterThan(0);

    const buildingBUrl = new URL(
      buildingBRequests[buildingBRequests.length - 1].request.url,
    );

    expect(buildingBUrl.searchParams.get("use_pv")).toBe("true");
    expect(buildingBUrl.searchParams.get("use_heat_pump")).toBe("true");
    expect(Number(buildingBUrl.searchParams.get("heat_pump_cop"))).toBe(3.2);
    expect(buildingBUrl.searchParams.get("scenario_elements")).toBeNull();
  });

  test("Professional financial result mapping", async () => {
    const selectedMeasures: RenovationMeasureId[] = ["pv"];

    const results = await portfolioAnalysisService.analyzePortfolio({
      buildings: [BUILDING_A],
      selectedMeasures,
      financingScheme: "equity",
      funding: FUNDING,
      projectLifetime: PROJECT_LIFETIME,
      onProgress: () => {},
      globalCapex: 10000,
      globalMaintenanceCost: 200,
    });

    const buildingResult = results[BUILDING_A.id];
    if (buildingResult.status !== "success") {
      throw new Error("Expected successful analysis");
    }

    expect(buildingResult.financialResults).toBeDefined();

    const lastFinancialRequest = lastRequest(
      httpHistory,
      "/financial/risk-assessment",
    );
    expect(lastFinancialRequest).toBeDefined();

    const financialBody = lastFinancialRequest!.request.body as Record<
      string,
      unknown
    >;

    expect(financialBody.output_level).toBe("professional");
    expect(financialBody.project_lifetime).toBe(PROJECT_LIFETIME);
  });
});
