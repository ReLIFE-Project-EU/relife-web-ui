import { describe, expect, test, vi } from "vitest";

import { estimatePackageEmbodiedCarbon } from "../../../src/services/embodiedCarbon";
import { lookupPackageCosts } from "../../../src/services/packageCostLookup";
import {
  modeledPvKwp,
  type SimulatedBuilding,
} from "../../../src/services/simulatedBuilding";
import type { IFinancialService } from "../../../src/services/types";
import type { BuildingPayload } from "../../../src/types/archetype";
import {
  applyGeometryModification,
  surfaceAreasFromBui,
} from "../../../src/utils/archetypeModifier";

const archetype = {
  category: "Multi family House",
  country: "Greece",
  name: "MFH-1961-1980",
};

// One wall surface → positive wall area → at least one priceable action.
const simulated: SimulatedBuilding = {
  archetype,
  bui: {
    building: { net_floor_area: 120 },
    building_surface: [
      { name: "wall_s", type: "opaque", area: 80, sky_view_factor: 0.5 },
    ],
  } as unknown as BuildingPayload,
  modeledFloorArea: 120,
};

function makeDeps() {
  const estimatePackageCosts = vi.fn().mockResolvedValue({
    capex: 8000,
    annualMaintenanceCost: 150,
    capexFromLookup: true,
    opexFromLookup: true,
  });
  return {
    deps: {
      financial: { estimatePackageCosts } as unknown as Pick<
        IFinancialService,
        "estimatePackageCosts"
      >,
    },
    estimatePackageCosts,
  };
}

function pricedActions(estimatePackageCosts: ReturnType<typeof vi.fn>) {
  return (
    estimatePackageCosts.mock.calls[0][0] as {
      renovationActions: Array<{
        action: string;
        area_m2?: number;
        capacity_kw?: number;
      }>;
    }
  ).renovationActions;
}

