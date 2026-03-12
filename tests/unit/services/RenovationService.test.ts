import { vi, describe, test, expect, beforeEach } from "vitest";

const { mockSimulateECM } = vi.hoisted(() => ({
  mockSimulateECM: vi.fn(),
}));

vi.mock("../../../src/api", () => ({
  forecasting: {
    simulateECM: mockSimulateECM,
  },
}));

// Mock the renovation measures data used by the service
vi.mock("../../../src/services/mock/data/renovationMeasures", () => ({
  RENOVATION_MEASURES: [
    {
      id: "wall-insulation",
      name: "Wall Insulation",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "roof-insulation",
      name: "Roof Insulation",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "floor-insulation",
      name: "Floor Insulation",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "windows",
      name: "Window Replacement",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "air-water-heat-pump",
      name: "Heat Pump",
      category: "systems",
      isSupported: true,
    },
  ],
  MEASURE_CATEGORIES: [],
}));

import { RenovationService } from "../../../src/services/RenovationService";
import type {
  BuildingInfo,
  EstimationResult,
  RenovationMeasureId,
} from "../../../src/types/renovation";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const stubECMResponse = {
  scenarios: [
    {
      scenario_id: "test",
      description: "test",
      elements: ["wall"],
      u_values: {},
      results: {
        hourly_building: {
          Q_HC: Array(8760).fill(100), // 100 Wh per hour = 876 kWh/year
        },
        annual_building: [],
      },
    },
  ],
};

const mockBuilding: BuildingInfo = {
  country: "Greece",
  lat: 37.98,
  lng: 23.73,
  buildingType: "SFH",
  constructionPeriod: "1961-1980",
  floorArea: 100,
  numberOfFloors: 2,
  isModified: false,
  projectLifetime: 20,
  renovatedLast5Years: true,
  climateZone: "",
  heatingTechnology: "",
  coolingTechnology: "",
  hotWaterTechnology: "",
  numberOfOpenings: null,
  glazingTechnology: "",
  constructionYear: null,
  floorNumber: null,
};

const mockEstimation: EstimationResult = {
  estimatedEPC: "D",
  annualEnergyNeeds: 15000,
  annualEnergyCost: 3750,
  heatingCoolingNeeds: 15000,
  heatingDemand: 10000,
  coolingDemand: 5000,
  flexibilityIndex: 50,
  comfortIndex: 70,
  annualEnergyConsumption: 15000,
  archetypeFloorArea: 100,
  archetype: { category: "SFH", country: "Greece", name: "GR_SFH_1961_1980" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RenovationService.evaluateScenarios", () => {
  let service: RenovationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateECM.mockResolvedValue(stubECMResponse);
    service = new RenovationService();
  });

  test("supported envelope measures map to ECM elements and U-values", async () => {
    await service.evaluateScenarios(mockBuilding, mockEstimation, [
      "wall-insulation",
      "roof-insulation",
      "floor-insulation",
      "windows",
    ]);

    expect(mockSimulateECM).toHaveBeenCalledOnce();
    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        scenario_elements: "wall,roof,slab,window",
        u_wall: 0.25,
        u_roof: 0.2,
        u_slab: 0.25,
        u_window: 1.4,
      }),
    );
  });

  test("heat pump-only scenario sends heat pump flags without envelope params", async () => {
    await service.evaluateScenarios(mockBuilding, mockEstimation, [
      "air-water-heat-pump",
    ]);

    const callArgs = mockSimulateECM.mock.calls[0][0];
    expect(mockSimulateECM).toHaveBeenCalledOnce();
    expect(callArgs).toEqual(
      expect.objectContaining({
        use_heat_pump: true,
        heat_pump_cop: 3.2,
      }),
    );
    expect(callArgs).not.toHaveProperty("scenario_elements");
    expect(callArgs).not.toHaveProperty("u_wall");
    expect(callArgs).not.toHaveProperty("u_roof");
    expect(callArgs).not.toHaveProperty("u_slab");
    expect(callArgs).not.toHaveProperty("u_window");
  });

  test("unmodified building uses archetype params (category/country/name)", async () => {
    await service.evaluateScenarios(mockBuilding, mockEstimation, [
      "wall-insulation",
    ]);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
      }),
    );
  });

  test("modified building uses custom bui/system params, not archetype fields", async () => {
    const modifiedEstimation: EstimationResult = {
      ...mockEstimation,
      modifiedBui: { building: { name: "custom" } },
      modifiedSystem: { system: { name: "custom_sys" } },
    };

    await service.evaluateScenarios(mockBuilding, modifiedEstimation, [
      "wall-insulation",
    ]);

    const callArgs = mockSimulateECM.mock.calls[0][0];
    expect(callArgs).toEqual(
      expect.objectContaining({
        bui: { building: { name: "custom" } },
        system: { system: { name: "custom_sys" } },
      }),
    );
    expect(callArgs).not.toHaveProperty("category");
    expect(callArgs).not.toHaveProperty("country");
    expect(callArgs).not.toHaveProperty("name");
  });

  test("single envelope measure maps to its ECM element", async () => {
    await service.evaluateScenarios(mockBuilding, mockEstimation, [
      "wall-insulation",
    ]);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        scenario_elements: "wall",
        u_wall: 0.25,
      }),
    );
  });
});
