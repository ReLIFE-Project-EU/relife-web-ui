import { describe, expect, test } from "vitest";

import {
  RSE_MVP_MEASURE_COST_ASSUMPTIONS,
  RSE_MVP_PACKAGE_MEASURE_IDS,
  RSE_PACKAGE_IDS,
} from "../../../../src/features/strategy-explorer/constants";
import type { RenovationMeasureId } from "../../../../src/types/renovation";

const validMeasureIds: readonly RenovationMeasureId[] = [
  "wall-insulation",
  "roof-insulation",
  "floor-insulation",
  "windows",
  "air-water-heat-pump",
  "condensing-boiler",
  "pv",
  "solar-thermal",
];

describe("RSE constants", () => {
  test("every measure in RSE_MVP_MEASURE_COST_ASSUMPTIONS is a valid RenovationMeasureId", () => {
    for (const measureId of Object.keys(RSE_MVP_MEASURE_COST_ASSUMPTIONS)) {
      expect(validMeasureIds).toContain(measureId as RenovationMeasureId);
    }
  });

  test("every measure in RSE_MVP_PACKAGE_MEASURE_IDS is a valid RenovationMeasureId", () => {
    for (const measureIds of Object.values(RSE_MVP_PACKAGE_MEASURE_IDS)) {
      for (const measureId of measureIds) {
        expect(validMeasureIds).toContain(measureId);
      }
    }
  });

  test("RSE_PACKAGE_IDS and RSE_MVP_PACKAGE_MEASURE_IDS keys match", () => {
    expect([...RSE_PACKAGE_IDS].sort()).toEqual(
      Object.keys(RSE_MVP_PACKAGE_MEASURE_IDS).sort(),
    );
  });
});
