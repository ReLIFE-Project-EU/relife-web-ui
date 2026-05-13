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
  let totalAnnualMaintenanceEur = 0;
  let totalAnnualEnergySavingsKwh = 0;
  let totalAnnualCo2ReductionTon = 0;
  let aggregateNPV = 0;
  let hasNPV = false;
  let roiNetProfitEur = 0;
  let hasROI = false;
  let totalPaybackYears = 0;
  let paybackBuildingCount = 0;
  const perArchetypeOnly: NonNullable<
    RSEPackageAggregate["financialIndicators"]["perArchetypeOnly"]
  > = {};

  for (const selection of input.portfolio) {
    const key = rseArchetypePackageKey(selection.archetype, input.packageId);
    const simulation = simulationsByKey.get(key);
    const financial = financialsByKey.get(key);

    if (!simulation || !financial || financial.status !== "available") {
      throw new Error(
        `Cannot aggregate unavailable RSE result for ${key}. Workflow should block unavailable combinations first.`,
      );
    }

    const buildingCount = selection.buildingCount;
    totalBuildings += buildingCount;
    totalCapexEur += financial.capexEur * buildingCount;
    totalAnnualMaintenanceEur += financial.annualMaintenanceEur * buildingCount;
    totalAnnualEnergySavingsKwh +=
      simulation.annualEnergySavingsKwh * buildingCount;
    totalAnnualCo2ReductionTon +=
      simulation.annualCo2ReductionTon * buildingCount;

    if (isFiniteNumber(financial.pointForecasts.NPV)) {
      aggregateNPV += financial.pointForecasts.NPV * buildingCount;
      hasNPV = true;
    }

    if (
      isFiniteNumber(financial.pointForecasts.ROI) &&
      financial.capexEur > 0
    ) {
      roiNetProfitEur +=
        financial.pointForecasts.ROI * financial.capexEur * buildingCount;
      hasROI = true;
    }

    if (isFiniteNumber(financial.pointForecasts.PBP)) {
      totalPaybackYears += financial.pointForecasts.PBP * buildingCount;
      paybackBuildingCount += buildingCount;
    }

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
    totalAnnualMaintenanceEur,
    totalAnnualEnergySavingsKwh,
    totalAnnualCo2ReductionTon,
    energySavedPerEur: divideOrZero(totalAnnualEnergySavingsKwh, totalCapexEur),
    co2ReducedTonPerEur: divideOrZero(
      totalAnnualCo2ReductionTon,
      totalCapexEur,
    ),
    financialIndicators: {
      aggregateNPV: hasNPV ? aggregateNPV : undefined,
      aggregateROI:
        hasROI && totalCapexEur > 0
          ? roiNetProfitEur / totalCapexEur
          : undefined,
      aggregatePaybackYears:
        paybackBuildingCount > 0
          ? totalPaybackYears / paybackBuildingCount
          : undefined,
      perArchetypeOnly: hasPerArchetypeMetrics(perArchetypeOnly)
        ? perArchetypeOnly
        : undefined,
    },
  };

  if (input.goal.kind === "financial") {
    const equivalent = divideOrZero(
      totalBuildings * input.goal.maxBudgetEur,
      totalCapexEur,
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
