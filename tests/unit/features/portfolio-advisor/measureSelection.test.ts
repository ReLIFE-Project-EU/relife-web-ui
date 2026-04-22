import { describe, expect, test } from "vitest";

import { getPortfolioMeasureStatus } from "../../../../src/features/portfolio-advisor/utils/measureSelection";
import type { PRABuilding } from "../../../../src/features/portfolio-advisor/context/types";
import type { RenovationMeasureId } from "../../../../src/types/renovation";

const analysisEligibleMeasureIds: RenovationMeasureId[] = [
  "wall-insulation",
  "roof-insulation",
  "windows",
  "floor-insulation",
  "condensing-boiler",
  "air-water-heat-pump",
  "pv",
];

function createBuilding(
  id: string,
  overrides?: Partial<PRABuilding>,
): PRABuilding {
  return {
    id,
    name: `Building ${id}`,
    source: "manual",
    category: "SFH",
    country: "Greece",
    lat: 37.98,
    lng: 23.73,
    floorArea: 100,
    constructionPeriod: "1961-1980",
    numberOfFloors: 2,
    propertyType: "apartment",
    validationStatus: "valid",
    ...overrides,
  };
}

describe("getPortfolioMeasureStatus", () => {
  test("accepts system-only global selections as valid", () => {
    const status = getPortfolioMeasureStatus(
      [createBuilding("1")],
      ["condensing-boiler"],
      analysisEligibleMeasureIds,
    );

    expect(status.hasValidSelections).toBe(true);
    expect(status.buildingsWithoutAnalysisEligibleMeasures).toHaveLength(0);
  });

  test("allows per-building mixed overrides", () => {
    const status = getPortfolioMeasureStatus(
      [
        createBuilding("1", {
          selectedMeasures: ["wall-insulation", "air-water-heat-pump"],
        }),
      ],
      ["windows"],
      analysisEligibleMeasureIds,
    );

    expect(status.hasValidSelections).toBe(true);
    expect(status.effectiveSelections[0]).toEqual({
      name: "Building 1",
      measures: ["wall-insulation", "air-water-heat-pump"],
    });
  });

  test("rejects empty effective selections", () => {
    const status = getPortfolioMeasureStatus(
      [createBuilding("1")],
      [],
      analysisEligibleMeasureIds,
    );

    expect(status.hasValidSelections).toBe(false);
    expect(status.buildingsWithoutMeasures).toHaveLength(1);
  });

  test("accepts PV as an analyzable selection", () => {
    const status = getPortfolioMeasureStatus(
      [createBuilding("1", { selectedMeasures: ["pv"] })],
      ["windows"],
      analysisEligibleMeasureIds,
    );

    expect(status.hasValidSelections).toBe(true);
    expect(status.buildingsWithoutAnalysisEligibleMeasures).toHaveLength(0);
  });

  test("rejects selections with no analyzable measures", () => {
    const status = getPortfolioMeasureStatus(
      [createBuilding("1", { selectedMeasures: ["solar-thermal"] })],
      ["windows"],
      analysisEligibleMeasureIds,
    );

    expect(status.hasValidSelections).toBe(false);
    expect(status.buildingsWithoutAnalysisEligibleMeasures).toEqual([
      {
        name: "Building 1",
        measures: ["solar-thermal"],
      },
    ]);
  });
});
