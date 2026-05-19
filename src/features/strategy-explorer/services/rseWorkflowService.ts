import { mapWithConcurrencyLimit } from "../../../utils/concurrency";
import { auditLog } from "../../../utils/auditLogger";
import {
  RSE_FINANCIAL_CONCURRENCY_LIMIT,
  RSE_PACKAGE_IDS,
  RSE_UNAVAILABLE_REASONS,
  type RSEPackageId,
  type RSEUnavailableReason,
} from "../constants";
import type {
  RSEArchetypeRef,
  RSEExpandedPortfolioSelection,
  RSEFinancialResult,
  RSEForecastingCacheEntry,
  RSESimulationResult,
  RSEWorkflowRequest,
  RSEWorkflowResult,
} from "../types";
import {
  archetypePortfolioService,
  type createArchetypePortfolioService,
} from "./archetypePortfolioService";
import { aggregatePackage } from "./rseAggregationService";
import {
  rseForecastingCacheService,
  RSEForecastingCacheServiceError,
  type createRSEForecastingCacheService,
} from "./rseForecastingCacheService";
import {
  computeFinancials,
  type RSEFinancialServiceInput,
} from "./rseFinancialService";
import { RSEPackageCatalogError } from "./rsePackageCatalog";
import { rankPackages } from "./rseRankingService";
import { rseArchetypeKey, rseArchetypePackageKey } from "./rseKeys";

type ArchetypePortfolioService = ReturnType<
  typeof createArchetypePortfolioService
>;
type ForecastingCacheService = ReturnType<
  typeof createRSEForecastingCacheService
>;

export interface RSEWorkflowServiceDependencies {
  portfolioService?: ArchetypePortfolioService;
  cacheService?: ForecastingCacheService;
  computeFinancials?: (
    input: RSEFinancialServiceInput,
  ) => Promise<RSEFinancialResult>;
  financialConcurrencyLimit?: number;
}

export class RSEWorkflowError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "RSEWorkflowError";
    this.cause = options?.cause;
    Object.setPrototypeOf(this, RSEWorkflowError.prototype);
  }
}

interface RSEUnavailableCombination {
  archetype: RSEArchetypeRef;
  packageId: RSEPackageId;
  reason: RSEUnavailableReason;
}

interface FinancialComputationResult {
  financial?: RSEFinancialResult;
  unavailable?: RSEUnavailableCombination;
}

export function createRSEWorkflowService(
  dependencies: RSEWorkflowServiceDependencies = {},
) {
  const portfolioService =
    dependencies.portfolioService ?? archetypePortfolioService;
  const cacheService = dependencies.cacheService ?? rseForecastingCacheService;
  const financialMapper = dependencies.computeFinancials ?? computeFinancials;
  const financialConcurrencyLimit =
    dependencies.financialConcurrencyLimit ?? RSE_FINANCIAL_CONCURRENCY_LIMIT;

  return {
    async runWorkflow(request: RSEWorkflowRequest): Promise<RSEWorkflowResult> {
      return runWorkflowWithDependencies(request, {
        portfolioService,
        cacheService,
        financialMapper,
        financialConcurrencyLimit,
      });
    },
  };
}

export const rseWorkflowService = createRSEWorkflowService();

export function runWorkflow(
  request: RSEWorkflowRequest,
): Promise<RSEWorkflowResult> {
  return rseWorkflowService.runWorkflow(request);
}

