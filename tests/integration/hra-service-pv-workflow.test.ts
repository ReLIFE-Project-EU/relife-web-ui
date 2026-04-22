/**
 * HRA Service-Orchestrator PV Integration Test
 *
 * Exercises the HRA production service path with PV ECM packages.
 * Uses the src/api/client mock/redirect pattern to record HTTP exchanges.
 */

import { beforeAll, describe, expect, test, vi } from "vitest";
import { BuildingService } from "../../src/services/BuildingService";
import { EnergyService } from "../../src/services/EnergyService";
import { RenovationService } from "../../src/services/RenovationService";
import type { RenovationMeasureId } from "../../src/types/renovation";
import type { BuildingInfo } from "../../src/types/renovation";
import {
  findRequest,
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

const TEST_BUILDING: BuildingInfo = {
  country: "GR",
  lat: 37.981,
  lng: 23.728,
  buildingType: "Single Family House",
  constructionPeriod: "1971-1990",
  isModified: false,
  floorArea: 120,
  numberOfFloors: 2,
  climateZone: "",
  heatingTechnology: "",
  coolingTechnology: "",
  hotWaterTechnology: "",
  numberOfOpenings: null,
  glazingTechnology: "",
  constructionYear: 1980,
  floorNumber: 0,
  projectLifetime: 20,
  renovatedLast5Years: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.sequential("HRA Service PV Workflow", () => {
  const buildingService = new BuildingService();
  const energyService = new EnergyService(buildingService);
  const renovationService = new RenovationService();

  beforeAll(() => {
    httpHistory.length = 0;
  });

  test("PV-only package", async () => {
    const selectedMeasures: RenovationMeasureId[] = ["pv"];

    const estimation = await energyService.estimateEPC(TEST_BUILDING);
    expect(estimation).toBeDefined();
    expect(estimation.archetypeFloorArea).toBeGreaterThan(0);

    const packages = renovationService.suggestPackages(selectedMeasures);
    const scenarios = await renovationService.evaluateScenarios(
      TEST_BUILDING,
      estimation,
      packages,
    );

    const currentScenario = scenarios.find((s) => s.id === "current");
    const renovatedScenarios = scenarios.filter((s) => s.id !== "current");

    expect(currentScenario).toBeDefined();
    expect(renovatedScenarios.length).toBeGreaterThan(0);

    const pvScenario = renovatedScenarios.find((s) =>
      s.measureIds.includes("pv"),
    );
    expect(pvScenario).toBeDefined();

    // The PV scenario should be recorded in httpHistory with use_pv in the URL
    const pvRequest = findRequest(
      httpHistory,
      "/forecasting/ecm_application",
      (url) => url.searchParams.get("use_pv") === "true",
    );
    expect(pvRequest).toBeDefined();

    const pvUrl = new URL(pvRequest!.request.url);
    expect(pvUrl.searchParams.has("pv_kwp")).toBe(true);
    expect(Number(pvUrl.searchParams.get("pv_kwp"))).toBeGreaterThan(0);

    // PV is not an envelope element — scenario_elements should be absent or empty
    const scenarioElements = pvUrl.searchParams.get("scenario_elements") ?? "";
    expect(scenarioElements).not.toContain("pv");

    // PV reduces grid electricity, not HVAC demand — annualEnergyCost is unchanged
    expect(pvScenario!.annualEnergyCost).toBe(
      currentScenario!.annualEnergyCost,
    );
  });

  test("Envelope + PV package (wall-insulation + pv)", async () => {
    const selectedMeasures: RenovationMeasureId[] = ["wall-insulation", "pv"];

    const estimation = await energyService.estimateEPC(TEST_BUILDING);
    const packages = renovationService.suggestPackages(selectedMeasures);
    const scenarios = await renovationService.evaluateScenarios(
      TEST_BUILDING,
      estimation,
      packages,
    );

    const renovatedScenarios = scenarios.filter((s) => s.id !== "current");
    expect(renovatedScenarios.length).toBeGreaterThan(0);

    // Find scenario that includes both wall-insulation and pv
    const mixedScenario = renovatedScenarios.find(
      (s) =>
        s.measureIds.includes("wall-insulation") && s.measureIds.includes("pv"),
    );
    expect(mixedScenario).toBeDefined();

    // Find the specific HTTP request that has wall envelope + PV params
    const wallPvRequest = findRequest(
      httpHistory,
      "/forecasting/ecm_application",
      (url) =>
        url.searchParams.get("use_pv") === "true" &&
        url.searchParams.get("scenario_elements") === "wall",
    );
    expect(wallPvRequest).toBeDefined();

    const wallPvUrl = new URL(wallPvRequest!.request.url);
    expect(Number(wallPvUrl.searchParams.get("u_wall"))).toBe(0.25);
    expect(wallPvUrl.searchParams.has("pv_kwp")).toBe(true);
    expect(Number(wallPvUrl.searchParams.get("pv_kwp"))).toBeGreaterThan(0);
  });

  test("Envelope + System + PV package (wall-insulation + air-water-heat-pump + pv)", async () => {
    const selectedMeasures: RenovationMeasureId[] = [
      "wall-insulation",
      "air-water-heat-pump",
      "pv",
    ];

    const estimation = await energyService.estimateEPC(TEST_BUILDING);
    const packages = renovationService.suggestPackages(selectedMeasures);
    const scenarios = await renovationService.evaluateScenarios(
      TEST_BUILDING,
      estimation,
      packages,
    );

    const renovatedScenarios = scenarios.filter((s) => s.id !== "current");
    expect(renovatedScenarios.length).toBeGreaterThan(0);

    // Find scenario with all three measures
    const fullScenario = renovatedScenarios.find(
      (s) =>
        s.measureIds.includes("air-water-heat-pump") &&
        s.measureIds.includes("wall-insulation") &&
        s.measureIds.includes("pv"),
    );
    expect(fullScenario).toBeDefined();

    // Find the specific request combining wall + heat-pump + pv
    const combinedRequest = findRequest(
      httpHistory,
      "/forecasting/ecm_application",
      (url) =>
        url.searchParams.get("use_pv") === "true" &&
        url.searchParams.get("use_heat_pump") === "true" &&
        url.searchParams.get("scenario_elements") === "wall",
    );
    expect(combinedRequest).toBeDefined();

    const combinedUrl = new URL(combinedRequest!.request.url);
    expect(Number(combinedUrl.searchParams.get("u_wall"))).toBe(0.25);
    expect(Number(combinedUrl.searchParams.get("heat_pump_cop"))).toBe(3.2);

    // No condensing-boiler mode should appear in any request
    const hasCondensingBoiler = requestsTo(
      httpHistory,
      "/forecasting/ecm_application",
    ).some(
      (exchange) =>
        new URL(exchange.request.url).searchParams.get(
          "uni_generation_mode",
        ) === "condensing_boiler",
    );
    expect(hasCondensingBoiler).toBe(false);
  });
});
