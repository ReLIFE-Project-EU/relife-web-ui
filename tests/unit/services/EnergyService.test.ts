import { vi, describe, test, expect, beforeEach } from "vitest";
import type { IBuildingService } from "../../../src/services/types";
import type { BuildingInfo } from "../../../src/types/renovation";
import type {
  ArchetypeDetails,
  BuildingPayload,
  SystemPayload,
} from "../../../src/types/archetype";

// ── Mock setup ──────────────────────────────────────────────────────────────

const {
  mockListArchetypes,
  mockSimulateDirect,
  mockSimulateCustomBuilding,
  mockValidateCustomBuilding,
} = vi.hoisted(() => ({
  mockListArchetypes: vi.fn(),
  mockSimulateDirect: vi.fn(),
  mockSimulateCustomBuilding: vi.fn(),
  mockValidateCustomBuilding: vi.fn(),
}));

vi.mock("../../../src/api", () => ({
  forecasting: {
    listArchetypes: mockListArchetypes,
    simulateDirect: mockSimulateDirect,
    simulateCustomBuilding: mockSimulateCustomBuilding,
    validateCustomBuilding: mockValidateCustomBuilding,
  },
}));

import {
  EnergyService,
  ArchetypeNotAvailableError,
} from "../../../src/services/EnergyService";

// ── Mock building service ───────────────────────────────────────────────────

const mockBuildingService = {
  getArchetypeDetails: vi.fn(),
  getOptions: vi.fn(),
  getArchetypes: vi.fn(),
  findMatchingArchetype: vi.fn(),
  getAvailableCategories: vi.fn(),
  getAvailablePeriods: vi.fn(),
  countMatchingArchetypes: vi.fn(),
  getDefaultsForCountry: vi.fn(),
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
  source: "test",
  name: "test",
  category: "SFH",
  country: "Greece",
  weather_source: "pvgis",
  results: {
    hourly_building: Array(8760).fill({
      timestamp: "",
      Q_H: 200,
      Q_C: 100,
    }),
    primary_energy_uni11300: {
      summary: {
        E_delivered_thermal_kWh: 1200,
        E_delivered_electric_total_kWh: 300,
        EP_total_kWh: 2100,
      },
    },
  },
};

const realisticBui: BuildingPayload = {
  building: {
    name: "Test",
    latitude: 37.98,
    longitude: 23.73,
    net_floor_area: 100,
    n_floors: 2,
    height: 6,
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
  renovatedLast5Years: true,
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
    mockSimulateDirect.mockResolvedValue(stubSimulationResponse);
    mockSimulateCustomBuilding.mockResolvedValue(stubSimulationResponse);
    (
      mockBuildingService.getArchetypeDetails as ReturnType<typeof vi.fn>
    ).mockResolvedValue(stubArchetypeDetails);
    service = new EnergyService(mockBuildingService);
  });

  test("unmodified building calls simulateDirect only", async () => {
    await service.estimateEPC(unmodifiedBuilding);

    expect(mockSimulateDirect).toHaveBeenCalledOnce();
    expect(mockValidateCustomBuilding).not.toHaveBeenCalled();
    expect(mockSimulateCustomBuilding).not.toHaveBeenCalled();
  });

  test("modified building calls validateCustomBuilding, simulateCustomBuilding, and simulateDirect", async () => {
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

    await service.estimateEPC(modifiedBuilding);

    expect(mockValidateCustomBuilding).toHaveBeenCalledOnce();
    expect(mockSimulateCustomBuilding).toHaveBeenCalledOnce();
    expect(mockSimulateDirect).toHaveBeenCalledOnce();
  });

  test("simulateDirect receives correct archetype params", async () => {
    await service.estimateEPC(unmodifiedBuilding);

    expect(mockSimulateDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
        weatherSource: "pvgis",
      }),
    );
  });

  test("estimateEPC exposes UNI delivered and primary energy when available", async () => {
    const estimation = await service.estimateEPC(unmodifiedBuilding);

    expect(estimation.deliveredTotal).toBe(1500);
    expect(estimation.deliveredEnergyCost).toBe(375);
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

    expect(mockSimulateCustomBuilding).toHaveBeenCalledWith(
      { bui: validatedBui, system: realisticSystem },
      "pvgis",
    );
  });

  test("findMatchingArchetype climate fallback: Spain resolves to Greek archetype via mediterranean region", async () => {
    const spanishBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      country: "Spain",
      selectedArchetype: undefined,
    };

    const result = await service.estimateEPC(spanishBuilding);

    expect(mockSimulateDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "Greece",
        category: "SFH",
        name: "GR_SFH_1961_1980",
      }),
    );
    expect(result).toBeDefined();
  });

  test("findMatchingArchetype normalizes country aliases before exact matching", async () => {
    const czechBuilding: BuildingInfo = {
      ...unmodifiedBuilding,
      country: "Czech Republic",
      selectedArchetype: undefined,
    };

    await service.estimateEPC(czechBuilding);

    expect(mockSimulateDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "Czechia",
        category: "SFH",
        name: "CZ_SFH_1961_1980",
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
