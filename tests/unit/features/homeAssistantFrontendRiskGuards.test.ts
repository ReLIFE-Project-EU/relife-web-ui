import { describe, expect, test } from "vitest";
import {
  buildMatchDeltaMessages,
  buildPeriodFallbackMessage,
  extractArchetypePeriod,
} from "../../../src/features/home-assistant/components/building/archetypeUiMessaging";
import type {
  ArchetypeMatchResult,
  PeriodAvailabilityResult,
} from "../../../src/services/types";
import type { ArchetypeDetails } from "../../../src/types/archetype";

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
  test("extractArchetypePeriod parses pre-1945 archetypes for UI messaging", () => {
    expect(extractArchetypePeriod("FR_SFH_0_1945")).toBe("Pre-1945");
  });

  test("buildMatchDeltaMessages stays silent for formatting-only period differences", () => {
    const messages = buildMatchDeltaMessages(
      createMatchResult(),
      createDetails({
        name: "FR_SFH_1980_1989",
      }),
      "1980-1989",
    );

    expect(messages).toEqual([]);
  });

  test("buildMatchDeltaMessages warns when the matched archetype is genuinely pre-1945", () => {
    const messages = buildMatchDeltaMessages(
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

    expect(messages).toContain(
      "Construction period: you selected 1980-1989, but the closest available archetype period is Pre-1945.",
    );
  });

  test("buildMatchDeltaMessages only reports the real delta for foreign fallback matches", () => {
    const messages = buildMatchDeltaMessages(
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

    expect(messages).toEqual([
      "Country: your building is in France, but no suitable local Single Family House archetype was available for the selected period, so a Hungary reference home was used.",
    ]);
  });

  test("buildPeriodFallbackMessage explains widened period selection without blocking the user", () => {
    const result: PeriodAvailabilityResult = {
      periods: ["1980-1989", "1990-1999"],
      recommendedPeriod: "1980-1989",
      detectedCountry: "France",
      sourceCountry: "Hungary",
      scope: "fallback",
      reason: "no-local-periods",
    };

    expect(buildPeriodFallbackMessage(result, "Single Family House")).toEqual({
      title:
        "No Single Family House archetypes in France for the selected period",
      body: "France has Single Family House archetypes, but not for the selected construction period. We'll use the closest available reference from the wider European catalog. Review the matched country and period in the archetype card before continuing.",
    });
  });
});
