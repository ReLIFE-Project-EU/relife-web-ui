import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockSimulateECM } = vi.hoisted(() => ({
  mockSimulateECM: vi.fn(),
}));

vi.mock("../../../src/api", () => ({
  forecasting: {
    simulateECM: mockSimulateECM,
  },
}));

vi.mock("../../../src/services/mock/data/renovationMeasures", () => ({
  RENOVATION_MEASURES: [
    {
      id: "wall-insulation",
      name: "Wall Insulation",
      description: "",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "roof-insulation",
      name: "Roof Insulation",
      description: "",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "floor-insulation",
      name: "Floor Insulation",
      description: "",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "windows",
      name: "Window Replacement",
      description: "",
      category: "envelope",
      isSupported: true,
    },
    {
      id: "air-water-heat-pump",
      name: "Heat Pump",
      description: "",
      category: "systems",
      isSupported: false,
    },
    {
      id: "condensing-boiler",
      name: "Condensing Boiler",
      description: "",
      category: "systems",
      isSupported: false,
    },
  ],
  MEASURE_CATEGORIES: [],
}));

import { RenovationService } from "../../../src/services/RenovationService";
import type {
  BuildingInfo,
  EstimationResult,
} from "../../../src/types/renovation";

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
  deliveredTotal: 17000,
  deliveredEnergyCost: 4250,
  primaryEnergy: 22000,
  archetypeFloorArea: 100,
  archetype: { category: "SFH", country: "Greece", name: "GR_SFH_1961_1980" },
};

const stubECMResponse = {
  scenarios: [
    {
      scenario_id: "baseline",
      elements: [],
      results: {
        hourly_building: {
          Q_HC: Array(8760).fill(100),
        },
      },
    },
    {
      scenario_id: "wall",
      elements: ["wall"],
      results: {
        hourly_building: {
          Q_HC: Array(8760).fill(100),
        },
        primary_energy_uni11300: {
          summary: {
            E_delivered_thermal_kWh: 1000,
            E_delivered_electric_total_kWh: 250,
            EP_total_kWh: 1800,
          },
        },
      },
    },
  ],
};

