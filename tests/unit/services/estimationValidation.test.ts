import { describe, expect, test } from "vitest";

import { ArchetypeMatchStrategy } from "../../../src/services/archetypeMatching";
import { validateEstimation } from "../../../src/services/estimationValidation";
import type {
  BuildingInfo,
  EstimationResult,
} from "../../../src/types/renovation";

function makeBuilding(overrides: Partial<BuildingInfo> = {}): BuildingInfo {
  return {
    country: "Greece",
    lat: 37.9838,
    lng: 23.7275,
    buildingType: "Multi family House",
    constructionPeriod: "1971-1990",
    isModified: false,
    floorArea: 4200,
    numberOfFloors: 8,
    climateZone: "",
    heatingTechnology: "",
    coolingTechnology: "",
    hotWaterTechnology: "",
    numberOfOpenings: null,
    glazingTechnology: "",
    constructionYear: 1980,
    floorNumber: 4,
    projectLifetime: 20,
    renovatedLast5Years: false,
    ...overrides,
  };
}

function makeEstimation(
  strategy: ArchetypeMatchStrategy,
  archetypeFloorArea: number,
  overrides: Partial<EstimationResult["archetype"]> = {},
): EstimationResult {
  return {
    estimatedEPC: "G",
    annualEnergyNeeds: 0,
    heatingCoolingNeeds: 0,
    heatingDemand: 0,
    coolingDemand: 0,
    flexibilityIndex: 50,
    comfortIndex: 50,
    annualEnergyConsumption: 0,
    archetypeFloorArea,
    archetype: {
      category: "Single Family House",
      country: "Greece",
      name: "SFH_Greece_1946_1969",
      matchStrategy: strategy,
      ...overrides,
    },
  };
}

describe("validateEstimation", () => {
  test("EXACT_FULL with a 1× scale factor is ok", () => {
    const diagnostic = validateEstimation(
      makeEstimation(ArchetypeMatchStrategy.EXACT_FULL, 4200),
      makeBuilding({ floorArea: 4200 }),
    );
    expect(diagnostic.level).toBe("ok");
    expect(diagnostic.reasons).toHaveLength(0);
    expect(diagnostic.remediation).toBe("");
  });

  test("COUNTRY_ANY_CATEGORY is always unusable", () => {
    const diagnostic = validateEstimation(
      makeEstimation(ArchetypeMatchStrategy.COUNTRY_ANY_CATEGORY, 4200),
      makeBuilding({ floorArea: 4200 }),
    );
    expect(diagnostic.level).toBe("unusable");
    expect(diagnostic.reasons[0].code).toBe("strategy");
    expect(diagnostic.remediation).toContain("Greece");
    expect(diagnostic.remediation).toContain("Multi family House");
  });

  test("Athens-shaped 33.6× scale factor is unusable on both axes", () => {
    const diagnostic = validateEstimation(
      makeEstimation(ArchetypeMatchStrategy.COUNTRY_ANY_CATEGORY, 125),
      makeBuilding({ floorArea: 4200 }),
    );
    expect(diagnostic.level).toBe("unusable");
    expect(diagnostic.areaScaleFactor).toBeCloseTo(33.6, 5);
    const codes = diagnostic.reasons.map((r) => r.code);
    expect(codes).toContain("strategy");
    expect(codes).toContain("scale");
  });

  test("EXACT_CATEGORY_PERIOD_MISMATCH at 2× scale is low-confidence", () => {
    const diagnostic = validateEstimation(
      makeEstimation(
        ArchetypeMatchStrategy.EXACT_CATEGORY_PERIOD_MISMATCH,
        125,
      ),
      makeBuilding({ floorArea: 250 }),
    );
    expect(diagnostic.level).toBe("low-confidence");
    expect(diagnostic.reasons[0].code).toBe("period-gap");
  });

  test("scale factor 6× alone is low-confidence", () => {
    const diagnostic = validateEstimation(
      makeEstimation(ArchetypeMatchStrategy.EXACT_FULL, 100),
      makeBuilding({ floorArea: 600 }),
    );
    expect(diagnostic.level).toBe("low-confidence");
    expect(diagnostic.reasons[0].code).toBe("scale");
  });

  test("scale factor 11× alone is unusable", () => {
    const diagnostic = validateEstimation(
      makeEstimation(ArchetypeMatchStrategy.EXACT_FULL, 100),
      makeBuilding({ floorArea: 1100 }),
    );
    expect(diagnostic.level).toBe("unusable");
    expect(diagnostic.reasons[0].code).toBe("scale");
  });

  test("REGION_ANY_MATCH is unusable", () => {
    const diagnostic = validateEstimation(
      makeEstimation(ArchetypeMatchStrategy.REGION_ANY_MATCH, 4200),
      makeBuilding({ floorArea: 4200 }),
    );
    expect(diagnostic.level).toBe("unusable");
  });

  test("REGION_CATEGORY_MATCH is low-confidence", () => {
    const diagnostic = validateEstimation(
      makeEstimation(ArchetypeMatchStrategy.REGION_CATEGORY_MATCH, 4200),
      makeBuilding({ floorArea: 4200 }),
    );
    expect(diagnostic.level).toBe("low-confidence");
  });

  test("missing archetype data degrades gracefully without crashing", () => {
    const estimation: EstimationResult = {
      estimatedEPC: "G",
      annualEnergyNeeds: 0,
      heatingCoolingNeeds: 0,
      heatingDemand: 0,
      coolingDemand: 0,
      flexibilityIndex: 50,
      comfortIndex: 50,
      annualEnergyConsumption: 0,
      archetypeFloorArea: 0,
    };
    const diagnostic = validateEstimation(estimation, makeBuilding());
    expect(diagnostic.level).toBe("ok");
    expect(diagnostic.strategy).toBe(ArchetypeMatchStrategy.USER_SELECTED);
  });
});
