import type {
  RSEExpandedPortfolioSelection,
  RSEFinancialResult,
  RSEPackageAggregate,
  RSEPackageId,
  RSERenovationGoal,
  RSESimulationResult,
} from "../types";
import { rseArchetypePackageKey, rseArchetypeKey } from "./rseKeys";

export interface RSEPackageAggregationInput {
  packageId: RSEPackageId;
  portfolio: RSEExpandedPortfolioSelection[];
  simulations: RSESimulationResult[];
  financials: RSEFinancialResult[];
  goal: RSERenovationGoal;
}

export function aggregatePackage(
  input: RSEPackageAggregationInput,
): RSEPackageAggregate {
  const simulationsByKey = new Map(
    input.simulations.map((result) => [
      rseArchetypePackageKey(result.archetype, result.packageId),
      result,
    ]),
  );
  const financialsByKey = new Map(
    input.financials.map((result) => [
      rseArchetypePackageKey(result.archetype, result.packageId),
      result,
    ]),
  );

  let totalBuildings = 0;
  let totalCapexEur = 0;
  let totalEffectiveCapexEur = 0;
  let totalAnnualMaintenanceEur = 0;
  let totalAnnualEnergySavingsKwh = 0;
  let totalAnnualCo2ReductionTon = 0;
  let aggregateNPV = 0;
  let hasNPV = false;
  let netProfitEur = 0;
  let hasROI = false;
  const cashFlowContributions: Array<{
    netByYear: number[];
    count: number;
  } | null> = [];
  const perArchetypeOnly: NonNullable<
    RSEPackageAggregate["financialIndicators"]["perArchetypeOnly"]
  > = {};

  for (const selection of input.portfolio) {
    const key = rseArchetypePackageKey(selection.archetype, input.packageId);
    const simulation = simulationsByKey.get(key);
    const financial = financialsByKey.get(key);

    if (!simulation || !financial) {
      throw new Error(
        `Cannot aggregate unavailable RSE result for ${key}. Workflow should block unavailable combinations first.`,
      );
    }

    const buildingCount = selection.buildingCount;
    totalBuildings += buildingCount;
    totalCapexEur += financial.capexEur * buildingCount;
    totalEffectiveCapexEur += financial.effectiveCapexEur * buildingCount;
    totalAnnualMaintenanceEur += financial.annualMaintenanceEur * buildingCount;
    totalAnnualEnergySavingsKwh +=
      simulation.annualEnergySavingsKwh * buildingCount;
    totalAnnualCo2ReductionTon +=
      simulation.annualCo2ReductionTon * buildingCount;

    // Summing P50 values is an approximation (the median of a sum is not the
    // sum of medians), acceptable here because all archetypes share the same
    // backend macro-scenario distributions.
    if (isFiniteNumber(financial.pointForecasts.NPV)) {
      aggregateNPV += financial.pointForecasts.NPV * buildingCount;
      hasNPV = true;
    }

    // The backend computes ROI against the effective (post-incentive) CAPEX,
    // so net profit must be reconstructed on the same basis.
    if (
      isFiniteNumber(financial.pointForecasts.ROI) &&
      financial.effectiveCapexEur > 0
    ) {
      netProfitEur +=
        financial.pointForecasts.ROI *
        financial.effectiveCapexEur *
        buildingCount;
      hasROI = true;
    }

    cashFlowContributions.push(
      financial.cashFlow
        ? {
            netByYear: financial.cashFlow.annualNetCashFlowEur,
            count: buildingCount,
          }
        : null,
    );

    appendPerArchetypeMetric(
      perArchetypeOnly,
      "IRR",
      selection,
      financial.pointForecasts.IRR,
    );
    appendPerArchetypeMetric(
      perArchetypeOnly,
      "PBP",
      selection,
      financial.pointForecasts.PBP,
    );
    appendPerArchetypeMetric(
      perArchetypeOnly,
      "DPP",
      selection,
      financial.pointForecasts.DPP,
    );
  }

  const aggregate: RSEPackageAggregate = {
    packageId: input.packageId,
    totalBuildings,
    totalCapexEur,
    totalEffectiveCapexEur,
    totalAnnualMaintenanceEur,
    totalAnnualEnergySavingsKwh,
    totalAnnualCo2ReductionTon,
    energySavedPerEur: divideOrZero(
      totalAnnualEnergySavingsKwh,
      totalEffectiveCapexEur,
    ),
    co2ReducedTonPerEur: divideOrZero(
      totalAnnualCo2ReductionTon,
      totalEffectiveCapexEur,
    ),
    financialIndicators: {
      aggregateNPV: hasNPV ? aggregateNPV : undefined,
      aggregateROI:
        hasROI && totalEffectiveCapexEur > 0
          ? netProfitEur / totalEffectiveCapexEur
          : undefined,
      aggregatePaybackYears: computePooledPaybackYears(cashFlowContributions),
      perArchetypeOnly: hasPerArchetypeMetrics(perArchetypeOnly)
        ? perArchetypeOnly
        : undefined,
    },
  };

  if (input.goal.kind === "financial") {
    // Budget fit compares against the post-incentive cost. Open product
    // question for when incentives become user-facing: if the subsidy draws
    // from the same budget the user entered, the gross CAPEX would apply.
    const equivalent = divideOrZero(
      totalBuildings * input.goal.maxBudgetEur,
      totalEffectiveCapexEur,
    );
    aggregate.renovatableBuildingEquivalent = Math.min(
      totalBuildings,
      equivalent,
    );
    aggregate.renovatableBuildingsWithinBudget = Math.floor(
      aggregate.renovatableBuildingEquivalent,
    );
  }

  return aggregate;
}

