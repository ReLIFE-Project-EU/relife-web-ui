import {
  RSE_INVALID_PAYBACK_YEAR_OFFSET,
  RSE_PACKAGE_IDS,
  RSE_RANKING_WEIGHTS,
} from "../constants";
import type {
  RSEPackageAggregate,
  RSERankingResult,
  RSERenovationGoal,
} from "../types";

export interface RSERankingOptions {
  projectLifetimeYears: number;
}

/** How a criterion's values become a 0-1 score. */
type RankingScale =
  /** Best scores 1, others their share of it, from zero. Needs a real zero. */
  | "share-of-best"
  /** Best scores 1, worst 0. Exaggerates small gaps, so fallback only. */
  | "best-to-worst";

interface RankingMetric {
  key: string;
  weight: number;
  values: number[];
  valid: boolean[];
  scale: RankingScale;
  /** Used when `scale` gives no ordering. */
  fallbackScale?: RankingScale;
}

export function rankPackages(
  aggregates: RSEPackageAggregate[],
  goal: RSERenovationGoal,
  options: RSERankingOptions,
): RSERankingResult[] {
  const metrics = buildMetrics(aggregates, goal, options);
  const componentScores = metrics.map((metric) => ({
    key: metric.key,
    weight: metric.weight,
    normalized: normalizeMetric(metric),
  }));

  return aggregates
    .map((aggregate, aggregateIndex) => {
      const scoreComponents = Object.fromEntries(
        componentScores.map((component) => [
          component.key,
          sanitizeScore(
            component.normalized[aggregateIndex] * component.weight,
          ),
        ]),
      );
      const score = sanitizeScore(
        Object.values(scoreComponents).reduce((sum, value) => sum + value, 0),
      );

      return {
        packageId: aggregate.packageId,
        rank: 0,
        score,
        scoreComponents,
        explanation: explainRanking(goal),
      };
    })
    .sort(compareRankingResults)
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
}

function buildMetrics(
  aggregates: RSEPackageAggregate[],
  goal: RSERenovationGoal,
  options: RSERankingOptions,
): RankingMetric[] {
  if (goal.kind === "energy") {
    return [
      {
        key: "energySavedPerEur",
        weight: RSE_RANKING_WEIGHTS.energy.savedPerEur,
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.energySavedPerEur),
        ),
        valid: aggregates.map(() => true),
        scale: "share-of-best",
        fallbackScale: "best-to-worst",
      },
      {
        key: "totalAnnualEnergySavingsKwh",
        weight: RSE_RANKING_WEIGHTS.energy.absoluteSavings,
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.totalAnnualEnergySavingsKwh),
        ),
        valid: aggregates.map(() => true),
        scale: "share-of-best",
        fallbackScale: "best-to-worst",
      },
    ];
  }

  if (goal.kind === "emission") {
    return [
      {
        key: "co2ReducedTonPerEur",
        weight: RSE_RANKING_WEIGHTS.emission.reducedTonPerEur,
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.co2ReducedTonPerEur),
        ),
        valid: aggregates.map(() => true),
        scale: "share-of-best",
        fallbackScale: "best-to-worst",
      },
      {
        key: "totalAnnualCo2ReductionTon",
        weight: RSE_RANKING_WEIGHTS.emission.absoluteReduction,
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.totalAnnualCo2ReductionTon),
        ),
        valid: aggregates.map(() => true),
        scale: "share-of-best",
        fallbackScale: "best-to-worst",
      },
    ];
  }

  const paybackValues = aggregates.map(
    (aggregate) => aggregate.financialIndicators.aggregatePaybackYears,
  );
  const worstPayback =
    options.projectLifetimeYears + RSE_INVALID_PAYBACK_YEAR_OFFSET;

  return [
    {
      key: "renovatableBuildingsWithinBudget",
      weight: RSE_RANKING_WEIGHTS.financial.renovatableBuildingsWithinBudget,
      values: aggregates.map((aggregate) =>
        finiteOrZero(aggregate.renovatableBuildingsWithinBudget),
      ),
      valid: aggregates.map(() => true),
      // No fallback needed since a dwelling count can't go negative; all-zero means a true tie.
      scale: "share-of-best",
    },
    {
      key: "aggregateROI",
      weight: RSE_RANKING_WEIGHTS.financial.aggregateRoi,
      values: aggregates.map((aggregate) =>
        finiteOrZero(aggregate.financialIndicators.aggregateROI),
      ),
      valid: aggregates.map((aggregate) =>
        isFiniteNumber(aggregate.financialIndicators.aggregateROI),
      ),
      scale: "share-of-best",
      fallbackScale: "best-to-worst",
    },
    {
      key: "aggregateNPV",
      weight: RSE_RANKING_WEIGHTS.financial.aggregateNpv,
      values: aggregates.map((aggregate) =>
        finiteOrZero(aggregate.financialIndicators.aggregateNPV),
      ),
      valid: aggregates.map((aggregate) =>
        isFiniteNumber(aggregate.financialIndicators.aggregateNPV),
      ),
      scale: "share-of-best",
      fallbackScale: "best-to-worst",
    },
    {
      key: "aggregatePayback",
      weight: RSE_RANKING_WEIGHTS.financial.aggregatePayback,
      // Higher scores for shorter payback periods.
      values: paybackValues.map((value) =>
        isFiniteNumber(value) ? worstPayback - value : 0,
      ),
      valid: paybackValues.map(isFiniteNumber),
      scale: "share-of-best",
      fallbackScale: "best-to-worst",
    },
  ];
}

