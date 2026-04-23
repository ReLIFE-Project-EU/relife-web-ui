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
      isSupported: true,
    },
    {
      id: "condensing-boiler",
      name: "Condensing Boiler",
      description: "",
      category: "systems",
      isSupported: true,
    },
    {
      id: "pv",
      name: "PV Panels",
      description: "",
      category: "renewable",
      isSupported: true,
    },
  ],
  MEASURE_CATEGORIES: [],
}));

import { RenovationService } from "../../../src/services/RenovationService";
import {
  PV_DEFAULTS,
  pvKwpFromFloorArea,
} from "../../../src/services/pvConfig";
import type {
  BuildingInfo,
  EstimationResult,
} from "../../../src/types/renovation";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

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
            EP_heat_total_kWh: 1200,
            EP_cool_total_kWh: 600,
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

  test("suggestPackages returns one package for one envelope measure", () => {
    expect(service.suggestPackages(["wall-insulation"])).toEqual([
      {
        id: "package-wall-insulation",
        label: "Wall Insulation",
        measureIds: ["wall-insulation"],
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
      "pv",
    ]);
  });

  test("getEnvelopePackageMeasures returns envelope package seed measures", () => {
    expect(
      service.getEnvelopePackageMeasures().map((measure) => measure.id),
    ).toEqual([
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

  test("suggestPackages keeps wall plus heat-pump suggestions to envelope, system, and mixed", () => {
    const packages = service.suggestPackages([
      "wall-insulation",
      "air-water-heat-pump",
    ]);

    expect(packages).toEqual([
      {
        id: "package-wall-insulation",
        label: "Wall Insulation",
        measureIds: ["wall-insulation"],
      },
      {
        id: "scenario-air-water-heat-pump",
        label: "Heat Pump",
        measureIds: ["air-water-heat-pump"],
      },
      {
        id: "package-wall-insulation-air-water-heat-pump",
        label: "Wall Insulation + Heat Pump",
        measureIds: ["wall-insulation", "air-water-heat-pump"],
      },
    ]);
  });

  test("suggestPackages emits PV variants in a stable order", () => {
    const packages = service.suggestPackages([
      "wall-insulation",
      "air-water-heat-pump",
      "pv",
    ]);

    expect(packages).toEqual([
      {
        id: "package-wall-insulation",
        label: "Wall Insulation",
        measureIds: ["wall-insulation"],
      },
      {
        id: "scenario-air-water-heat-pump",
        label: "Heat Pump",
        measureIds: ["air-water-heat-pump"],
      },
      {
        id: "scenario-pv",
        label: "PV Panels",
        measureIds: ["pv"],
      },
      {
        id: "package-wall-insulation-pv",
        label: "Wall Insulation + PV Panels",
        measureIds: ["wall-insulation", "pv"],
      },
      {
        id: "package-wall-insulation-air-water-heat-pump",
        label: "Wall Insulation + Heat Pump",
        measureIds: ["wall-insulation", "air-water-heat-pump"],
      },
      {
        id: "package-pv-air-water-heat-pump",
        label: "PV Panels + Heat Pump",
        measureIds: ["pv", "air-water-heat-pump"],
      },
      {
        id: "package-wall-insulation-air-water-heat-pump-pv",
        label: "Wall Insulation + Heat Pump + PV Panels",
        measureIds: ["wall-insulation", "air-water-heat-pump", "pv"],
      },
    ]);
  });

  test("suggestPackages normalizes mutually exclusive system selections to heat pump", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const packages = service.suggestPackages([
      "condensing-boiler",
      "air-water-heat-pump",
    ]);

    expect(packages).toEqual([
      {
        id: "scenario-air-water-heat-pump",
        label: "Heat Pump",
        measureIds: ["air-water-heat-pump"],
      },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Dropping 'condensing-boiler' because it is mutually exclusive with 'air-water-heat-pump'",
    );

    warnSpy.mockRestore();
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

  test("evaluateScenarios limits forecasting concurrency to two requests", async () => {
    const packages = service.suggestPackages([
      "wall-insulation",
      "roof-insulation",
      "windows",
    ]);
    const deferredResponses = packages.map(() =>
      createDeferred<typeof stubECMResponse>(),
    );
    let responseIndex = 0;
    let inFlight = 0;
    let maxInFlight = 0;

    mockSimulateECM.mockImplementation(() => {
      const next = deferredResponses[responseIndex];
      if (!next) {
        throw new Error("No deferred response available");
      }
      responseIndex += 1;

      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      return next.promise.finally(() => {
        inFlight -= 1;
      });
    });

    const evaluationPromise = service.evaluateScenarios(
      mockBuilding,
      mockEstimation,
      packages,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockSimulateECM).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(2);

    for (const deferred of deferredResponses) {
      deferred.resolve(stubECMResponse);
      await Promise.resolve();
      await Promise.resolve();
    }

    const scenarios = await evaluationPromise;

    expect(mockSimulateECM).toHaveBeenCalledTimes(packages.length);
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "current",
      "package-wall-insulation",
      "package-roof-insulation",
      "package-windows",
      "package-wall-insulation-roof-insulation-windows",
    ]);
    expect(maxInFlight).toBe(2);
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
    expect(scenarios[1]?.heatingPrimaryEnergy).toBe(1200);
    expect(scenarios[1]?.coolingPrimaryEnergy).toBe(600);
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
                EP_heat_total_kWh: 1000,
                EP_cool_total_kWh: 400,
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
    expect(scenarios[1]?.heatingPrimaryEnergy).toBe(1000);
    expect(scenarios[1]?.coolingPrimaryEnergy).toBe(400);
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
                EP_heat_total_kWh: 900,
                EP_cool_total_kWh: 300,
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
      }),
    );
    expect(mockSimulateECM.mock.calls[0]?.[0]).not.toHaveProperty(
      "include_baseline",
    );
    expect(scenarios[1]?.deliveredTotal).toBe(850);
    expect(scenarios[1]?.primaryEnergy).toBe(1200);
    expect(scenarios[1]?.heatingPrimaryEnergy).toBe(900);
    expect(scenarios[1]?.coolingPrimaryEnergy).toBe(300);
    expect(scenarios[1]?.heatPumpCop).toBe(3.2);
  });

  test("evaluateScenarios sends PV params without scenario_elements for PV-only packages", async () => {
    await service.evaluateScenarios(mockBuilding, mockEstimation, [
      {
        id: "scenario-pv",
        label: "PV Panels",
        measureIds: ["pv"],
      },
    ]);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
        use_pv: true,
        pv_kwp: pvKwpFromFloorArea(mockEstimation.archetypeFloorArea),
        pv_tilt_deg: PV_DEFAULTS.tiltDeg,
        pv_azimuth_deg: PV_DEFAULTS.azimuthDeg,
        pv_use_pvgis: PV_DEFAULTS.usePvgis,
        pv_pvgis_loss_percent: PV_DEFAULTS.pvgisLossPercent,
        annual_pv_yield_kwh_per_kwp: PV_DEFAULTS.annualYieldKwhPerKwp,
      }),
    );
    expect(mockSimulateECM.mock.calls[0]?.[0]).not.toHaveProperty(
      "scenario_elements",
    );
    expect(mockSimulateECM.mock.calls[0]?.[0]).not.toHaveProperty(
      "include_baseline",
    );
  });

  test("evaluateScenarios sends envelope scenario_elements without pv", async () => {
    await service.evaluateScenarios(mockBuilding, mockEstimation, [
      {
        id: "package-wall-insulation-pv",
        label: "Wall Insulation + PV Panels",
        measureIds: ["wall-insulation", "pv"],
      },
    ]);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        scenario_elements: "wall",
        u_wall: 0.25,
        use_pv: true,
      }),
    );
  });

  test("evaluateScenarios includes baseline only for pure generation changes", async () => {
    await service.evaluateScenarios(mockBuilding, mockEstimation, [
      {
        id: "scenario-air-water-heat-pump",
        label: "Heat Pump",
        measureIds: ["air-water-heat-pump"],
      },
      {
        id: "package-wall-insulation-air-water-heat-pump",
        label: "Wall Insulation + Heat Pump",
        measureIds: ["wall-insulation", "air-water-heat-pump"],
      },
      {
        id: "package-pv-air-water-heat-pump",
        label: "PV Panels + Heat Pump",
        measureIds: ["pv", "air-water-heat-pump"],
      },
    ]);

    expect(mockSimulateECM.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ include_baseline: true }),
    );
    expect(mockSimulateECM.mock.calls[1]?.[0]).not.toHaveProperty(
      "include_baseline",
    );
    expect(mockSimulateECM.mock.calls[2]?.[0]).not.toHaveProperty(
      "include_baseline",
    );
  });

  test("evaluateScenarios rejects PV packages without a valid archetype floor area", async () => {
    await expect(
      service.evaluateScenarios(
        mockBuilding,
        { ...mockEstimation, archetypeFloorArea: 0 },
        [
          {
            id: "scenario-pv",
            label: "PV Panels",
            measureIds: ["pv"],
          },
        ],
      ),
    ).rejects.toThrow("PV measure requires a valid archetype floor area");
  });

  test("evaluateScenarios credits PV self-consumption to delivered energy only", async () => {
    mockSimulateECM.mockResolvedValueOnce({
      scenarios: [
        {
          scenario_id: "wall",
          elements: ["wall"],
          results: {
            hourly_building: {
              Q_HC: Array(8760).fill(100),
            },
            primary_energy_uni11300: {
              summary: {
                E_delivered_thermal_kWh: 1500,
                E_delivered_electric_total_kWh: 500,
                EP_heat_total_kWh: 2000,
                EP_cool_total_kWh: 1000,
                EP_total_kWh: 3000,
              },
            },
            pv_hp: {
              summary: {
                annual_kwh: {
                  pv_generation: 2200,
                  self_consumption: 1500,
                  grid_export: 700,
                },
                indicators: {
                  self_consumption_rate: 0.68,
                  self_sufficiency_rate: 0.42,
                },
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
          id: "package-wall-insulation-pv",
          label: "Wall Insulation + PV Panels",
          measureIds: ["wall-insulation", "pv"],
        },
      ],
    );

    expect(scenarios[1]?.deliveredTotal).toBe(500);
    expect(scenarios[1]?.deliveredEnergyCost).toBe(125);
    expect(scenarios[1]?.primaryEnergy).toBe(3000);
    expect(scenarios[1]?.heatingPrimaryEnergy).toBe(2000);
    expect(scenarios[1]?.coolingPrimaryEnergy).toBe(1000);
    expect(scenarios[1]?.pvGeneration).toBe(2200);
    expect(scenarios[1]?.pvSelfConsumption).toBe(1500);
    expect(scenarios[1]?.pvGridExport).toBe(700);
    expect(scenarios[1]?.pvSelfConsumptionRate).toBe(0.68);
    expect(scenarios[1]?.pvSelfSufficiencyRate).toBe(0.42);
    expect(scenarios[1]?.annualEnergyNeeds).toBe(876);
    expect(scenarios[1]?.heatingCoolingNeeds).toBe(876);
  });
});
