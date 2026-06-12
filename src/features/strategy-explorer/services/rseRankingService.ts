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

type MetricDirection = "higher" | "lower";

interface RankingMetric {
  key: string;
  weight: number;
  direction: MetricDirection;
  values: number[];
  valid: boolean[];
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
    normalized: normalizeMetric(metric.values, metric.direction, metric.valid),
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
        direction: "higher",
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.energySavedPerEur),
        ),
        valid: aggregates.map(() => true),
      },
      {
        key: "totalAnnualEnergySavingsKwh",
        weight: RSE_RANKING_WEIGHTS.energy.absoluteSavings,
        direction: "higher",
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.totalAnnualEnergySavingsKwh),
        ),
        valid: aggregates.map(() => true),
      },
    ];
  }

  if (goal.kind === "emission") {
    return [
      {
        key: "co2ReducedTonPerEur",
        weight: RSE_RANKING_WEIGHTS.emission.reducedTonPerEur,
        direction: "higher",
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.co2ReducedTonPerEur),
        ),
        valid: aggregates.map(() => true),
      },
      {
        key: "totalAnnualCo2ReductionTon",
        weight: RSE_RANKING_WEIGHTS.emission.absoluteReduction,
        direction: "higher",
        values: aggregates.map((aggregate) =>
          finiteOrZero(aggregate.totalAnnualCo2ReductionTon),
        ),
        valid: aggregates.map(() => true),
      },
    ];
  }

  const paybackValues = aggregates.map(
    (aggregate) => aggregate.financialIndicators.aggregatePaybackYears,
  );
  const hasAnyValidPayback = paybackValues.some(isFiniteNumber);
  const worstPayback =
    options.projectLifetimeYears + RSE_INVALID_PAYBACK_YEAR_OFFSET;

  return [
    {
      key: "renovatableBuildingsWithinBudget",
      weight: RSE_RANKING_WEIGHTS.financial.renovatableBuildingsWithinBudget,
      direction: "higher",
      values: aggregates.map((aggregate) =>
        finiteOrZero(aggregate.renovatableBuildingsWithinBudget),
      ),
      valid: aggregates.map(() => true),
    },
    {
      key: "aggregateROI",
      weight: RSE_RANKING_WEIGHTS.financial.aggregateRoi,
      direction: "higher",
      values: aggregates.map((aggregate) =>
        finiteOrZero(aggregate.financialIndicators.aggregateROI),
      ),
      valid: aggregates.map((aggregate) =>
        isFiniteNumber(aggregate.financialIndicators.aggregateROI),
      ),
    },
    {
      key: "aggregateNPV",
      weight: RSE_RANKING_WEIGHTS.financial.aggregateNpv,
      direction: "higher",
      values: aggregates.map((aggregate) =>
        finiteOrZero(aggregate.financialIndicators.aggregateNPV),
      ),
      valid: aggregates.map((aggregate) =>
        isFiniteNumber(aggregate.financialIndicators.aggregateNPV),
      ),
    },
    {
      key: "aggregatePayback",
      weight: RSE_RANKING_WEIGHTS.financial.aggregatePayback,
      direction: "lower",
      values: hasAnyValidPayback
        ? paybackValues.map((value) =>
            isFiniteNumber(value) ? value : worstPayback,
          )
        : aggregates.map(() => 0),
      valid: paybackValues.map(isFiniteNumber),
    },
  ];
}

function normalizeMetric(
  values: number[],
  direction: MetricDirection,
  valid = values.map(() => true),
): number[] {
  if (values.length === 0) {
    return [];
  }
  if (!valid.some(Boolean)) {
    return values.map(() => 0);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return values.map((_, i) => (valid[i] ? 1 : 0));
  }

  return values.map((value, i) =>
    valid[i]
      ? direction === "higher"
        ? (value - min) / (max - min)
        : (max - value) / (max - min)
      : 0,
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
      return "Ranks packages by buildings renovated within budget, aggregate ROI, aggregate NPV, and aggregate payback when available.";
  }
}