async function runWorkflowWithDependencies(
  request: RSEWorkflowRequest,
  dependencies: {
    portfolioService: ArchetypePortfolioService;
    cacheService: ForecastingCacheService;
    financialMapper: (
      input: RSEFinancialServiceInput,
    ) => Promise<RSEFinancialResult>;
    financialConcurrencyLimit: number;
  },
): Promise<RSEWorkflowResult> {
  const auditCtx = auditLog.startRun("rse");

  try {
    const packageIds = dedupeAndValidatePackageIds(request.packageIds);
    const normalizedRequest: RSEWorkflowRequest = {
      ...request,
      packageIds,
    };

    auditLog.info(
      "pipeline",
      "rse.workflow.start",
      {
        archetypeCount: request.portfolio.selections.length,
        packageIds,
        goal: request.goal,
        financialConcurrencyLimit: dependencies.financialConcurrencyLimit,
      },
      auditCtx,
    );

    const portfolio = await dependencies.portfolioService.expandPortfolio(
      request.portfolio,
    );
    const archetypes = portfolio.map((selection) => selection.archetype);
    const cacheResolution = await dependencies.cacheService.resolveCacheMatrix({
      archetypes,
      packageIds,
    });

    if (cacheResolution.missing.length > 0) {
      auditLog.info(
        "pipeline",
        "rse.workflow.cache.unavailable",
        { missing: cacheResolution.missing },
        auditCtx,
      );
    }

    const normalized = normalizeCacheEntries(
      cacheResolution.entries,
      portfolio,
      dependencies.cacheService,
    );

    if (normalized.unavailable.length > 0) {
      auditLog.info(
        "pipeline",
        "rse.workflow.cache.invalid",
        { unavailable: normalized.unavailable },
        auditCtx,
      );
    }

    const unavailableCombinations = [
      ...cacheResolution.missing,
      ...normalized.unavailable,
    ];

    if (normalized.simulations.length === 0) {
      return emptyWorkflowResult(
        normalizedRequest,
        cacheResolution.cacheVersion,
        unavailableCombinations,
      );
    }

    auditLog.debug(
      "pipeline",
      "rse.workflow.cache.normalized",
      {
        cacheVersion: cacheResolution.cacheVersion,
        combinationCount: normalized.simulations.length,
      },
      auditCtx,
    );

    const financialInputs = buildFinancialInputs(
      normalized.simulations,
      portfolio,
      request.financialAssumptions,
    );

    auditLog.info(
      "financial",
      "rse.workflow.financial.start",
      {
        combinationCount: financialInputs.length,
        concurrencyLimit: dependencies.financialConcurrencyLimit,
      },
      auditCtx,
    );

    const financialResults = await mapWithConcurrencyLimit(
      financialInputs,
      dependencies.financialConcurrencyLimit,
      async (input) =>
        computeFinancialSafely(input, dependencies.financialMapper),
    );
    const financials: RSEFinancialResult[] = [];
    const unavailableFinancials: RSEUnavailableCombination[] = [];

    for (const result of financialResults) {
      if (result.financial) {
        financials.push(result.financial);
      }
      if (result.unavailable) {
        unavailableFinancials.push(result.unavailable);
      }
      if (!result.financial && !result.unavailable) {
        throw new RSEWorkflowError(
          "Financial computation finished without a result.",
        );
      }
    }

    if (unavailableFinancials.length > 0) {
      auditLog.info(
        "financial",
        "rse.workflow.financial.unavailable",
        { unavailable: unavailableFinancials },
        auditCtx,
      );
    }

    const financialKeys = new Set(
      financials.map((financial) =>
        rseArchetypePackageKey(financial.archetype, financial.packageId),
      ),
    );
    const aggregateSimulations = normalized.simulations.filter((simulation) =>
      financialKeys.has(
        rseArchetypePackageKey(simulation.archetype, simulation.packageId),
      ),
    );
    const unavailableCombinationsWithFinancials = [
      ...unavailableCombinations,
      ...unavailableFinancials,
    ];

    if (aggregateSimulations.length === 0) {
      return emptyWorkflowResult(
        normalizedRequest,
        cacheResolution.cacheVersion,
        unavailableCombinationsWithFinancials,
      );
    }

    auditLog.info(
      "financial",
      "rse.workflow.financial.end",
      { resultCount: financials.length },
      auditCtx,
    );

    const packageAggregates = packageIds.flatMap((packageId) => {
      const simulations = aggregateSimulations.filter(
        (result) => result.packageId === packageId,
      );

      if (simulations.length === 0) {
        return [];
      }

      const availableKeys = new Set(
        simulations.map((simulation) =>
          rseArchetypePackageKey(simulation.archetype, simulation.packageId),
        ),
      );

      return [
        aggregatePackage({
          packageId,
          portfolio: portfolio.filter((selection) =>
            availableKeys.has(
              rseArchetypePackageKey(selection.archetype, packageId),
            ),
          ),
          simulations,
          financials: financials.filter(
            (result) => result.packageId === packageId,
          ),
          goal: request.goal,
        }),
      ];
    });

    auditLog.debug(
      "pipeline",
      "rse.workflow.aggregates",
      { packageAggregates },
      auditCtx,
    );

    const rankings = rankPackages(packageAggregates, request.goal, {
      projectLifetimeYears: request.financialAssumptions.projectLifetimeYears,
    });

    auditLog.debug("pipeline", "rse.workflow.rankings", { rankings }, auditCtx);
    auditLog.info(
      "pipeline",
      "rse.workflow.end",
      {
        cacheVersion: cacheResolution.cacheVersion,
        packageCount: packageAggregates.length,
      },
      auditCtx,
    );

    return {
      request: normalizedRequest,
      cacheVersion: cacheResolution.cacheVersion,
      packageAggregates,
      rankings,
      unavailableCombinations: unavailableCombinationsWithFinancials,
    };
  } finally {
    auditLog.endRun();
  }
}

