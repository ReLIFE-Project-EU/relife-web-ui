import { describe, expect, test } from "vitest";

import {
  buildRenovationActions,
  packageUsesHeatingStopgap,
} from "../../../src/services/renovationActions";

const surfaceAreas = {
  wallM2: 200,
  roofM2: 80,
  floorM2: 80,
  windowM2: 25,
};

describe("buildRenovationActions", () => {
  test("maps envelope measures to area-based actions using surface areas", () => {
    const actions = buildRenovationActions({
      measureIds: ["wall-insulation", "roof-insulation", "windows"],
      surfaceAreas,
      floorArea: 100,
      pvKwp: null,
    });

    expect(actions).toEqual([
      { action: "Wall insulation", area_m2: 200 },
      { action: "Roof insulation - Accessible", area_m2: 80 },
      { action: "Windows", area_m2: 25 },
    ]);
  });

  test("maps PV to the given array size", () => {
    const actions = buildRenovationActions({
      measureIds: ["pv"],
      surfaceAreas,
      floorArea: 120,
      pvKwp: 5.4,
    });

    expect(actions).toEqual([{ action: "PV", capacity_kw: 5.4 }]);
  });

  test("maps heat pump to the HVAC stopgap capacity", () => {
    const actions = buildRenovationActions({
      measureIds: ["air-water-heat-pump"],
      surfaceAreas,
      floorArea: 120,
      pvKwp: null,
    });

    expect(actions).toEqual([
      { action: "Air-water Heat Pump", capacity_kw: 6 },
    ]);
  });

  test("skips area-based actions with non-positive surface area", () => {
    const actions = buildRenovationActions({
      measureIds: ["wall-insulation"],
      surfaceAreas: { ...surfaceAreas, wallM2: 0 },
      floorArea: 100,
      pvKwp: null,
    });

    expect(actions).toEqual([]);
  });

  test("skips capacity actions when their size is unavailable", () => {
    const actions = buildRenovationActions({
      measureIds: ["pv", "air-water-heat-pump"],
      surfaceAreas,
      floorArea: null,
      pvKwp: null,
    });

    expect(actions).toEqual([]);
  });

  test("ignores unsupported measures (solar-thermal)", () => {
    const actions = buildRenovationActions({
      measureIds: ["solar-thermal"],
      surfaceAreas,
      floorArea: 100,
      pvKwp: null,
    });

    expect(actions).toEqual([]);
  });
});

describe("packageUsesHeatingStopgap", () => {
  test("is true when a heat pump or boiler is present", () => {
    expect(packageUsesHeatingStopgap(["wall-insulation"])).toBe(false);
    expect(
      packageUsesHeatingStopgap(["wall-insulation", "air-water-heat-pump"]),
    ).toBe(true);
    expect(packageUsesHeatingStopgap(["condensing-boiler"])).toBe(true);
    expect(packageUsesHeatingStopgap(["pv"])).toBe(false);
  });
});