/** Scale a criterion onto [0, 1], falling back when it yields no ordering. */
function normalizeMetric(metric: RankingMetric): number[] {
  const { values, valid, scale, fallbackScale } = metric;
  return (
    applyScale(scale, values, valid) ??
    (fallbackScale ? applyScale(fallbackScale, values, valid) : null) ??
    values.map(() => 0)
  );
}

/** Returns null when the scale cannot order these values. */
function applyScale(
  scale: RankingScale,
  values: number[],
  valid: boolean[],
): number[] | null {
  switch (scale) {
    case "share-of-best":
      return shareOfBest(values, valid);
    case "best-to-worst":
      return bestToWorst(values, valid);
  }
}

/**
 * Anchored at zero so gap sizes survive: a package scoring nearly as well as
 * the best keeps nearly the same score.
 */
function shareOfBest(values: number[], valid: boolean[]): number[] | null {
  const best = Math.max(...values.filter((_, i) => valid[i]), 0);
  if (best <= 0) {
    return null;
  }
  return values.map((value, i) => (valid[i] ? Math.max(0, value) / best : 0));
}

/**
 * Spreads across the observed range, so it orders values that never clear zero.
 * Collapses to 0/1 with only two packages, hence fallback use only.
 */
function bestToWorst(values: number[], valid: boolean[]): number[] | null {
  const usable = values.filter((_, i) => valid[i]);
  if (usable.length === 0) {
    return null;
  }
  const worst = Math.min(...usable);
  const best = Math.max(...usable);
  if (best === worst) {
    return null;
  }
  return values.map((value, i) =>
    valid[i] ? (value - worst) / (best - worst) : 0,
  );
}

function finiteOrZero(value: number | undefined): number {
  return isFiniteNumber(value) ? value : 0;
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeScore(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function compareRankingResults(
  left: RSERankingResult,
  right: RSERankingResult,
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  return packageOrder(left.packageId) - packageOrder(right.packageId);
}

function packageOrder(packageId: RSEPackageAggregate["packageId"]): number {
  return RSE_PACKAGE_IDS.indexOf(packageId);
}

function explainRanking(goal: RSERenovationGoal): string {
  switch (goal.kind) {
    case "energy":
      return "Ranks packages by annual primary energy saved per euro and total annual primary energy savings.";
    case "emission":
      return "Ranks packages by annual CO2 reduction per euro and total annual CO2 reduction.";
    case "financial":
      return "Ranks packages by dwellings renovated within budget, aggregate ROI, aggregate NPV, and aggregate payback when available.";
  }
}
