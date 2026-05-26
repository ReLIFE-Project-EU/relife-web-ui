import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createRSEWorkflowService,
  RSEWorkflowError,
} from "../../../../../src/features/strategy-explorer/services/rseWorkflowService";
import { RSEPackageCatalogError } from "../../../../../src/features/strategy-explorer/services/rsePackageCatalog";
import { auditLog } from "../../../../../src/utils/auditLogger";
import type {
  RSEExpandedPortfolioSelection,
  RSEFinancialResult,
  RSEForecastingCacheEntry,
  RSEPackageId,
  RSESimulationResult,
  RSEWorkflowRequest,
} from "../../../../../src/features/strategy-explorer/types";

type WorkflowDependencies = NonNullable<
  Parameters<typeof createRSEWorkflowService>[0]
>;

const archetypeA = { country: "IT", category: "Residential", name: "A" };
const archetypeB = { country: "IT", category: "Residential", name: "B" };

function makeRequest(
  packageIds: RSEPackageId[] = ["envelope", "combined"],
): RSEWorkflowRequest {
  return {
    portfolio: {
      selections: [
        { archetype: archetypeA, buildingCount: 1 },
        { archetype: archetypeB, buildingCount: 2 },
      ],
    },
    goal: { kind: "energy" },
    packageIds,
    financialAssumptions: {
      projectLifetimeYears: 20,
      financingType: "self-funded",
      upfrontIncentivePercentage: 0,
      lifetimeIncentiveAmountEur: 0,
      lifetimeIncentiveYears: 0,
    },
  };
}

function makePortfolio(): RSEExpandedPortfolioSelection[] {
  return [
    {
      archetype: archetypeA,
      buildingCount: 1,
      details: { floorArea: 100 } as RSEExpandedPortfolioSelection["details"],
    },
    {
      archetype: archetypeB,
      buildingCount: 2,
      details: { floorArea: 120 } as RSEExpandedPortfolioSelection["details"],
    },
  ];
}

function makeEntry(
  archetype: typeof archetypeA,
  packageId: RSEPackageId,
): RSEForecastingCacheEntry {
  return {
    key: { archetype, packageId, cacheVersion: "v1" },
  } as RSEForecastingCacheEntry;
}

function makeSimulation(entry: RSEForecastingCacheEntry): RSESimulationResult {
  const packageMultiplier = entry.key.packageId === "combined" ? 2 : 1;
  const archetypeMultiplier = entry.key.archetype.name === "B" ? 2 : 1;
  const annualEnergySavingsKwh =
    1_000 * packageMultiplier * archetypeMultiplier;

  return {
    key: entry.key,
    archetype: entry.key.archetype,
    packageId: entry.key.packageId,
    cacheVersion: entry.key.cacheVersion,
    baselineAnnualEnergyKwh: 10_000,
    renovatedAnnualEnergyKwh: 10_000 - annualEnergySavingsKwh,
    annualEnergySavingsKwh,
    annualEnergySavingsPercentage: 10,
    baselineAnnualEmissionsTonCo2eq: 2,
    renovatedAnnualEmissionsTonCo2eq: 1,
    annualCo2ReductionTon: packageMultiplier,
    annualCo2ReductionPercentage: 50,
    baselineDisplayEpcClass: "C",
    renovatedDisplayEpcClass: "B",
    generatedAt: "2026-05-13T00:00:00.000Z",
    provenance: {
      source: "manual-seed",
      co2ComputedAt: "2026-05-13T00:00:00.000Z",
      co2Method: "forecasting-carrier-split-final-energy-gas-thermal-mvp",
      emissionFactorCountry: "IT",
    },
  };
}

function makeFinancial(input: {
  archetype: typeof archetypeA;
  packageId: RSEPackageId;
  annualEnergySavingsKwh: number;
}): RSEFinancialResult {
  const capexEur = input.packageId === "combined" ? 200 : 100;
  return {
    archetype: input.archetype,
    packageId: input.packageId,
    capexEur,
    annualMaintenanceEur: 10,
    annualEnergySavingsKwh: input.annualEnergySavingsKwh,
    status: "available",
    pointForecasts: {
      NPV: 1_000,
      ROI: input.packageId === "combined" ? 0.4 : 0.2,
      IRR: 0.1,
      PBP: 6,
      DPP: 7,
    },
  };
}

