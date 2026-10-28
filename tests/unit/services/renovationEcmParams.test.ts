import { describe, expect, test } from "vitest";

import { buildECMParams } from "../../../src/services/renovationEcmParams";
import { PV_DEFAULTS, pvKwpFromRoofArea } from "../../../src/services/pvConfig";
import type { SimulatedBuilding } from "../../../src/services/simulatedBuilding";
import type { BuildingPayload } from "../../../src/types/archetype";

const ROOF_AREA = 100;

function buiWithRoof(roofArea: number): BuildingPayload {
  return {
    building: { net_floor_area: 100 },
    building_surface:
      roofArea > 0
        ? [
            {
              name: "Roof",
              type: "opaque",
              area: roofArea,
              u_value: 1,
              sky_view_factor: 1,
              orientation: { azimuth: 0, tilt: 0 },
            },
          ]
        : [],
  } as unknown as BuildingPayload;
}

const archetypeContext: SimulatedBuilding = {
  archetype: {
    country: "Greece",
    category: "SFH",
    name: "GR_SFH_1961_1980",
  },
  bui: buiWithRoof(ROOF_AREA),
  modeledFloorArea: 100,
};

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
        pv_kwp: pvKwpFromRoofArea(ROOF_AREA),
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
        pv_kwp: pvKwpFromRoofArea(ROOF_AREA),
      }),
    );
    expect(params).not.toHaveProperty("include_baseline");
  });

  test("throws when PV is requested for a building without a roof", () => {
    expect(() =>
      buildECMParams(["pv"], { ...archetypeContext, bui: buiWithRoof(0) }),
    ).toThrow("PV measure requires a simulated roof area");
  });

  test("returns custom-building ECM params for an adjusted archetype", () => {
    const modifiedBui = buiWithRoof(ROOF_AREA);
    const modifiedSystem = { heating: "custom" };
    const uni11300Config = {
      input_unit: "Wh",
      heating_params: {},
      cooling_params: {},
    };

    const params = buildECMParams(["wall-insulation"], {
      ...archetypeContext,
      bui: modifiedBui,
      adjustment: { system: modifiedSystem, uni11300Config },
    });

    expect(params).toEqual(
      expect.objectContaining({
        bui: modifiedBui,
        system: modifiedSystem,
        uni11300Config,
        scenario_elements: "wall",
        u_wall: 0.25,
      }),
    );
    expect(params).not.toHaveProperty("category");
    expect(params).not.toHaveProperty("country");
    expect(params).not.toHaveProperty("name");
  });

  test("rejects a modified building without its UNI settings", () => {
    expect(() =>
      buildECMParams([], {
        ...archetypeContext,
        adjustment: { system: {}, uni11300Config: undefined },
      }),
    ).toThrow("missing its archetype UNI/TS 11300 settings");
  });

  test("returns archetype ECM params for a catalogue archetype", () => {
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