function normalizeCacheEntries(
  entries: RSEForecastingCacheEntry[],
  portfolio: RSEExpandedPortfolioSelection[],
  cacheService: ForecastingCacheService,
): {
  simulations: RSESimulationResult[];
  unavailable: RSEUnavailableCombination[];
} {
  const detailsByArchetype = buildDetailsByArchetype(portfolio);

  const simulations: RSESimulationResult[] = [];
  const unavailable: RSEUnavailableCombination[] = [];

  for (const entry of entries) {
    const details = detailsByArchetype.get(
      rseArchetypeKey(entry.key.archetype),
    );
    if (!details) {
      unavailable.push({
        archetype: entry.key.archetype,
        packageId: entry.key.packageId,
        reason: RSE_UNAVAILABLE_REASONS.invalidCacheEntry,
      });
      continue;
    }

    try {
      simulations.push(cacheService.normalizeEntry(entry, details));
    } catch (error) {
      if (error instanceof RSEForecastingCacheServiceError) {
        unavailable.push({
          archetype: entry.key.archetype,
          packageId: entry.key.packageId,
          reason: error.reason,
        });
        continue;
      }
      throw error;
    }
  }

  return { simulations, unavailable };
}

function buildFinancialInputs(
  simulations: RSESimulationResult[],
  portfolio: RSEExpandedPortfolioSelection[],
  financialAssumptions: RSEWorkflowRequest["financialAssumptions"],
): RSEFinancialServiceInput[] {
  const detailsByArchetype = buildDetailsByArchetype(portfolio);

  return simulations.map((simulation) => {
    const details = detailsByArchetype.get(
      rseArchetypeKey(simulation.archetype),
    );
    if (!details) {
      throw new RSEWorkflowError(
        `Missing archetype details for ${rseArchetypeKey(simulation.archetype)}.`,
      );
    }

    return {
      archetype: simulation.archetype,
      packageId: simulation.packageId,
      details,
      annualEnergySavingsKwh: simulation.annualEnergySavingsKwh,
      financialAssumptions,
    };
  });
}

async function computeFinancialSafely(
  input: RSEFinancialServiceInput,
  financialMapper: (
    input: RSEFinancialServiceInput,
  ) => Promise<RSEFinancialResult>,
): Promise<FinancialComputationResult> {
  try {
    const financial = await financialMapper(input);
    return { financial };
  } catch (error) {
    if (error instanceof RSEPackageCatalogError) {
      return {
        unavailable: {
          archetype: input.archetype,
          packageId: input.packageId,
          reason:
            error.reason === "missing-floor-area"
              ? RSE_UNAVAILABLE_REASONS.invalidFloorArea
              : RSE_UNAVAILABLE_REASONS.invalidPackageData,
        },
      };
    }

    throw new RSEWorkflowError("RSE Financial API step failed.", {
      cause: error,
    });
  }
}

function buildDetailsByArchetype(
  portfolio: RSEExpandedPortfolioSelection[],
): Map<string, RSEExpandedPortfolioSelection["details"]> {
  const map = new Map<string, RSEExpandedPortfolioSelection["details"]>();

  for (const selection of portfolio) {
    const key = rseArchetypeKey(selection.archetype);
    if (map.has(key)) {
      throw new RSEWorkflowError(
        `Duplicate archetype detected in portfolio: ${key}`,
      );
    }
    map.set(key, selection.details);
  }

  return map;
}

function emptyWorkflowResult(
  request: RSEWorkflowRequest,
  cacheVersion: string,
  unavailableCombinations: RSEUnavailableCombination[],
): RSEWorkflowResult {
  return {
    request,
    cacheVersion,
    packageAggregates: [],
    rankings: [],
    unavailableCombinations,
  };
}

function dedupeAndValidatePackageIds(
  packageIds: RSEPackageId[],
): RSEPackageId[] {
  const validPackageIds = new Set<string>(RSE_PACKAGE_IDS);
  const deduped: RSEPackageId[] = [];

  for (const packageId of packageIds) {
    if (!validPackageIds.has(packageId)) {
      throw new RSEWorkflowError(`Unknown RSE package: ${packageId}`);
    }
    if (!deduped.includes(packageId)) {
      deduped.push(packageId);
    }
  }

  if (deduped.length === 0) {
    throw new RSEWorkflowError("RSE workflow requires at least one package.");
  }

  return deduped;
}

export function rseWorkflowCombinationKey(
  archetype: RSEArchetypeRef,
  packageId: RSEPackageId,
): string {
  return rseArchetypePackageKey(archetype, packageId);
}
