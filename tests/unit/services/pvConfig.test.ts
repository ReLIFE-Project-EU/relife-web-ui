import { describe, expect, test } from "vitest";

import {
  modeledPvKwp,
  pvKwpFromRoofArea,
} from "../../../src/services/pvConfig";

describe("pvKwpFromRoofArea", () => {
  test("derives PV capacity from roof area with min and max bounds", () => {
    expect(pvKwpFromRoofArea(50)).toBe(3);
    expect(pvKwpFromRoofArea(85)).toBeCloseTo(3.825, 3);
    expect(pvKwpFromRoofArea(120)).toBeCloseTo(5.4, 1);
    expect(pvKwpFromRoofArea(2500)).toBe(100);
  });

  test("returns null when roof area cannot support PV sizing", () => {
    expect(pvKwpFromRoofArea(null)).toBeNull();
    expect(pvKwpFromRoofArea(0)).toBeNull();
    expect(pvKwpFromRoofArea(-10)).toBeNull();
    expect(pvKwpFromRoofArea(Number.NaN)).toBeNull();
  });
});

describe("modeledPvKwp", () => {
  // Clamping the whole roof before taking the share keeps a flat's PV cost
  // equal to the output it is credited with, instead of a 3 kWp minimum.
  test("takes the home's share after clamping the whole roof", () => {
    expect(
      modeledPvKwp({ roofArea: 50, archetypeFloorArea: 400 }, 100),
    ).toBeCloseTo(0.75, 3);
  });
});
