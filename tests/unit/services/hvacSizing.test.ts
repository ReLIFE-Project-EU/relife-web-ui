import { describe, expect, test } from "vitest";

import { heatingCapacityKwFromFloorArea } from "../../../src/services/hvacSizing";

describe("heatingCapacityKwFromFloorArea", () => {
  test("derives heating capacity from floor area with min and max bounds", () => {
    // 0.05 kW/m², clamped to [3, 50].
    expect(heatingCapacityKwFromFloorArea(40)).toBe(3); // below min → clamped
    expect(heatingCapacityKwFromFloorArea(120)).toBeCloseTo(6, 5);
    expect(heatingCapacityKwFromFloorArea(2000)).toBe(50); // above max → clamped
  });

  test("returns null when floor area cannot support sizing", () => {
    expect(heatingCapacityKwFromFloorArea(null)).toBeNull();
    expect(heatingCapacityKwFromFloorArea(0)).toBeNull();
    expect(heatingCapacityKwFromFloorArea(-10)).toBeNull();
    expect(heatingCapacityKwFromFloorArea(Number.NaN)).toBeNull();
  });
});
