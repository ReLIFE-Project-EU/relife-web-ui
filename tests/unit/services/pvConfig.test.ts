import { describe, expect, test } from "vitest";

import { pvKwpFromRoofArea } from "../../../src/services/pvConfig";

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