describe("RenovationService", () => {
  let service: RenovationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateECM.mockResolvedValue(stubECMResponse);
    service = new RenovationService();
  });

  test("suggestPackages keeps envelope package suggestions unchanged when only envelope measures are selected", () => {
    const packages = service.suggestPackages(["wall-insulation", "windows"]);

    expect(packages).toEqual([
      {
        id: "package-wall-insulation",
        label: "Wall Insulation",
        measureIds: ["wall-insulation"],
      },
      {
        id: "package-windows",
        label: "Window Replacement",
        measureIds: ["windows"],
      },
      {
        id: "package-wall-insulation-windows",
        label: "Envelope package",
        measureIds: ["wall-insulation", "windows"],
      },
    ]);
  });

  test("getAnalysisEligibleMeasures includes envelope and supported system scenarios", () => {
    expect(
      service.getAnalysisEligibleMeasures().map((measure) => measure.id),
    ).toEqual([
      "wall-insulation",
      "roof-insulation",
      "windows",
      "floor-insulation",
      "condensing-boiler",
      "air-water-heat-pump",
    ]);
  });

  test("getRankableMeasures remains envelope-only", () => {
    expect(service.getRankableMeasures().map((measure) => measure.id)).toEqual([
      "wall-insulation",
      "roof-insulation",
      "windows",
      "floor-insulation",
    ]);
  });

  test("suggestPackages adds direct and mixed condensing-boiler scenarios", () => {
    const packages = service.suggestPackages([
      "wall-insulation",
      "condensing-boiler",
    ]);

    expect(packages).toEqual([
      {
        id: "package-wall-insulation",
        label: "Wall Insulation",
        measureIds: ["wall-insulation"],
      },
      {
        id: "scenario-condensing-boiler",
        label: "Condensing Boiler",
        measureIds: ["condensing-boiler"],
      },
      {
        id: "package-wall-insulation-condensing-boiler",
        label: "Wall Insulation + Condensing Boiler",
        measureIds: ["wall-insulation", "condensing-boiler"],
      },
    ]);
  });

  test("suggestPackages adds direct and mixed heat-pump scenarios", () => {
    const packages = service.suggestPackages([
      "wall-insulation",
      "windows",
      "air-water-heat-pump",
    ]);

    expect(packages).toEqual([
      {
        id: "package-wall-insulation",
        label: "Wall Insulation",
        measureIds: ["wall-insulation"],
      },
      {
        id: "package-windows",
        label: "Window Replacement",
        measureIds: ["windows"],
      },
      {
        id: "package-wall-insulation-windows",
        label: "Envelope package",
        measureIds: ["wall-insulation", "windows"],
      },
      {
        id: "scenario-air-water-heat-pump",
        label: "Heat Pump",
        measureIds: ["air-water-heat-pump"],
      },
      {
        id: "package-wall-insulation-windows-air-water-heat-pump",
        label: "Envelope package + Heat Pump",
        measureIds: ["wall-insulation", "windows", "air-water-heat-pump"],
      },
    ]);
  });

  test("evaluateScenarios returns baseline plus one scenario per selected package", async () => {
    const packages = service.suggestPackages([
      "wall-insulation",
      "roof-insulation",
    ]);

    const scenarios = await service.evaluateScenarios(
      mockBuilding,
      mockEstimation,
      packages,
    );

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "current",
      "package-wall-insulation",
      "package-roof-insulation",
      "package-wall-insulation-roof-insulation",
    ]);
    expect(scenarios[0]?.packageId).toBeNull();
    expect(scenarios[1]?.measureIds).toEqual(["wall-insulation"]);
    expect(scenarios[3]?.measures).toEqual([
      "Wall Insulation",
      "Roof Insulation",
    ]);
  });

  test("evaluateScenarios calls forecasting once per package", async () => {
    const packages = service.suggestPackages([
      "wall-insulation",
      "roof-insulation",
      "windows",
    ]);

    await service.evaluateScenarios(mockBuilding, mockEstimation, packages);

    expect(mockSimulateECM).toHaveBeenCalledTimes(packages.length);
  });

  test("evaluateScenarios selects the matching non-baseline scenario and maps UNI totals", async () => {
    const scenarios = await service.evaluateScenarios(
      mockBuilding,
      mockEstimation,
      [
        {
          id: "package-wall-insulation",
          label: "Wall Insulation",
          measureIds: ["wall-insulation"],
        },
      ],
    );

    expect(scenarios[0]?.deliveredTotal).toBe(17000);
    expect(scenarios[1]?.deliveredTotal).toBe(1250);
    expect(scenarios[1]?.deliveredEnergyCost).toBe(313);
    expect(scenarios[1]?.primaryEnergy).toBe(1800);
  });

  test("evaluateScenarios handles condensing-boiler system scenarios without relying on envelope elements", async () => {
    mockSimulateECM.mockResolvedValueOnce({
      scenarios: [
        {
          scenario_id: "baseline",
          elements: [],
          results: {
            hourly_building: {
              Q_HC: Array(8760).fill(100),
            },
          },
        },
        {
          scenario_id: "condensing_boiler",
          elements: [],
          results: {
            hourly_building: {
              Q_HC: Array(8760).fill(100),
            },
            primary_energy_uni11300: {
              summary: {
                E_delivered_thermal_kWh: 900,
                E_delivered_electric_total_kWh: 100,
                EP_total_kWh: 1400,
              },
            },
          },
        },
      ],
    });

    const scenarios = await service.evaluateScenarios(
      mockBuilding,
      mockEstimation,
      [
        {
          id: "scenario-condensing-boiler",
          label: "Condensing Boiler",
          measureIds: ["condensing-boiler"],
        },
      ],
    );

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
        include_baseline: true,
        uni_generation_mode: "condensing_boiler",
      }),
    );
    expect(scenarios[1]?.label).toBe("Condensing Boiler");
    expect(scenarios[1]?.deliveredTotal).toBe(1000);
    expect(scenarios[1]?.primaryEnergy).toBe(1400);
  });

  test("evaluateScenarios enables heat-pump UNI totals for mixed scenarios", async () => {
    mockSimulateECM.mockResolvedValueOnce({
      scenarios: [
        {
          scenario_id: "baseline",
          elements: [],
          results: {
            hourly_building: {
              Q_HC: Array(8760).fill(100),
            },
          },
        },
        {
          scenario_id: "wall+heat_pump",
          elements: ["wall"],
          results: {
            hourly_building: {
              Q_HC: Array(8760).fill(80),
            },
            primary_energy_uni11300: {
              heat_pump_applied: true,
              summary: {
                E_delivered_electric_total_kWh: 850,
                EP_total_kWh: 1200,
                heat_pump_cop: 3.2,
              },
            },
          },
        },
      ],
    });

    const scenarios = await service.evaluateScenarios(
      mockBuilding,
      mockEstimation,
      [
        {
          id: "package-wall-insulation-air-water-heat-pump",
          label: "Wall Insulation + Heat Pump",
          measureIds: ["wall-insulation", "air-water-heat-pump"],
        },
      ],
    );

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
        scenario_elements: "wall",
        u_wall: 0.25,
        use_heat_pump: true,
        heat_pump_cop: 3.2,
        include_baseline: true,
      }),
    );
    expect(scenarios[1]?.deliveredTotal).toBe(850);
    expect(scenarios[1]?.primaryEnergy).toBe(1200);
  });
});
