import { describe, expect, test } from "vitest";

import { RSE_PACKAGES } from "../../../../../src/features/strategy-explorer/services/rsePackageCatalog";

describe("RSE_PACKAGES", () => {
  test("contains all four MVP packages", () => {
    expect(Object.keys(RSE_PACKAGES).sort()).toEqual([
      "combined",
      "envelope",
      "systems-boiler",
      "systems-heat-pump",
    ]);
  });

  test("envelope package contains only envelope measures", () => {
    const pkg = RSE_PACKAGES.envelope;
    expect(pkg.measureIds).toEqual([
      "wall-insulation",
      "roof-insulation",
      "floor-insulation",
      "windows",
    ]);
  });

  test("combined package contains envelope + heat pump + pv", () => {
    const pkg = RSE_PACKAGES.combined;
    expect(pkg.measureIds).toEqual([
      "wall-insulation",
      "roof-insulation",
      "floor-insulation",
      "windows",
      "air-water-heat-pump",
      "pv",
    ]);
  });
});