function makeDependencies(
  overrides: Partial<WorkflowDependencies> = {},
): WorkflowDependencies {
  const entries = [
    makeEntry(archetypeA, "envelope"),
    makeEntry(archetypeB, "envelope"),
    makeEntry(archetypeA, "combined"),
    makeEntry(archetypeB, "combined"),
  ];

  return {
    portfolioService: {
      loadArchetypes: vi.fn(),
      getArchetypeDetails: vi.fn(),
      validatePortfolio: vi.fn((definition) => definition),
      expandPortfolio: vi.fn().mockResolvedValue(makePortfolio()),
    },
    cacheService: {
      resolveCacheMatrix: vi.fn().mockResolvedValue({
        cacheVersion: "v1",
        entries,
        available: entries.map((entry) => entry.key),
        missing: [],
      }),
      normalizeEntry: vi.fn((entry: RSEForecastingCacheEntry) =>
        makeSimulation(entry),
      ),
    },
    computeFinancials: vi.fn((input) =>
      Promise.resolve(
        makeFinancial({
          archetype: input.archetype,
          packageId: input.packageId,
          annualEnergySavingsKwh: input.annualEnergySavingsKwh,
        }),
      ),
    ),
    financialConcurrencyLimit: 2,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rseWorkflowService", () => {
  test("returns a stable workflow result for the happy path", async () => {
    const deps = makeDependencies();
    const result =
      await createRSEWorkflowService(deps).runWorkflow(makeRequest());

    expect(result.cacheVersion).toBe("v1");
    expect(result.unavailableCombinations).toEqual([]);
    expect(result.packageAggregates).toHaveLength(2);
    expect(result.rankings).toHaveLength(2);
    expect(result.request.packageIds).toEqual(["envelope", "combined"]);
  });

  test("runs financial work with bounded concurrency and stable output order", async () => {
    let active = 0;
    let maxActive = 0;
    const deps = makeDependencies({
      computeFinancials: vi.fn(async (input) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return makeFinancial({
          archetype: input.archetype,
          packageId: input.packageId,
          annualEnergySavingsKwh: input.annualEnergySavingsKwh,
        });
      }),
      financialConcurrencyLimit: 2,
    });

    const result =
      await createRSEWorkflowService(deps).runWorkflow(makeRequest());

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(deps.computeFinancials).toHaveBeenCalledTimes(4);
    expect(
      result.packageAggregates.map((aggregate) => aggregate.packageId),
    ).toEqual(["envelope", "combined"]);
  });

  test("missing cache rows are excluded while available rows continue", async () => {
    const availableEntry = makeEntry(archetypeB, "envelope");
    const deps = makeDependencies({
      cacheService: {
        resolveCacheMatrix: vi.fn().mockResolvedValue({
          cacheVersion: "v1",
          entries: [availableEntry],
          available: [availableEntry.key],
          missing: [
            {
              archetype: archetypeA,
              packageId: "envelope",
              reason: "missing-cache-entry",
            },
          ],
        }),
        normalizeEntry: vi.fn(),
      },
    });
    const cacheService = deps.cacheService;
    if (!cacheService) {
      throw new Error("cacheService test dependency is required");
    }
    cacheService.normalizeEntry = vi.fn((entry: RSEForecastingCacheEntry) =>
      makeSimulation(entry),
    );

    const result = await createRSEWorkflowService(deps).runWorkflow(
      makeRequest(["envelope"]),
    );

    expect(deps.computeFinancials).toHaveBeenCalledTimes(1);
    expect(result.packageAggregates).toHaveLength(1);
    expect(result.rankings).toHaveLength(1);
    expect(result.unavailableCombinations).toEqual([
      {
        archetype: archetypeA,
        packageId: "envelope",
        reason: "missing-cache-entry",
      },
    ]);
  });

  test("missing cache rows still return an empty result when nothing is available", async () => {
    const deps = makeDependencies({
      cacheService: {
        resolveCacheMatrix: vi.fn().mockResolvedValue({
          cacheVersion: "v1",
          entries: [],
          available: [],
          missing: [
            {
              archetype: archetypeA,
              packageId: "envelope",
              reason: "missing-cache-entry",
            },
          ],
        }),
        normalizeEntry: vi.fn(),
      },
    });

    const result = await createRSEWorkflowService(deps).runWorkflow(
      makeRequest(["envelope"]),
    );

    expect(deps.computeFinancials).not.toHaveBeenCalled();
    expect(result.packageAggregates).toEqual([]);
    expect(result.rankings).toEqual([]);
    expect(result.unavailableCombinations).toEqual([
      {
        archetype: archetypeA,
        packageId: "envelope",
        reason: "missing-cache-entry",
      },
    ]);
  });

  test("deduplicates package IDs before cache and financial work", async () => {
    const deps = makeDependencies({
      cacheService: {
        resolveCacheMatrix: vi.fn().mockImplementation((request) => {
          const entries = [
            makeEntry(archetypeA, request.packageIds[0]),
            makeEntry(archetypeB, request.packageIds[0]),
          ];
          return Promise.resolve({
            cacheVersion: "v1",
            entries,
            available: entries.map((entry) => entry.key),
            missing: [],
          });
        }),
        normalizeEntry: vi.fn((entry: RSEForecastingCacheEntry) =>
          makeSimulation(entry),
        ),
      },
    });

    const result = await createRSEWorkflowService(deps).runWorkflow(
      makeRequest(["envelope", "envelope"]),
    );

    expect(deps.cacheService?.resolveCacheMatrix).toHaveBeenCalledWith({
      archetypes: [archetypeA, archetypeB],
      packageIds: ["envelope"],
    });
    expect(deps.computeFinancials).toHaveBeenCalledTimes(2);
    expect(result.request.packageIds).toEqual(["envelope"]);
  });

  test("non-positive-savings financial results stay in aggregation", async () => {
    const deps = makeDependencies({
      computeFinancials: vi.fn(async (input) => {
        if (input.archetype.name === "A") {
          return {
            archetype: input.archetype,
            packageId: input.packageId,
            capexEur: 100,
            annualMaintenanceEur: 10,
            annualEnergySavingsKwh: 0,
            status: "unavailable" as const,
            unavailableReason: "non-positive-energy-savings" as const,
            pointForecasts: {},
          };
        }

        return makeFinancial({
          archetype: input.archetype,
          packageId: input.packageId,
          annualEnergySavingsKwh: input.annualEnergySavingsKwh,
        });
      }),
    });

    const result = await createRSEWorkflowService(deps).runWorkflow(
      makeRequest(["envelope"]),
    );

    expect(result.packageAggregates).toHaveLength(1);
    expect(result.rankings).toHaveLength(1);
    expect(result.packageAggregates[0].totalBuildings).toBe(3);
    expect(result.unavailableCombinations).toEqual([]);
  });

  test("packages with only unavailable financial KPIs still aggregate cache and cost metrics", async () => {
    const deps = makeDependencies({
      cacheService: {
        resolveCacheMatrix: vi.fn().mockImplementation((request) => {
          const entries = [
            makeEntry(archetypeA, request.packageIds[0]),
            makeEntry(archetypeB, request.packageIds[0]),
          ];
          return Promise.resolve({
            cacheVersion: "v1",
            entries,
            available: entries.map((entry) => entry.key),
            missing: [],
          });
        }),
        normalizeEntry: vi.fn((entry: RSEForecastingCacheEntry) =>
          makeSimulation(entry),
        ),
      },
      computeFinancials: vi.fn(async (input) => ({
        archetype: input.archetype,
        packageId: input.packageId,
        capexEur: 100,
        annualMaintenanceEur: 10,
        annualEnergySavingsKwh: 0,
        status: "unavailable" as const,
        unavailableReason: "non-positive-energy-savings" as const,
        pointForecasts: {},
      })),
    });

    const result = await createRSEWorkflowService(deps).runWorkflow(
      makeRequest(["envelope"]),
    );

    expect(result.packageAggregates).toHaveLength(1);
    expect(result.packageAggregates[0].totalBuildings).toBe(3);
    expect(result.packageAggregates[0].totalCapexEur).toBe(300);
    expect(
      result.packageAggregates[0].financialIndicators.aggregateROI,
    ).toBeUndefined();
    expect(result.rankings).toHaveLength(1);
    expect(result.unavailableCombinations).toEqual([]);
  });

  test("maps package catalog data errors to typed unavailable combinations", async () => {
    const deps = makeDependencies({
      computeFinancials: vi.fn(async () => {
        throw new RSEPackageCatalogError(
          "Missing floor area",
          "missing-floor-area",
        );
      }),
    });

    const result = await createRSEWorkflowService(deps).runWorkflow(
      makeRequest(["envelope"]),
    );

    expect(result.unavailableCombinations[0]).toEqual({
      archetype: archetypeA,
      packageId: "envelope",
      reason: "invalid-floor-area",
    });
    expect(result.packageAggregates).toEqual([]);
  });

  test("maps non-floor-area package catalog errors to invalidPackageData", async () => {
    const deps = makeDependencies({
      computeFinancials: vi.fn(async () => {
        throw new RSEPackageCatalogError(
          "Missing PV capacity",
          "missing-pv-capacity",
        );
      }),
    });

    const result = await createRSEWorkflowService(deps).runWorkflow(
      makeRequest(["envelope"]),
    );

    expect(result.unavailableCombinations[0]).toEqual({
      archetype: archetypeA,
      packageId: "envelope",
      reason: "invalid-package-data",
    });
    expect(result.packageAggregates).toEqual([]);
  });

  test("rethrows unknown financial failures as workflow errors", async () => {
    const deps = makeDependencies({
      computeFinancials: vi.fn(async () => {
        throw new Error("network failed");
      }),
    });

    await expect(
      createRSEWorkflowService(deps).runWorkflow(makeRequest(["envelope"])),
    ).rejects.toThrow(RSEWorkflowError);
  });

  test("emits audit events", async () => {
    const infoSpy = vi.spyOn(auditLog, "info");
    const debugSpy = vi.spyOn(auditLog, "debug");

    await createRSEWorkflowService(makeDependencies()).runWorkflow(
      makeRequest(),
    );

    expect(infoSpy).toHaveBeenCalledWith(
      "pipeline",
      "rse.workflow.start",
      expect.any(Object),
      expect.objectContaining({ scope: "rse" }),
    );
    expect(debugSpy).toHaveBeenCalledWith(
      "pipeline",
      "rse.workflow.rankings",
      expect.any(Object),
      expect.objectContaining({ scope: "rse" }),
    );
  });
});
