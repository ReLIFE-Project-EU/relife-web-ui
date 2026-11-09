import type { AppraisedPackage } from "../../../types/renovation";
import type {
  RSEExpandedPortfolioSelection,
  RSEFinancialResult,
  RSEPackageAggregate,
  RSEPackageId,
  RSERenovationGoal,
  RSESimulationResult,
} from "../types";
import { computeLifetimeCarbonKgCo2e } from "../../../services/carrierSavingsService";
import { computePooledPayback } from "../../../utils/financialCalculations";
import { rseArchetypePackageKey, rseArchetypeKey } from "./rseKeys";

export interface RSEPackageAggregationInput {
  packageId: RSEPackageId;
  portfolio: RSEExpandedPortfolioSelection[];
  simulations: RSESimulationResult[];
  financials: RSEFinancialResult[];
  goal: RSERenovationGoal;
  /** Horizon for lifetime carbon; the same lifetime the ranking uses. */
  projectLifetimeYears: number;
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
  let totalEmbodiedCarbonTon = 0;
  let hasEmbodiedCarbon = true;
  let totalWholeLifeCarbonTon = 0;
  let hasWholeLifeCarbon = true;
  let aggregateNPV = 0;
  let hasNPV = false;
  let netProfitEur = 0;
  let hasROI = false;
  const cashFlowContributions: Array<{
    netByYear: number[];
    count: number;
  } | null> = [];
  const perArchetypeAppraisals: Record<string, AppraisedPackage> = {};

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
    if (financial.embodiedCarbonKgCo2e === undefined) {
      hasEmbodiedCarbon = false;
      hasWholeLifeCarbon = false;
    } else {
      totalEmbodiedCarbonTon +=
        (financial.embodiedCarbonKgCo2e / 1000) * buildingCount;
      const wholeLifeKgCo2e = computeLifetimeCarbonKgCo2e({
        embodiedCarbonKgCo2e: financial.embodiedCarbonKgCo2e,
        annualOperationalEmissionsTonCo2e:
          simulation.renovatedAnnualEmissionsTonCo2eq,
        projectLifetimeYears: input.projectLifetimeYears,
      });
      if (wholeLifeKgCo2e === undefined) {
        hasWholeLifeCarbon = false;
      } else {
        totalWholeLifeCarbonTon += (wholeLifeKgCo2e / 1000) * buildingCount;
      }
    }

    const appraisal = financial.appraisal;
    const forecasts = appraisal?.pointForecasts;

    // Summing P50 values is an approximation (the median of a sum is not the
    // sum of medians), acceptable here because all archetypes share the same
    // backend macro-scenario distributions.
    if (isFiniteNumber(forecasts?.NPV)) {
      aggregateNPV += forecasts.NPV * buildingCount;
      hasNPV = true;
    }

    // The backend computes ROI against the upfront share of the effective
    // CAPEX; every archetype has the same loan share, so CAPEX weights it.
    if (isFiniteNumber(forecasts?.ROI) && financial.effectiveCapexEur > 0) {
      netProfitEur +=
        forecasts.ROI * financial.effectiveCapexEur * buildingCount;
      hasROI = true;
    }

    const netByYear = appraisal?.cashFlowData?.annual_net_cash_flow;
    cashFlowContributions.push(
      netByYear ? { netByYear, count: buildingCount } : null,
    );

    if (appraisal) {
      perArchetypeAppraisals[rseArchetypeKey(selection.archetype)] = appraisal;
    }
  }

  const aggregate: RSEPackageAggregate = {
    packageId: input.packageId,
    totalBuildings,
    totalCapexEur,
    totalEffectiveCapexEur,
    totalAnnualMaintenanceEur,
    totalAnnualEnergySavingsKwh,
    totalAnnualCo2ReductionTon,
    totalEmbodiedCarbonTon: hasEmbodiedCarbon
      ? totalEmbodiedCarbonTon
      : undefined,
    totalWholeLifeCarbonTon: hasWholeLifeCarbon
      ? totalWholeLifeCarbonTon
      : undefined,
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
      aggregatePayback: computePooledPayback(cashFlowContributions),
      perArchetypeAppraisals:
        Object.keys(perArchetypeAppraisals).length > 0
          ? perArchetypeAppraisals
          : undefined,
    },
  };

  if (input.goal.kind === "financial") {
    // Budget fit compares against the post-subsidy cost: the budget is defined
    // as the owner's share, with any subsidy funded from outside it, so a
    // subsidy makes the budget reach further. Stated for the reader in the
    // `rse-renovatable-buildings` concept caveat. (Were the subsidy drawn from
    // this same budget, gross CAPEX would apply instead and a subsidy would not
    // change reach at all.)
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

function divideOrZero(numerator: number, denominator: number): number {
  if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator)) {
    return 0;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
