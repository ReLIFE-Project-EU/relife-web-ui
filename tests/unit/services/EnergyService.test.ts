import { vi, describe, test, expect, beforeEach } from "vitest";
import type { IBuildingService } from "../../../src/services/types";
import type { BuildingInfo } from "../../../src/types/renovation";
import type {
  ArchetypeDetails,
  BuildingPayload,
  SystemPayload,
} from "../../../src/types/archetype";

// ── Mock setup ──────────────────────────────────────────────────────────────

const { mockListArchetypes, mockSimulateECM, mockValidateCustomBuilding } =
  vi.hoisted(() => ({
    mockListArchetypes: vi.fn(),
    mockSimulateECM: vi.fn(),
    mockValidateCustomBuilding: vi.fn(),
  }));

vi.mock("../../../src/api", () => ({
  forecasting: {
    listArchetypes: mockListArchetypes,
    simulateECM: mockSimulateECM,
    validateCustomBuilding: mockValidateCustomBuilding,
  },
}));

import {
  EnergyService,
  ArchetypeNotAvailableError,
} from "../../../src/services/EnergyService";
import { simulatedFloorArea } from "../../../src/services/simulatedBuilding";
import { surfaceAreasFromBui } from "../../../src/utils/archetypeModifier";

// ── Mock building service ───────────────────────────────────────────────────

const mockBuildingService = {
  getArchetypeDetails: vi.fn(),
  getArchetypes: vi.fn(),
  findMatchingArchetype: vi.fn(),
  getAvailableCategories: vi.fn(),
  getAvailablePeriods: vi.fn(),
  detectCountryFromCoords: vi.fn(),
} as unknown as IBuildingService;

// ── Test data ───────────────────────────────────────────────────────────────

const archetypeList = [
  { category: "SFH", country: "Greece", name: "GR_SFH_1961_1980" },
  { category: "SFH", country: "Italy", name: "IT_SFH_1961_1980" },
  { category: "MFH", country: "Greece", name: "GR_MFH_1961_1980" },
  { category: "SFH", country: "Czechia", name: "CZ_SFH_1961_1980" },
];

const stubSimulationResponse = {
  scenario_id: "baseline",
  description: "Baseline",
  elements: [],
  u_values: { roof: null, wall: null, window: null, slab: null },
  results: {
    // ECM returns hourly data columnar, unlike /simulate.
    hourly_building: {
      Q_H: Array(8760).fill(200),
      Q_C: Array(8760).fill(100),
    },
    primary_energy_uni11300: {
      summary: {
        E_delivered_thermal_kWh: 1200,
        E_delivered_electric_total_kWh: 300,
        EP_total_kWh: 2100,
      },
    },
  },
};

/** ECM responses wrap scenarios; the baseline is the only one requested here. */
const stubEcmResponse = { scenarios: [stubSimulationResponse] };

const realisticBui: BuildingPayload = {
  building: {
    name: "Test",
    latitude: 37.98,
    longitude: 23.73,
    net_floor_area: 100,
    n_floors: 2,
    height: 6,
    volume: 300,
    exposed_perimeter: 40,
    wall_thickness: 0.3,
    building_type_class: "SFH",
    construction_class: "1961_1980",
  },
  building_surface: [
    {
      name: "Opaque north surface",
      type: "opaque" as const,
      area: 20,
      u_value: 1.5,
      sky_view_factor: 0.5,
      orientation: { azimuth: 0, tilt: 90 },
    },
    {
      name: "Opaque south surface",
      type: "opaque" as const,
      area: 20,
      u_value: 1.5,
      sky_view_factor: 0.5,
      orientation: { azimuth: 180, tilt: 90 },
    },
    {
      name: "Opaque roof surface",
      type: "opaque" as const,
      area: 50,
      u_value: 0.8,
      sky_view_factor: 1,
      orientation: { azimuth: 0, tilt: 0 },
    },
    {
      name: "Slab to ground",
      type: "opaque" as const,
      area: 50,
      u_value: 1.0,
      sky_view_factor: 0,
      orientation: { azimuth: 0, tilt: 0 },
    },
    {
      name: "Window north",
      type: "transparent" as const,
      area: 5,
      u_value: 2.8,
      sky_view_factor: 0.5,
      orientation: { azimuth: 0, tilt: 90 },
    },
  ],
  building_parameters: {
    temperature_setpoints: {
      heating_setpoint: 20,
      heating_setback: 17,
      cooling_setpoint: 26,
      cooling_setback: 30,
      units: "C",
    },
    system_capacities: {
      heating_capacity: 10000,
      cooling_capacity: 5000,
      units: "W",
    },
    airflow_rates: { infiltration_rate: 0.5, units: "1/h" },
    construction: { thermal_bridge_heat_W_K: 10 },
    internal_gains: [],
  },
  units: {},
};