describe("lookupPackageCosts", () => {
  test("resolves costs from the simulated building and reference-data lookup", async () => {
    const { deps, estimatePackageCosts } = makeDeps();

    const result = await lookupPackageCosts(
      {
        country: "Greece",
        simulated,
        measureIds: ["wall-insulation"],
        projectLifetime: 20,
      },
      deps,
    );

    expect(estimatePackageCosts).toHaveBeenCalledWith(
      expect.objectContaining({ country: "Greece", projectLifetime: 20 }),
    );
    expect(result).toMatchObject({ capex: 8000, annualMaintenanceCost: 150 });
  });

  test("scales envelope surfaces by the area scale factor", async () => {
    // Flat share = 100 / 2000: wall actions must be priced for 40 m2, not 800.
    const flatShare: SimulatedBuilding = {
      archetype,
      bui: {
        building: { net_floor_area: 2000, exposed_perimeter: 100 },
        building_surface: [
          { name: "wall_s", type: "opaque", area: 800, sky_view_factor: 0.5 },
        ],
      } as unknown as BuildingPayload,
      modeledFloorArea: 100,
    };
    const { deps, estimatePackageCosts } = makeDeps();

    await lookupPackageCosts(
      {
        country: "Greece",
        simulated: flatShare,
        measureIds: ["wall-insulation"],
      },
      deps,
    );

    expect(pricedActions(estimatePackageCosts)[0].area_m2).toBeCloseTo(40, 6);
  });

  test("throws when the country cannot be resolved", async () => {
    const { deps, estimatePackageCosts } = makeDeps();

    await expect(
      lookupPackageCosts(
        {
          country: "Atlantis",
          simulated,
          measureIds: ["wall-insulation"],
        },
        deps,
      ),
    ).rejects.toThrow(/missing building location or archetype/);
    expect(estimatePackageCosts).not.toHaveBeenCalled();
  });

  test("throws when the simulated building is missing", async () => {
    const { deps } = makeDeps();

    await expect(
      lookupPackageCosts(
        {
          country: "Greece",
          simulated: null,
          measureIds: ["wall-insulation"],
        },
        deps,
      ),
    ).rejects.toThrow(/missing building location or archetype/);
  });

  test("throws when no measures are priceable", async () => {
    const { deps, estimatePackageCosts } = makeDeps();

    await expect(
      lookupPackageCosts(
        {
          country: "Greece",
          simulated,
          measureIds: [],
        },
        deps,
      ),
    ).rejects.toThrow(/No priceable measures/);
    expect(estimatePackageCosts).not.toHaveBeenCalled();
  });

  test("cost and carbon read a house resized to one floor", async () => {
    // Two floors over an 80 m² footprint; one floor doubles the roof.
    const house = {
      building: {
        name: "house",
        net_floor_area: 160,
        n_floors: 2,
        height: 5.4,
        volume: 432,
        exposed_perimeter: 36,
      },
      building_surface: [
        {
          name: "Roof",
          type: "opaque",
          area: 80,
          u_value: 1,
          sky_view_factor: 1,
        },
        {
          name: "Slab",
          type: "opaque",
          area: 80,
          u_value: 1,
          sky_view_factor: 0,
        },
        {
          name: "Wall",
          type: "opaque",
          area: 150,
          u_value: 1.2,
          sky_view_factor: 0.5,
        },
      ],
      building_parameters: { construction: { thermal_bridge_heat_W_K: 31 } },
    } as unknown as BuildingPayload;
    const modifiedBui = applyGeometryModification(house, { numberOfFloors: 1 });
    const resized: SimulatedBuilding = {
      archetype,
      bui: modifiedBui,
      modeledFloorArea: 160,
    };
    const { deps, estimatePackageCosts } = makeDeps();

    await lookupPackageCosts(
      {
        country: "Greece",
        simulated: resized,
        measureIds: ["roof-insulation", "wall-insulation"],
      },
      deps,
    );
    const roofCarbon = (bui: BuildingPayload) =>
      estimatePackageEmbodiedCarbon({
        simulated: { archetype, bui, modeledFloorArea: 160 },
        measureIds: ["roof-insulation"],
      })!;

    const [roof, wall] = pricedActions(estimatePackageCosts);
    expect(roof).toEqual({
      action: "Roof insulation - Accessible",
      area_m2: 160,
    });
    expect(wall.area_m2).toBeCloseTo(surfaceAreasFromBui(modifiedBui).wallM2);
    expect(wall.area_m2).toBeLessThan(150);
    expect(roofCarbon(modifiedBui)).toBeCloseTo(2 * roofCarbon(house));
  });

  test("cost and carbon price the same PV share of a flat", async () => {
    // A 400 m² roof sizes 18 kWp for the block; a 100 m² flat of 1,200 m² gets 1.5 kWp.
    const flat: SimulatedBuilding = {
      archetype,
      bui: {
        building: { net_floor_area: 1200, exposed_perimeter: 140 },
        building_surface: [
          { name: "Roof", type: "opaque", area: 400, sky_view_factor: 1 },
        ],
      } as unknown as BuildingPayload,
      modeledFloorArea: 100,
    };
    const { deps, estimatePackageCosts } = makeDeps();

    await lookupPackageCosts(
      { country: "Greece", simulated: flat, measureIds: ["pv"] },
      deps,
    );
    const carbon = estimatePackageEmbodiedCarbon({
      simulated: flat,
      measureIds: ["pv"],
    });

    expect(modeledPvKwp(flat)).toBeCloseTo(1.5, 6);
    expect(pricedActions(estimatePackageCosts)[0].capacity_kw).toBeCloseTo(
      1.5,
      6,
    );
    // Modules only, at 0.597 kgCO₂e/Wp (see embodiedCarbon.test.ts).
    expect(carbon).toBeCloseTo(1.5 * 1000 * 0.597, 0);
  });
});
