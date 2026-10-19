import { describe, expect, test, vi } from "vitest";

import { ArchetypeMatchStrategy } from "../../../src/services/archetypeMatching";
import {
  estimatePackageEmbodiedCarbon,
  estimatePackageEmbodiedCarbonFromBui,
} from "../../../src/services/embodiedCarbon";
import {
  lookupPackageCosts,
  type SimulatedBuilding,
} from "../../../src/services/packageCostLookup";
import type {
  IBuildingService,
  IFinancialService,
} from "../../../src/services/types";
import type { BuildingPayload } from "../../../src/types/archetype";
import {
  applyGeometryModification,
  surfaceAreasFromBui,
} from "../../../src/utils/archetypeModifier";

const estimation: SimulatedBuilding = {
  archetype: {
    category: "Multi family House",
    country: "Greece",
    name: "MFH-1961-1980",
    matchStrategy: ArchetypeMatchStrategy.USER_SELECTED,
  },
  archetypeFloorArea: 120,
};

// One wall surface → positive wall area → at least one priceable action.
const archetypeDetails = {
  bui: {
    building_surface: [
      { name: "wall_s", type: "opaque", area: 80, sky_view_factor: 0.5 },
    ],
  },
  floorArea: 120,
} as unknown as Awaited<ReturnType<IBuildingService["getArchetypeDetails"]>>;

function makeDeps(overrides?: {
  getArchetypeDetails?: ReturnType<typeof vi.fn>;
  estimatePackageCosts?: ReturnType<typeof vi.fn>;
}) {
  const getArchetypeDetails =
    overrides?.getArchetypeDetails ??
    vi.fn().mockResolvedValue(archetypeDetails);
  const estimatePackageCosts =
    overrides?.estimatePackageCosts ??
    vi.fn().mockResolvedValue({
      capex: 8000,
      annualMaintenanceCost: 150,
      capexFromLookup: true,
      opexFromLookup: true,
    });
  return {
    deps: {
      building: { getArchetypeDetails } as unknown as Pick<
        IBuildingService,
        "getArchetypeDetails"
      >,
      financial: { estimatePackageCosts } as unknown as Pick<
        IFinancialService,
        "estimatePackageCosts"
      >,
    },
    getArchetypeDetails,
    estimatePackageCosts,
  };
}

describe("lookupPackageCosts", () => {
  test("resolves costs from the archetype geometry and reference-data lookup", async () => {
    const { deps, getArchetypeDetails, estimatePackageCosts } = makeDeps();

    const result = await lookupPackageCosts(
      {
        country: "Greece",
        estimation,
        measureIds: ["wall-insulation"],
        floorArea: 100,
        pvKwp: null,
        projectLifetime: 20,
      },
      deps,
    );

    expect(getArchetypeDetails).toHaveBeenCalledWith({
      category: "Multi family House",
      country: "Greece",
      name: "MFH-1961-1980",
    });
    expect(estimatePackageCosts).toHaveBeenCalledWith(
      expect.objectContaining({ country: "Greece", projectLifetime: 20 }),
    );
    expect(result).toMatchObject({ capex: 8000, annualMaintenanceCost: 150 });
  });

  test("falls back to the archetype floor area when none is given", async () => {
    const { deps, estimatePackageCosts } = makeDeps();

    await lookupPackageCosts(
      {
        country: "Greece",
        estimation,
        measureIds: ["wall-insulation"],
        floorArea: null,
        pvKwp: null,
      },
      deps,
    );

    // Lookup still proceeds with actions derived from the archetype geometry.
    expect(estimatePackageCosts).toHaveBeenCalled();
  });

  test("scales envelope surfaces to the flat's share when requested", async () => {
    // Flat share = 100 / 2000: wall actions must be priced for 40 m2, not 800.
    const flatShareDetails = {
      bui: {
        building: { net_floor_area: 2000, exposed_perimeter: 100 },
        building_surface: [
          { name: "wall_s", type: "opaque", area: 800, sky_view_factor: 0.5 },
        ],
      },
      floorArea: 2000,
    } as unknown as Awaited<
      ReturnType<IBuildingService["getArchetypeDetails"]>
    >;
    const { deps, estimatePackageCosts } = makeDeps({
      getArchetypeDetails: vi.fn().mockResolvedValue(flatShareDetails),
    });

    await lookupPackageCosts(
      {
        country: "Greece",
        estimation,
        measureIds: ["wall-insulation"],
        floorArea: 100,
        pvKwp: null,
        scaleEnvelopeToFloorArea: true,
      },
      deps,
    );

    const request = estimatePackageCosts.mock.calls[0][0] as {
      renovationActions: Array<{ action: string; area_m2?: number }>;
    };
    expect(request.renovationActions[0].area_m2).toBeCloseTo(40, 6);
  });

  test("throws when the country cannot be resolved", async () => {
    const { deps, getArchetypeDetails } = makeDeps();

    await expect(
      lookupPackageCosts(
        {
          country: "Atlantis",
          estimation,
          measureIds: ["wall-insulation"],
          floorArea: 100,
          pvKwp: null,
        },
        deps,
      ),
    ).rejects.toThrow(/missing building location or archetype/);
    expect(getArchetypeDetails).not.toHaveBeenCalled();
  });

  test("throws when the archetype is missing", async () => {
    const { deps } = makeDeps();

    await expect(
      lookupPackageCosts(
        {
          country: "Greece",
          estimation: null,
          measureIds: ["wall-insulation"],
          floorArea: 100,
          pvKwp: null,
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
          estimation,
          measureIds: [],
          floorArea: 100,
          pvKwp: null,
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
    const resized = { ...estimation, archetypeFloorArea: 160, modifiedBui };
    const roofOnly = {
      floorArea: 160,
      pvKwp: null,
      measureIds: ["roof-insulation" as const],
    };
    const { deps, getArchetypeDetails, estimatePackageCosts } = makeDeps();

    await lookupPackageCosts(
      {
        country: "Greece",
        estimation: resized,
        measureIds: ["roof-insulation", "wall-insulation"],
        floorArea: 160,
        pvKwp: null,
      },
      deps,
    );
    const carbon = await estimatePackageEmbodiedCarbon(
      { ...roofOnly, estimation: resized },
      deps,
    );

    expect(getArchetypeDetails).not.toHaveBeenCalled();
    const [roof, wall] = (
      estimatePackageCosts.mock.calls[0][0] as {
        renovationActions: Array<{ action: string; area_m2?: number }>;
      }
    ).renovationActions;
    expect(roof).toEqual({
      action: "Roof insulation - Accessible",
      area_m2: 160,
    });
    expect(wall.area_m2).toBeCloseTo(surfaceAreasFromBui(modifiedBui).wallM2);
    expect(wall.area_m2).toBeLessThan(150);
    expect(carbon).toBeCloseTo(
      2 * estimatePackageEmbodiedCarbonFromBui({ ...roofOnly, bui: house })!,
    );
  });
});