const realisticSystem: SystemPayload = {
  emitter_type: "radiator",
  nominal_power: 10000,
  emission_efficiency: 0.95,
  distribution_loss_coeff: 0.02,
  efficiency_model: {},
};

const stubArchetypeDetails: ArchetypeDetails = {
  category: "SFH",
  country: "Greece",
  name: "GR_SFH_1961_1980",
  floorArea: 100,
  numberOfFloors: 2,
  floorHeight: 3,
  totalWindowArea: 10,
  thermalProperties: {
    wallUValue: 1.5,
    roofUValue: 0.8,
    windowUValue: 2.8,
  },
  setpoints: {
    heatingSetpoint: 20,
    heatingSetback: 17,
    coolingSetpoint: 26,
    coolingSetback: 30,
  },
  location: { lat: 37.98, lng: 23.73 },
  bui: realisticBui,
  system: realisticSystem,
  uni11300Config: {
    input_unit: "Wh",
    heating_params: { eta_generation: 0.8 },
    cooling_params: { eer: 2.5 },
  },
};

const unmodifiedBuilding: BuildingInfo = {
  country: "Greece",
  lat: 37.98,
  lng: 23.73,
  buildingType: "SFH",
  constructionPeriod: "1961-1980",
  floorArea: 100,
  numberOfFloors: 2,
  isModified: false,
  projectLifetime: 20,
  selectedArchetype: {
    category: "SFH",
    country: "Greece",
    name: "GR_SFH_1961_1980",
  },
  climateZone: "",
  heatingTechnology: "",
  coolingTechnology: "",
  hotWaterTechnology: "",
  glazingTechnology: "",
  numberOfOpenings: null,
  constructionYear: 1970,
  floorNumber: null,
  apartmentLocation: undefined,
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("EnergyService", () => {
  let service: EnergyService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListArchetypes.mockResolvedValue(archetypeList);
    mockSimulateECM.mockResolvedValue(stubEcmResponse);
    (
      mockBuildingService.getArchetypeDetails as ReturnType<typeof vi.fn>
    ).mockResolvedValue(stubArchetypeDetails);
    service = new EnergyService(mockBuildingService);
  });

  test("unmodified building runs one ECM baseline and no validation", async () => {
    await service.estimateEPC(unmodifiedBuilding);

    expect(mockSimulateECM).toHaveBeenCalledOnce();
    expect(mockSimulateECM.mock.calls[0][0]).toMatchObject({
      baseline_only: true,
    });
    expect(mockValidateCustomBuilding).not.toHaveBeenCalled();
  });

  test("modified building validates, then simulates itself and its reference", async () => {
    mockValidateCustomBuilding.mockResolvedValue({
      bui_checked: realisticBui,
      system_checked: realisticSystem,
      bui_issues: [],
      system_messages: [],
    });

    const modifiedBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      isModified: true,
      modifications: { floorArea: 150 },
    };

    const { estimation } = await service.estimateEPC(modifiedBuilding);

    expect(mockValidateCustomBuilding).toHaveBeenCalledOnce();
    expect(mockSimulateECM).toHaveBeenCalledTimes(2);
    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        bui: realisticBui,
        uni11300Config: stubArchetypeDetails.uni11300Config,
        baseline_only: true,
      }),
    );
    expect(estimation.simulated.adjustment?.uni11300Config).toEqual(
      stubArchetypeDetails.uni11300Config,
    );
  });

  test.each([
    [150, 2],
    [100, 3],
    [150, 3],
  ])(
    "reshapes %s m² over %s floors without result scaling",
    async (floorArea, numberOfFloors) => {
      // Catalogue footprint and net area can differ. Preserve the CSV total
      // even when it matches the reference's net area.
      vi.mocked(mockBuildingService.getArchetypeDetails).mockResolvedValue({
        ...stubArchetypeDetails,
        bui: {
          ...realisticBui,
          building_surface: realisticBui.building_surface.map((surface) =>
            surface.name === "Opaque roof surface" ||
            surface.name === "Slab to ground"
              ? { ...surface, area: 40 }
              : surface,
          ),
        },
      });
      mockValidateCustomBuilding.mockImplementation(
        async ({ bui, system }) => ({
          bui_checked: bui,
          system_checked: system,
          bui_issues: [],
          system_messages: [],
        }),
      );
      const customBaseline = {
        ...stubSimulationResponse,
        results: {
          ...stubSimulationResponse.results,
          hourly_building: { Q_H: [800000], Q_C: [200000] },
        },
      };
      mockSimulateECM.mockImplementation(async (params) => ({
        scenarios: [params.bui ? customBaseline : stubSimulationResponse],
      }));

      const { estimation, baselineSimulation } = await service.estimateEPC({
        ...unmodifiedBuilding,
        floorArea,
        numberOfFloors,
        isModified: true,
        modifications: { floorArea, numberOfFloors },
      });

      const submitted = mockValidateCustomBuilding.mock.calls[0][0].bui;
      expect(submitted.building.net_floor_area).toBe(floorArea);
      expect(submitted.building.n_floors).toBe(numberOfFloors);
      expect(submitted.building_surface[2].area).toBeCloseTo(
        floorArea / numberOfFloors,
      );
      expect(mockSimulateECM).toHaveBeenCalledWith(
        expect.objectContaining({ bui: submitted }),
      );
      expect(mockBuildingService.getArchetypeDetails).toHaveBeenCalledOnce();
      expect(estimation.simulated.bui).toEqual(submitted);
      expect(surfaceAreasFromBui(estimation.simulated.bui).roofM2).toBeCloseTo(
        floorArea / numberOfFloors,
      );
      expect(simulatedFloorArea(estimation.simulated)).toBe(floorArea);
      expect(estimation.annualEnergyNeeds).toBe(1000);
      expect(estimation.referenceEstimation?.annualEnergyNeeds).toBe(2628);
      expect(estimation.deliveredTotal).toBe(1500);
      expect(estimation.primaryEnergy).toBe(2100);
      expect(baselineSimulation).toBe(customBaseline);
    },
  );

  test.each([
    { floorArea: 100 },
    { numberOfFloors: 2 },
    { floorArea: 100, numberOfFloors: 2 },
  ])("matching geometry %j reuses the reference", async (modifications) => {
    const result = await service.estimateEPC({
      ...unmodifiedBuilding,
      isModified: true,
      modifications,
    });
    expect(mockValidateCustomBuilding).not.toHaveBeenCalled();
    expect(mockSimulateECM).toHaveBeenCalledOnce();
    expect(mockBuildingService.getArchetypeDetails).toHaveBeenCalledOnce();
    expect(result.baselineSimulation).toBe(stubSimulationResponse);
    expect(result.estimation.simulated.adjustment).toBeUndefined();
  });

  test("matching geometry preserves other modifications", async () => {
    mockValidateCustomBuilding.mockImplementation(async ({ bui, system }) => ({
      bui_checked: bui,
      system_checked: system,
      bui_issues: [],
      system_messages: [],
    }));
    await service.estimateEPC({
      ...unmodifiedBuilding,
      isModified: true,
      modifications: { floorArea: 100, numberOfFloors: 2, wallUValue: 0.3 },
    });
    expect(mockValidateCustomBuilding).toHaveBeenCalledOnce();
    const submitted = mockValidateCustomBuilding.mock.calls[0][0].bui;
    expect(submitted.building_surface[0].u_value).toBe(0.3);
    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({ bui: submitted }),
    );
    expect(mockSimulateECM).toHaveBeenCalledTimes(2);
  });

  test("identical archetype simulations reuse the in-flight request", async () => {
    await Promise.all([
      service.estimateEPC(unmodifiedBuilding),
      service.estimateEPC(unmodifiedBuilding),
    ]);

    expect(mockSimulateECM).toHaveBeenCalledOnce();
  });

  test("failed archetype simulations are evicted from cache", async () => {
    mockSimulateECM
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(stubEcmResponse);

    await expect(service.estimateEPC(unmodifiedBuilding)).rejects.toThrow();
    await service.estimateEPC(unmodifiedBuilding);

    expect(mockSimulateECM).toHaveBeenCalledTimes(2);
  });

  test("the ECM baseline request carries the archetype", async () => {
    await service.estimateEPC(unmodifiedBuilding);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
        baseline_only: true,
      }),
    );
  });

  test("estimateEPC exposes UNI delivered and primary energy when available", async () => {
    const { estimation } = await service.estimateEPC(unmodifiedBuilding);

    expect(estimation.deliveredTotal).toBe(1500);
    expect(estimation.carrierBreakdown).toEqual({
      naturalGasKwh: 1200,
      gridElectricityKwh: 300,
    });
    expect(estimation.primaryEnergy).toBe(2100);
    expect(estimation.annualEnergyNeeds).toBe(2628);
  });

  test("modified path sends validated BUI to simulateCustomBuilding", async () => {
    const validatedBui = {
      ...realisticBui,
      building: { ...realisticBui.building, net_floor_area: 150 },
    };

    mockValidateCustomBuilding.mockResolvedValue({
      bui_checked: validatedBui,
      system_checked: realisticSystem,
      bui_issues: [],
      system_messages: [],
    });

    const modifiedBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      isModified: true,
      modifications: { floorArea: 150 },
    };

    await service.estimateEPC(modifiedBuilding);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        bui: validatedBui,
        system: realisticSystem,
        uni11300Config: stubArchetypeDetails.uni11300Config,
        baseline_only: true,
      }),
    );
  });

  test("findMatchingArchetype climate fallback: Spain resolves to Greek archetype via mediterranean region", async () => {
    const spanishBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      country: "Spain",
      selectedArchetype: undefined,
    };

    const { estimation } = await service.estimateEPC(spanishBuilding);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "Greece",
        category: "SFH",
        name: "GR_SFH_1961_1980",
      }),
    );
    expect(estimation).toBeDefined();
  });

  test("findMatchingArchetype normalizes country aliases before exact matching", async () => {
    const czechBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      country: "Czech Republic",
      selectedArchetype: undefined,
    };

    await service.estimateEPC(czechBuilding);

    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "Czechia",
        category: "SFH",
        name: "CZ_SFH_1961_1980",
      }),
    );
  });

  test("findMatchingArchetype selects the exact period among hyphenated-period archetypes", async () => {
    mockListArchetypes.mockResolvedValue([
      {
        category: "Apartment buildings",
        country: "Austria",
        name: "AT_AB_0-1945",
      },
      {
        category: "Apartment buildings",
        country: "Austria",
        name: "AT_AB_2011-now",
      },
    ]);

    const austrianBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      country: "Austria",
      buildingType: "Apartment buildings",
      constructionPeriod: "2011-now",
      selectedArchetype: undefined,
    };

    await service.estimateEPC(austrianBuilding);

    // The 0-1945 archetype comes first, so getting 2011-now proves the match
    // was period-aware (EXACT_FULL) rather than first-in-country fallback.
    expect(mockSimulateECM).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "Austria",
        category: "Apartment buildings",
        name: "AT_AB_2011-now",
      }),
    );
  });

  test("findMatchingArchetype throws ArchetypeNotAvailableError when no match at all", async () => {
    const unmatchedBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      country: "Japan",
      buildingType: "SFH",
      selectedArchetype: undefined,
    };

    await expect(service.estimateEPC(unmatchedBuilding)).rejects.toThrow(
      ArchetypeNotAvailableError,
    );
  });
});
