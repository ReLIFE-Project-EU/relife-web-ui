import { describe, expect, test } from "vitest";
import {
  buildGeneratedBuildingName,
  getArchetypePeriod,
} from "../../../src/components/building-selector/buildingSelectorUtils";
import { buildMatchFallbackText } from "../../../src/components/building-selector/matchMessages";
import type { ArchetypeMatchResult } from "../../../src/services/types";
import type { ArchetypeDetails } from "../../../src/types/archetype";
import type { BuildingSelectorSelection } from "../../../src/components/building-selector";

function createMatchResult(
  overrides: Partial<ArchetypeMatchResult> = {},
): ArchetypeMatchResult {
  return {
    archetype: {
      category: "Single Family House",
      country: "France",
      name: "FR_SFH_1980_1989",
    },
    detectedCountry: "France",
    matchQuality: "excellent",
    periodRelaxed: false,
    score: 111,
    scoreBreakdown: {
      countryScore: 1,
      periodScore: 1,
      geoScore: 1,
      total: 111,
    },
    alternatives: [],
    ...overrides,
  };
}

function createDetails(
  overrides: Partial<ArchetypeDetails> = {},
): ArchetypeDetails {
  return {
    category: "Single Family House",
    country: "France",
    name: "FR_SFH_1980_1989",
    floorArea: 120,
    numberOfFloors: 2,
    floorHeight: 2.8,
    totalWindowArea: 18,
    thermalProperties: {
      wallUValue: 1.2,
      roofUValue: 0.8,
      windowUValue: 2.2,
    },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 17,
      coolingSetpoint: 26,
      coolingSetback: 30,
    },
    location: {
      lat: 48.8566,
      lng: 2.3522,
    },
    bui: {} as ArchetypeDetails["bui"],
    system: {} as ArchetypeDetails["system"],
    ...overrides,
  };
}

describe("home assistant frontend risk guards", () => {
  test("getArchetypePeriod parses pre-1945 archetypes for UI messaging", () => {
    expect(getArchetypePeriod({ name: "FR_SFH_0_1945" })).toBe("pre-1945");
  });

  test("buildMatchFallbackText stays silent for exact matches", () => {
    const message = buildMatchFallbackText(
      createMatchResult(),
      createDetails({
        name: "FR_SFH_1980_1989",
      }),
      "1980-1989",
    );

    expect(message).toBeNull();
  });

  test("buildMatchFallbackText warns when the matched archetype is genuinely pre-1945", () => {
    const message = buildMatchFallbackText(
      createMatchResult({
        matchQuality: "approximate",
        periodRelaxed: true,
        scoreBreakdown: {
          countryScore: 1,
          periodScore: 0.2,
          geoScore: 1,
          total: 103,
        },
      }),
      createDetails({
        name: "FR_SFH_0_1945",
      }),
      "1980-1989",
    );

    expect(message).toContain(
      "The selected period is 1980-1989; the closest available reference period is pre-1945.",
    );
  });

  test("buildMatchFallbackText reports country deltas for foreign fallback matches", () => {
    const message = buildMatchFallbackText(
      createMatchResult({
        archetype: {
          category: "Single Family House",
          country: "Hungary",
          name: "HU_SFH_1980_1989",
        },
        detectedCountry: "France",
        matchQuality: "approximate",
        scoreBreakdown: {
          countryScore: 0,
          periodScore: 1,
          geoScore: 0.7,
          total: 10.7,
        },
      }),
      createDetails({
        country: "Hungary",
        name: "HU_SFH_1980_1989",
      }),
      "1980-1989",
    );

    expect(message).toContain(
      "The building is in France, but the closest available reference is from Hungary.",
    );
  });

  test("buildGeneratedBuildingName creates a usable default PRA row name", () => {
    const selection = {
      mode: "browse",
      coords: { lat: 48.8566, lng: 2.3522 },
      country: "France",
      category: "Single Family House",
      constructionPeriod: "1980-1989",
      archetype: {
        category: "Single Family House",
        country: "France",
        name: "FR_SFH_1980_1989",
      },
      details: createDetails(),
      floorArea: 120,
      numberOfFloors: 2,
      floorHeight: 2.8,
    } satisfies BuildingSelectorSelection;

    expect(buildGeneratedBuildingName(selection)).toBe(
      "Reference building - France - Single Family House - 1980-1989",
    );
  });
});
