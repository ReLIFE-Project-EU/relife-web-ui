import { describe, expect, test } from "vitest";

import { buildECMParams } from "../../../src/services/renovationEcmParams";
import {
  PV_DEFAULTS,
  pvKwpFromFloorArea,
} from "../../../src/services/pvConfig";

const archetypeContext = {
  kind: "archetype",
  archetype: {
    country: "Greece",
    category: "SFH",
    name: "GR_SFH_1961_1980",
  },
  floorArea: 100,
} as const;

describe("buildECMParams", () => {
  test("maps envelope measures to Forecasting scenario elements and U-values", () => {
    const params = buildECMParams(
      ["wall-insulation", "roof-insulation", "floor-insulation", "windows"],
      archetypeContext,
    );

    expect(params).toEqual(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
        scenario_elements: "wall,roof,slab,window",
        u_wall: 0.25,
        u_roof: 0.2,
        u_slab: 0.25,
        u_window: 1.4,
      }),
    );
  });

  test("maps condensing boiler scenarios and requests a baseline", () => {
    const params = buildECMParams(["condensing-boiler"], archetypeContext);

    expect(params).toEqual(
      expect.objectContaining({
        uni_generation_mode: "condensing_boiler",
        include_baseline: true,
      }),
    );
  });

  test("maps air-water heat pump scenarios and requests a baseline", () => {
    const params = buildECMParams(["air-water-heat-pump"], archetypeContext);

    expect(params).toEqual(
      expect.objectContaining({
        use_heat_pump: true,
        heat_pump_cop: 3.2,
        include_baseline: true,
      }),
    );
  });

  test("maps PV scenarios from floor area and PV defaults", () => {
    const params = buildECMParams(["pv"], archetypeContext);

    expect(params).toEqual(
      expect.objectContaining({
        use_pv: true,
        pv_kwp: pvKwpFromFloorArea(archetypeContext.floorArea),
        pv_tilt_deg: PV_DEFAULTS.tiltDeg,
        pv_azimuth_deg: PV_DEFAULTS.azimuthDeg,
        pv_use_pvgis: PV_DEFAULTS.usePvgis,
        pv_pvgis_loss_percent: PV_DEFAULTS.pvgisLossPercent,
        annual_pv_yield_kwh_per_kwp: PV_DEFAULTS.annualYieldKwhPerKwp,
      }),
    );
    expect(params).not.toHaveProperty("scenario_elements");
    expect(params).not.toHaveProperty("include_baseline");
  });

  test("merges envelope, heat pump, and PV measures into one ECM request", () => {
    const params = buildECMParams(
      ["wall-insulation", "air-water-heat-pump", "pv"],
      archetypeContext,
    );

    expect(params).toEqual(
      expect.objectContaining({
        scenario_elements: "wall",
        u_wall: 0.25,
        use_heat_pump: true,
        heat_pump_cop: 3.2,
        use_pv: true,
        pv_kwp: pvKwpFromFloorArea(archetypeContext.floorArea),
      }),
    );
    expect(params).not.toHaveProperty("include_baseline");
  });

  test("throws when PV requires a missing or invalid floor area", () => {
    const invalidFloorAreas: Array<number | null> = [null, 0, Number.NaN, -1];

    for (const floorArea of invalidFloorAreas) {
      expect(() =>
        buildECMParams(["pv"], {
          ...archetypeContext,
          floorArea,
        }),
      ).toThrow("PV measure requires a valid archetype floor area");
    }
  });

  test("returns custom-building ECM params when a modified BUI is supplied", () => {
    const modifiedBui = { building: { net_floor_area: 100 } };
    const modifiedSystem = { heating: "custom" };

    const params = buildECMParams(["wall-insulation"], {
      kind: "custom",
      modifiedBui,
      modifiedSystem,
      floorArea: 100,
    });

    expect(params).toEqual(
      expect.objectContaining({
        bui: modifiedBui,
        system: modifiedSystem,
        scenario_elements: "wall",
        u_wall: 0.25,
      }),
    );
    expect(params).not.toHaveProperty("category");
    expect(params).not.toHaveProperty("country");
    expect(params).not.toHaveProperty("name");
  });

  test("returns archetype ECM params when archetype context is supplied", () => {
    const params = buildECMParams(["wall-insulation"], archetypeContext);

    expect(params).toEqual(
      expect.objectContaining({
        category: "SFH",
        country: "Greece",
        name: "GR_SFH_1961_1980",
        scenario_elements: "wall",
        u_wall: 0.25,
      }),
    );
    expect(params).not.toHaveProperty("bui");
  });
});
