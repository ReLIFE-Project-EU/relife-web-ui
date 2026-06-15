import { describe, expect, test, vi } from "vitest";

import { lookupPackageCosts } from "../../../src/services/packageCostLookup";
import type {
  IBuildingService,
  IFinancialService,
} from "../../../src/services/types";
import type { ArchetypeInfo } from "../../../src/types/forecasting";

const archetype: ArchetypeInfo = {
  category: "Multi family House",
  country: "Greece",
  name: "MFH-1961-1980",
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
        archetype,
        measureIds: ["wall-insulation"],
        floorArea: 100,
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
        archetype,
        measureIds: ["wall-insulation"],
        floorArea: null,
      },
      deps,
    );

    // Lookup still proceeds with actions derived from the archetype geometry.
    expect(estimatePackageCosts).toHaveBeenCalled();
  });

  test("throws when the country cannot be resolved", async () => {
    const { deps, getArchetypeDetails } = makeDeps();

    await expect(
      lookupPackageCosts(
        {
          country: "Atlantis",
          archetype,
          measureIds: ["wall-insulation"],
          floorArea: 100,
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
          archetype: undefined,
          measureIds: ["wall-insulation"],
          floorArea: 100,
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
          archetype,
          measureIds: [],
          floorArea: 100,
        },
        deps,
      ),
    ).rejects.toThrow(/No priceable measures/);
    expect(estimatePackageCosts).not.toHaveBeenCalled();
  });
});