/**
 * Package payback from the pooled cash-flow series: per-archetype P50 net
 * cash flows are scaled by building count and summed, then the break-even
 * point is interpolated linearly within the break-even year (same convention
 * as the backend PBP). Averaging per-archetype payback periods would weight
 * buildings instead of euros and silently drop never-breaking-even
 * archetypes, so it is deliberately avoided here.
 *
 * Returns `undefined` when any archetype lacks a cash-flow series or the
 * pooled series never breaks even; ranking then falls back to its
 * invalid-payback handling.
 */
function computePooledPaybackYears(
  contributions: Array<{ netByYear: number[]; count: number } | null>,
): number | undefined {
  if (contributions.length === 0) {
    return undefined;
  }
  const series: Array<{ netByYear: number[]; count: number }> = [];
  for (const contribution of contributions) {
    if (contribution === null) {
      return undefined;
    }
    series.push(contribution);
  }

  const yearCount = series[0].netByYear.length;
  if (
    yearCount < 2 ||
    series.some((entry) => entry.netByYear.length !== yearCount)
  ) {
    return undefined;
  }

  const pooled = new Array<number>(yearCount).fill(0);
  for (const entry of series) {
    for (let year = 0; year < yearCount; year++) {
      pooled[year] += entry.netByYear[year] * entry.count;
    }
  }

  const investment = -pooled[0];
  if (investment <= 0) {
    return 0;
  }

  let cumulative = 0;
  for (let year = 1; year < yearCount; year++) {
    const previous = cumulative;
    cumulative += pooled[year];
    if (cumulative >= investment) {
      const flow = pooled[year];
      return flow > 0 ? year - 1 + (investment - previous) / flow : year;
    }
  }

  return undefined;
}

function appendPerArchetypeMetric(
  target: NonNullable<
    RSEPackageAggregate["financialIndicators"]["perArchetypeOnly"]
  >,
  metric: "IRR" | "PBP" | "DPP",
  selection: RSEExpandedPortfolioSelection,
  value: number | undefined,
): void {
  if (!isFiniteNumber(value)) {
    return;
  }

  target[metric] ??= {};
  target[metric][rseArchetypeKey(selection.archetype)] = value;
}

function hasPerArchetypeMetrics(
  metrics: NonNullable<
    RSEPackageAggregate["financialIndicators"]["perArchetypeOnly"]
  >,
): boolean {
  return Object.values(metrics).some(
    (metricValues) => Object.keys(metricValues ?? {}).length > 0,
  );
}

function divideOrZero(numerator: number, denominator: number): number {
  if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator)) {
    return 0;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
