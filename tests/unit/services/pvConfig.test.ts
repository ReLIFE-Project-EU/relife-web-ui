import { describe, expect, test } from "vitest";

import { pvKwpFromFloorArea } from "../../../src/services/pvConfig";

describe("pvKwpFromFloorArea", () => {
  test("derives PV capacity from floor area with min and max bounds", () => {
    expect(pvKwpFromFloorArea(50)).toBe(3);
    expect(pvKwpFromFloorArea(85)).toBeCloseTo(3.825, 3);
    expect(pvKwpFromFloorArea(120)).toBeCloseTo(5.4, 1);
    expect(pvKwpFromFloorArea(2500)).toBe(100);
  });

  test("returns null when floor area cannot support PV sizing", () => {
    expect(pvKwpFromFloorArea(null)).toBeNull();
    expect(pvKwpFromFloorArea(0)).toBeNull();
    expect(pvKwpFromFloorArea(-10)).toBeNull();
    expect(pvKwpFromFloorArea(Number.NaN)).toBeNull();
  });
});
