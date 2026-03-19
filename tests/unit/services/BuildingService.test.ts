import { vi, describe, test, expect, beforeEach } from "vitest";

const { mockListArchetypes, mockGetArchetypeDetails } = vi.hoisted(() => ({
  mockListArchetypes: vi.fn(),
  mockGetArchetypeDetails: vi.fn(),
}));

vi.mock("../../../src/api", () => ({
  forecasting: {
    listArchetypes: mockListArchetypes,
    getArchetypeDetails: mockGetArchetypeDetails,
  },
}));

import { BuildingService } from "../../../src/services/BuildingService";

const stubBuiResponse = {
  bui: {
    building: {
      name: "GR_SFH_1961_1980",
      latitude: 37.98,
      longitude: 23.73,
      net_floor_area: 120,
      n_floors: 2,
      height: 6.5,
      exposed_perimeter: 44,
      wall_thickness: 0.3,
      building_type_class: "SFH",
      construction_class: "1961_1980",
    },
    building_surface: [
      {
        name: "Opaque north surface",
        type: "opaque",
        area: 30,
        u_value: 1.8,
        sky_view_factor: 0.5,
        orientation: { azimuth: 0, tilt: 90 },
      },
      {
        name: "Opaque south surface",
        type: "opaque",
        area: 25,
        u_value: 1.4,
        sky_view_factor: 0.5,
        orientation: { azimuth: 180, tilt: 90 },
      },
      {
        name: "Opaque east surface",
        type: "opaque",
        area: 15,
        u_value: 1.6,
        sky_view_factor: 0.5,
        orientation: { azimuth: 90, tilt: 90 },
      },
      {
        name: "Opaque west surface",
        type: "opaque",
        area: 15,
        u_value: 1.6,
        sky_view_factor: 0.5,
        orientation: { azimuth: 270, tilt: 90 },
      },
      {
        name: "Opaque roof surface",
        type: "opaque",
        area: 60,
        u_value: 0.9,
        sky_view_factor: 1,
        orientation: { azimuth: 0, tilt: 0 },
      },
      {
        name: "Window north",
        type: "transparent",
        area: 8,
        u_value: 3.0,
        sky_view_factor: 0.5,
        orientation: { azimuth: 0, tilt: 90 },
      },
      {
        name: "Window south",
        type: "transparent",
        area: 12,
        u_value: 2.6,
        sky_view_factor: 0.5,
        orientation: { azimuth: 180, tilt: 90 },
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
  },
  system: {
    emitter_type: "radiator",
    nominal_power: 10000,
    emission_efficiency: 0.95,
    distribution_loss_coeff: 0.02,
    efficiency_model: {},
  },
};

const archetypeList = [
  { category: "SFH", country: "Greece", name: "GR_SFH_1961_1980" },
  { category: "SFH", country: "Greece", name: "GR_SFH_1981_2000" },
  { category: "MFH", country: "Greece", name: "GR_MFH_1961_1980" },
  { category: "SFH", country: "Italy", name: "IT_SFH_1961_1980" },
  { category: "SFH", country: "Czechia", name: "CZ_SFH_1961_1980" },
];

describe("BuildingService", () => {
  let service: BuildingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BuildingService();
  });

  test("getArchetypeDetails extracts floor area", async () => {
    mockGetArchetypeDetails.mockResolvedValue(stubBuiResponse);

    const result = await service.getArchetypeDetails(archetypeList[0]);

    expect(result.floorArea).toBe(120);
  });

  test("getArchetypeDetails computes area-weighted wall U-value", async () => {
    mockGetArchetypeDetails.mockResolvedValue(stubBuiResponse);

    const result = await service.getArchetypeDetails(archetypeList[0]);

    // (30×1.8 + 25×1.4 + 15×1.6 + 15×1.6) / (30+25+15+15) = 137/85 ≈ 1.6118
    expect(result.thermalProperties.wallUValue).toBeCloseTo(137 / 85, 2);
  });

  test("getArchetypeDetails identifies wall surfaces by cardinal names", async () => {
    mockGetArchetypeDetails.mockResolvedValue(stubBuiResponse);

    const result = await service.getArchetypeDetails(archetypeList[0]);

    // Roof U-value should only come from the roof surface (0.9)
    expect(result.thermalProperties.roofUValue).toBeCloseTo(0.9, 2);

    // Window U-value: area-weighted (8×3.0 + 12×2.6) / 20 = 55.2/20 = 2.76
    expect(result.thermalProperties.windowUValue).toBeCloseTo(2.76, 2);

    // Wall U-value must NOT include roof (0.9) or windows
    expect(result.thermalProperties.wallUValue).not.toBeCloseTo(0.9, 1);
  });

  test("findMatchingArchetype filters by country+category using coords", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    // Coords near Athens → should prefer Greek SFH
    const result = await service.findMatchingArchetype("SFH", null, {
      lat: 37.98,
      lng: 23.73,
    });

    expect(result).not.toBeNull();
    expect(result!.archetype.country).toBe("Greece");
    expect(result!.archetype.category).toBe("SFH");
    expect(result!.detectedCountry).toBe("Greece");
    expect(result!.matchQuality).toBeDefined();
    expect(result!.alternatives.length).toBeGreaterThan(0);
  });

  test("findMatchingArchetype prioritizes same-country over geographic proximity", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    // Coords near Rome → should prefer Italian SFH even though Greek SFH
    // may have a closer period match
    const result = await service.findMatchingArchetype("SFH", "1961-1980", {
      lat: 41.9,
      lng: 12.5,
    });

    expect(result).not.toBeNull();
    expect(result!.archetype.country).toBe("Italy");
    expect(result!.detectedCountry).toBe("Italy");
    expect(result!.scoreBreakdown.countryScore).toBe(1.0);
  });

  test("detectCountryFromCoords returns null outside supported EU polygons", () => {
    expect(
      service.detectCountryFromCoords({
        lat: 47.3769,
        lng: 8.5417,
      }),
    ).toBeNull();
  });

  test("findMatchingArchetype treats hyphen and en dash as the same period", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    const result = await service.findMatchingArchetype("SFH", "1961–1980", {
      lat: 37.98,
      lng: 23.73,
    });

    expect(result).not.toBeNull();
    expect(result!.matchQuality).toBe("excellent");
    expect(result!.periodRelaxed).toBe(false);
  });

  test("findMatchingArchetype reports periodRelaxed when no exact period match", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    // Request a period that doesn't exist for Italian SFH
    const result = await service.findMatchingArchetype("SFH", "1981-2000", {
      lat: 41.9,
      lng: 12.5,
    });

    expect(result).not.toBeNull();
    // Italian archetype only has 1961-1980, so period is relaxed
    // but country still wins
    expect(result!.archetype.country).toBe("Italy");
    expect(result!.periodRelaxed).toBe(true);
  });

  test("findMatchingArchetype returns excellent quality for same country + exact period", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    const result = await service.findMatchingArchetype("SFH", "1961-1980", {
      lat: 37.98,
      lng: 23.73,
    });

    expect(result).not.toBeNull();
    expect(result!.matchQuality).toBe("excellent");
    expect(result!.periodRelaxed).toBe(false);
  });

  test("getAvailablePeriods falls back to all-country periods when the requested country has no archetypes", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    // "Portugal" has no archetypes in the stub list — should fall back to all
    // SFH periods across all countries (1961-1980 and 1981-2000)
    const result = await service.getAvailablePeriods("SFH", "Portugal");

    expect(result.periods).toContain("1961-1980");
    expect(result.periods).toContain("1981-2000");
    expect(result.periods.length).toBeGreaterThan(0);
    expect(result.scope).toBe("fallback");
    expect(result.reason).toBe("no-local-archetypes");
    expect(result.recommendedPeriod).toBeTruthy();
  });

  test("getAvailablePeriods returns only local periods when country has archetypes", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    // Greece has both 1961-1980 and 1981-2000 SFH archetypes
    const result = await service.getAvailablePeriods("SFH", "Greece");

    expect(result.periods).toContain("1961-1980");
    expect(result.periods).toContain("1981-2000");
    expect(result.scope).toBe("local");

    // Italy only has 1961-1980 SFH
    const italyResult = await service.getAvailablePeriods("SFH", "Italy");
    expect(italyResult.periods).toEqual(["1961-1980"]);
    expect(italyResult.periods).not.toContain("1981-2000");
    expect(italyResult.recommendedPeriod).toBe("1961-1980");
  });

  test("getAvailablePeriods normalizes country aliases", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    const result = await service.getAvailablePeriods("SFH", "Czech Republic");

    expect(result.periods).toEqual(["1961-1980"]);
    expect(result.detectedCountry).toBe("Czechia");
    expect(result.reason).toBe("normalized-country-alias");
    expect(result.scope).toBe("local");
  });

  test("countMatchingArchetypes normalizes country aliases", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    const count = await service.countMatchingArchetypes(
      "SFH",
      "1961-1980",
      "Czech Republic",
    );

    expect(count).toBe(1);
  });

  test("countMatchingArchetypes treats hyphen and en dash as the same period", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    const count = await service.countMatchingArchetypes(
      "SFH",
      "1961–1980",
      "Greece",
    );

    expect(count).toBe(1);
  });

  test("findMatchingArchetype gives partial period score for adjacent (non-exact) period", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    // Request 1981-2000 with Italian coords. Italy only has 1961-1980.
    // The period score for IT_SFH_1961_1980 should be between 0 and 1
    // (not exact but neighbouring), so periodRelaxed is true and
    // the score breakdown still assigns a non-zero period score.
    const result = await service.findMatchingArchetype("SFH", "1981-2000", {
      lat: 41.9,
      lng: 12.5,
    });

    expect(result).not.toBeNull();
    expect(result!.periodRelaxed).toBe(true);
    expect(result!.scoreBreakdown.periodScore).toBeGreaterThan(0);
    expect(result!.scoreBreakdown.periodScore).toBeLessThan(1);
  });

  test("findMatchingArchetype keeps working when country detection returns null", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    const result = await service.findMatchingArchetype("SFH", "1961-1980", {
      lat: 47.3769,
      lng: 8.5417,
    });

    expect(result).not.toBeNull();
    expect(result!.detectedCountry).toBeNull();
  });

  test("getOptions derives unique countries and categories", async () => {
    mockListArchetypes.mockResolvedValue(archetypeList);

    const options = await service.getOptions();

    const countries = options.countries.map((c) => c.value);
    expect(countries).toEqual(["Czechia", "Greece", "Italy"]);

    const categories = options.buildingTypes.map((t) => t.value);
    expect(categories).toContain("MFH");
    expect(categories).toContain("SFH");
  });
});
