import { describe, expect, test } from "vitest";

import { estimatePackageEmbodiedCarbonFromBui } from "../../../src/services/embodiedCarbon";
import type {
  BuildingPayload,
  BuildingSurface,
} from "../../../src/types/archetype";
import type { RenovationMeasureId } from "../../../src/types/renovation";

function surface(
  name: string,
  type: BuildingSurface["type"],
  area: number,
  uValue: number,
): BuildingSurface {
  return {
    name,
    type,
    area,
    u_value: uValue,
    sky_view_factor: name.toLowerCase().includes("slab") ? 0 : 0.5,
    orientation: { azimuth: 0, tilt: 90 },
  };
}

function bui(surfaces: BuildingSurface[]): BuildingPayload {
  // Only building_surface is read; cast the minimal fixture accordingly.
  return { building_surface: surfaces } as unknown as BuildingPayload;
}

describe("estimatePackageEmbodiedCarbonFromBui", () => {
  test("picks the insulation thickness the wall's U-value target demands", () => {
    // Wall target is 0.25 W/m²K → R 4.0. A baseline of 0.8 already supplies
    // R 1.25, leaving R 2.75 for the panel: the thinnest EPS row clearing that
    // is 100 mm (R 2.88) at 6.74 kgCO₂e/m².
    const modest = estimatePackageEmbodiedCarbonFromBui({
      bui: bui([surface("Wall", "opaque", 100, 0.8)]),
      floorArea: 120,
      measureIds: ["wall-insulation"],
    });
    expect(modest).toBeCloseTo(674, 0);

    // A worse wall needs a thicker panel, so the same area costs more carbon.
    const poor = estimatePackageEmbodiedCarbonFromBui({
      bui: bui([surface("Wall", "opaque", 100, 1.5)]),
      floorArea: 120,
      measureIds: ["wall-insulation"],
    });
    expect(poor).toBeGreaterThan(modest!);
  });

  test("extrapolates past the thickest panel the sheet lists", () => {
    // Roof target is 0.2 W/m²K → R 5.0. A 2.0 baseline leaves R 4.5, beyond the
    // 120 mm / R 3.5 row that ends the EPS table, so both thickness and carbon
    // are extended rather than clamped to the last row.
    const extrapolated = estimatePackageEmbodiedCarbonFromBui({
      bui: bui([surface("Roof", "opaque", 50, 2.0)]),
      floorArea: 120,
      measureIds: ["roof-insulation"],
    });

    // Thickness scales with resistance: 120 mm × 4.5/3.5 ≈ 154 mm. Carbon then
    // extends from the 120 mm row at the slope across the whole table,
    // (7.2 − 1.9) / (120 − 20) = 0.053 kg/mm, not the closing segment's 0.023.
    const thicknessMm = (120 * 4.5) / 3.5;
    const perM2 = 7.2 + 0.053 * (thicknessMm - 120);
    expect(extrapolated).toBeCloseTo(perM2 * 50, 1);
  });

  test("chooses the lowest-carbon glazing that meets the window U target", () => {
    // Window target is 1.4 W/m²K. PVC double glazing (R 0.83 → U 1.21) clears
    // it, so the 86 kgCO₂e/m² row applies rather than triple glazing's 116.
    const carbon = estimatePackageEmbodiedCarbonFromBui({
      bui: bui([surface("Window", "transparent", 20, 3.0)]),
      floorArea: 120,
      measureIds: ["windows"],
    });

    expect(carbon).toBeCloseTo(86 * 20, 0);
  });

  test("sizes system measures from floor area", () => {
    const envelope = bui([surface("Wall", "opaque", 100, 0.8)]);

    // 120 m² → 5.4 kWp (0.045 kWp/m²) → modules only at 0.597 kgCO₂e/Wp.
    // The sheet's inverter row is deliberately excluded; see the PV note in
    // embodiedCarbon.ts.
    const pv = estimatePackageEmbodiedCarbonFromBui({
      bui: envelope,
      floorArea: 120,
      measureIds: ["pv"],
    });
    expect(pv).toBeCloseTo(5.4 * 1000 * 0.597, 0);

    // The heat pump sheet gives banded capacities, so a sized capacity lands on
    // a whole band's figure; the boiler's discrete rows interpolate.
    const heatPump = estimatePackageEmbodiedCarbonFromBui({
      bui: envelope,
      floorArea: 120,
      measureIds: ["air-water-heat-pump"],
    });
    const boiler = estimatePackageEmbodiedCarbonFromBui({
      bui: envelope,
      floorArea: 120,
      measureIds: ["condensing-boiler"],
    });

    expect(heatPump).toBeGreaterThan(0);
    expect(boiler).toBeGreaterThan(0);
    // Both are whole units, so a package with one is the sum of its parts.
    expect(
      estimatePackageEmbodiedCarbonFromBui({
        bui: envelope,
        floorArea: 120,
        measureIds: ["pv", "air-water-heat-pump"],
      }),
    ).toBeCloseTo(pv! + heatPump!, 0);
  });

  test("keeps scaling heat pumps past the sheet's largest band", () => {
    const envelope = bui([surface("Wall", "opaque", 100, 0.8)]);
    const hp = (floorArea: number) =>
      estimatePackageEmbodiedCarbonFromBui({
        bui: envelope,
        floorArea,
        measureIds: ["air-water-heat-pump"],
      })!;

    // The heat pump table stops at a 14-15 kW band while capacity keeps rising
    // to the 50 kW sizing clamp. Pinning larger buildings to the top band would
    // make the heat pump look free of scale next to the boiler, whose numeric
    // rows extrapolate — and RSE shows the two side by side.
    expect(hp(600)).toBeGreaterThan(hp(300));
    expect(hp(1200)).toBeGreaterThan(hp(600));

    // Inside the table the banded figure still applies verbatim.
    expect(hp(300)).toBe(1730);
  });

  test("never reports a partial total", () => {
    const wall = bui([surface("Wall", "opaque", 100, 0.8)]);
    const total = (measureIds: RenovationMeasureId[]) =>
      estimatePackageEmbodiedCarbonFromBui({
        bui: wall,
        floorArea: 120,
        measureIds,
      });

    // No floor surface, so floor-insulation has no area to price. Summing just
    // the wall would understate the package; see the exclusion guard in
    // TechnicalMCDAService.ts for why that must not reach the MCDA.
    expect(total(["wall-insulation", "floor-insulation"])).toBeNull();

    // A measure with no sheet of its own is skipped, not fatal: the rest of the
    // package still totals, mirroring how unpriceable measures are handled.
    expect(total(["wall-insulation", "solar-thermal"])).toBeCloseTo(674, 0);

    // With nothing quantifiable left, there is no total to report.
    expect(total(["solar-thermal"])).toBeNull();
  });
});
