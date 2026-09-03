import { describe, expect, test, vi } from "vitest";

import {
  createArchetypePortfolioService,
  RSEPortfolioValidationError,
} from "../../../../../src/features/strategy-explorer/services/archetypePortfolioService";
import type { RSEPortfolioDefinition } from "../../../../../src/features/strategy-explorer/types";
import type { ArchetypeDetails } from "../../../../../src/types/archetype";
import type { ArchetypeInfo } from "../../../../../src/types/forecasting";

const archetype = {
  country: "IT",
  category: "Residential",
  name: "Detached 1980",
};

function makeDetails(ref: ArchetypeInfo = archetype): ArchetypeDetails {
  return {
    ...ref,
    floorArea: 100,
    numberOfFloors: 1,
    floorHeight: 3,
    totalWindowArea: 20,
    thermalProperties: {
      wallUValue: 0.8,
      roofUValue: 0.6,
      windowUValue: 2.8,
    },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 16,
      coolingSetpoint: 26,
      coolingSetback: 28,
    },
    location: { lat: 41.9, lng: 12.5 },
    bui: {} as ArchetypeDetails["bui"],
    system: {} as ArchetypeDetails["system"],
  };
}

function makeService() {
  return {
    getArchetypes: vi
      .fn()
      .mockResolvedValue([
        { country: "DE", category: "Residential", name: "Apartment 2000" },
        archetype,
      ]),
    getArchetypeDetails: vi.fn().mockResolvedValue(makeDetails()),
  };
}

describe("archetypePortfolioService", () => {
  test("loads archetypes through the injected building service", async () => {
    const service = makeService();
    const portfolioService = createArchetypePortfolioService(service);

    await expect(portfolioService.loadArchetypes()).resolves.toEqual([
      { country: "DE", category: "Residential", name: "Apartment 2000" },
      archetype,
    ]);
    expect(service.getArchetypes).toHaveBeenCalledTimes(1);
  });

  test("expands a valid portfolio with archetype details and counts", async () => {
    const service = makeService();
    const portfolioService = createArchetypePortfolioService(service);

    const expanded = await portfolioService.expandPortfolio({
      selections: [{ archetype, buildingCount: 12 }],
    });

    expect(service.getArchetypeDetails).toHaveBeenCalledWith(archetype);
    expect(expanded).toEqual([
      {
        archetype,
        buildingCount: 12,
        details: makeDetails(),
        modeledFloorArea: 100,
      },
    ]);
  });

  test("models apartment archetypes as one dwelling, capped by the reference building", async () => {
    const big = {
      ...archetype,
      category: "Apartment buildings",
      name: "AB big",
    };
    const small = { ...big, name: "AB small" };
    const areaByName: Record<string, number> = {
      [big.name]: 1000,
      [small.name]: 50,
      [archetype.name]: 100,
    };
    const service = {
      ...makeService(),
      getArchetypeDetails: vi.fn(async (ref: ArchetypeInfo) => ({
        ...makeDetails(ref),
        floorArea: areaByName[ref.name],
      })),
    };
    const portfolioService = createArchetypePortfolioService(service);

    const expanded = await portfolioService.expandPortfolio({
      selections: [
        { archetype: big, buildingCount: 40 },
        { archetype: small, buildingCount: 5 },
        { archetype, buildingCount: 3 },
      ],
    });

    expect(expanded.map((s) => s.modeledFloorArea)).toEqual([
      // Default dwelling area, the cap when the building is smaller, and the
      // whole archetype for the single-family row (scaling factor 1).
      80, 50, 100,
    ]);
  });

  test.each([
    ["empty portfolio", { selections: [] }, "empty-portfolio"],
    [
      "blank archetype ref",
      {
        selections: [
          {
            archetype: { ...archetype, name: " " },
            buildingCount: 1,
          },
        ],
      },
      "incomplete-archetype-ref",
    ],
    [
      "duplicate archetype",
      {
        selections: [
          { archetype, buildingCount: 1 },
          { archetype: { ...archetype }, buildingCount: 2 },
        ],
      },
      "duplicate-archetype",
    ],
    [
      "zero count",
      { selections: [{ archetype, buildingCount: 0 }] },
      "invalid-building-count",
    ],
    [
      "negative count",
      { selections: [{ archetype, buildingCount: -1 }] },
      "invalid-building-count",
    ],
    [
      "decimal count",
      { selections: [{ archetype, buildingCount: 1.5 }] },
      "invalid-building-count",
    ],
    [
      "NaN count",
      { selections: [{ archetype, buildingCount: Number.NaN }] },
      "invalid-building-count",
    ],
    [
      "non-positive dwelling area",
      { selections: [{ archetype, buildingCount: 1, unitFloorArea: 0 }] },
      "invalid-floor-area",
    ],
  ] satisfies Array<[string, RSEPortfolioDefinition, string]>)(
    "rejects %s",
    (_name, definition, reason) => {
      const portfolioService = createArchetypePortfolioService(makeService());

      expect(() => portfolioService.validatePortfolio(definition)).toThrow(
        RSEPortfolioValidationError,
      );

      try {
        portfolioService.validatePortfolio(definition);
        expect.fail("Expected validation to throw");
      } catch (error) {
        expect((error as RSEPortfolioValidationError).reason).toBe(reason);
      }
    },
  );
});
