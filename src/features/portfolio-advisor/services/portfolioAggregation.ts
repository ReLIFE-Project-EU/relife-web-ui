/**
 * Portfolio-level aggregation for the PRA results screen.
 *
 * Indicators are combined by their own meaning rather than averaged across
 * buildings: money is summed, ratios are rebuilt from the summed money, and
 * payback comes from the pooled cash-flow series. An optional figure that any
 * contributing building lacks makes the whole total unavailable, so a gap never
 * reads as a smaller number.
 *
 * Parameterised by package id so that several named packages (#69) can each be
 * aggregated over the same building set without changing this function.
 */

import type { BuildingAnalysisResult } from "../context/types";
import { baselineScenarioOf } from "./scenarioLookup";
import { computeLifetimeCarbonKgCo2e } from "../../../services/carrierSavingsService";
import { appraisedFigures } from "../../../services/savingsState";
import { computePooledPaybackYears } from "../../../utils/financialCalculations";

const KG_PER_TONNE = 1000;

interface PortfolioCoverage {
  /** Every building the user entered, whether or not it produced a result. */
  totalBuildings: number;
  /** Buildings inside the totals below. */
  contributing: number;
  errored: number;
  rejected: number;
  /** Analysed successfully but missing this package's scenario or its financials. */
  withoutPackage: number;
}

export interface PortfolioPackageAggregate {
  packageId: string;
  coverage: PortfolioCoverage;

  totalCapexEur: number;
  totalNpvEur: number | undefined;
  totalAnnualMaintenanceEur: number | undefined;

  totalThermalNeedsBeforeKwh: number;
  totalThermalNeedsAfterKwh: number;
  totalDeliveredBeforeKwh: number | undefined;
  totalDeliveredAfterKwh: number | undefined;

  totalAnnualEmissionsBeforeTon: number | undefined;
  totalAnnualEmissionsAfterTon: number | undefined;
  totalEmbodiedCarbonTon: number | undefined;
  totalWholeLifeCarbonTon: number | undefined;

  portfolioRoi: number | undefined;
  portfolioPaybackYears: number | undefined;
}

/**
 * A building's pre-renovation figures. The estimate's baseline and the
 * "current" scenario are the same reduction; emissions exist only on the
 * scenario, and thermal need is read from the estimate so rejected buildings
 * still report it.
 */
function baselineFiguresOf(result: BuildingAnalysisResult) {
  const scenario = baselineScenarioOf(result);
  return {
    thermalKwh: result.estimation?.baseline.thermalNeed,
    deliveredKwh: scenario?.deliveredTotal,
    emissionsTon: scenario?.annualEmissionsTonCo2e,
  };
}

/** Running sum that turns unavailable as soon as one contributor lacks a value. */
interface OptionalTotal {
  sum: number;
  complete: boolean;
}

function newOptionalTotal(): OptionalTotal {
  return { sum: 0, complete: true };
}

function addOptional(total: OptionalTotal, value: number | undefined): void {
  if (isFiniteNumber(value)) {
    total.sum += value;
  } else {
    total.complete = false;
  }
}

function resolveOptional(
  total: OptionalTotal,
  contributors: number,
): number | undefined {
  return total.complete && contributors > 0 ? total.sum : undefined;
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function aggregatePortfolioPackage(input: {
  packageId: string;
  results: BuildingAnalysisResult[];
  totalBuildings: number;
  projectLifetimeYears: number;
}): PortfolioPackageAggregate {
  const { packageId, results, totalBuildings, projectLifetimeYears } = input;

  const coverage: PortfolioCoverage = {
    totalBuildings,
    contributing: 0,
    errored: 0,
    rejected: 0,
    withoutPackage: 0,
  };

  let totalCapexEur = 0;
  let totalThermalNeedsBeforeKwh = 0;
  let totalThermalNeedsAfterKwh = 0;

  const npv = newOptionalTotal();
  const netProfit = newOptionalTotal();
  const maintenance = newOptionalTotal();
  const deliveredBefore = newOptionalTotal();
  const deliveredAfter = newOptionalTotal();
  const emissionsBefore = newOptionalTotal();
  const emissionsAfter = newOptionalTotal();
  const embodiedCarbon = newOptionalTotal();
  const wholeLifeCarbon = newOptionalTotal();

  const cashFlowContributions: Array<{
    netByYear: number[];
    count: number;
  } | null> = [];

  for (const result of results) {
    if (result.status === "error") {
      coverage.errored++;
      continue;
    }
    if (result.status === "rejected") {
      coverage.rejected++;
      continue;
    }
    if (result.status !== "success") continue;

    const scenario = result.scenarios?.find(
      (candidate) => candidate.id === packageId,
    );
    const financials = result.financialResults;
    if (!scenario || !financials) {
      coverage.withoutPackage++;
      continue;
    }

    coverage.contributing++;
    const baseline = baselineFiguresOf(result);

    totalCapexEur += financials.capitalExpenditure;
    addOptional(maintenance, financials.annualMaintenanceCost);

    // A skipped appraisal (no savings, no carrier split, or a subsidy covering
    // the whole cost) has no return, but the building still carries real CAPEX,
    // so the portfolio return is unknown rather than zero.
    const appraised = appraisedFigures(financials);
    addOptional(npv, appraised?.pointForecasts.NPV);
    // ROI is reported against the upfront share of the post-subsidy CAPEX;
    // every building has the same loan share, so CAPEX weights it correctly.
    const roi = appraised?.pointForecasts.ROI;
    addOptional(
      netProfit,
      roi != null ? roi * financials.capitalExpenditure : undefined,
    );

    const netByYear = appraised?.cashFlowData?.annual_net_cash_flow;
    cashFlowContributions.push(netByYear ? { netByYear, count: 1 } : null);

    totalThermalNeedsBeforeKwh += baseline.thermalKwh ?? 0;
    totalThermalNeedsAfterKwh += scenario.annualEnergyNeeds;
    addOptional(deliveredBefore, baseline.deliveredKwh);
    addOptional(deliveredAfter, scenario.deliveredTotal);

    addOptional(emissionsBefore, baseline.emissionsTon);
    addOptional(emissionsAfter, scenario.annualEmissionsTonCo2e);
    addOptional(
      embodiedCarbon,
      isFiniteNumber(scenario.embodiedCarbonKgCo2e)
        ? scenario.embodiedCarbonKgCo2e / KG_PER_TONNE
        : undefined,
    );
    const wholeLifeKgCo2e = computeLifetimeCarbonKgCo2e({
      embodiedCarbonKgCo2e: scenario.embodiedCarbonKgCo2e,
      annualOperationalEmissionsTonCo2e: scenario.annualEmissionsTonCo2e,
      projectLifetimeYears,
    });
    addOptional(
      wholeLifeCarbon,
      isFiniteNumber(wholeLifeKgCo2e)
        ? wholeLifeKgCo2e / KG_PER_TONNE
        : undefined,
    );
  }

  const contributors = coverage.contributing;
  const netProfitEur = resolveOptional(netProfit, contributors);

  return {
    packageId,
    coverage,
    totalCapexEur,
    totalNpvEur: resolveOptional(npv, contributors),
    totalAnnualMaintenanceEur: resolveOptional(maintenance, contributors),
    totalThermalNeedsBeforeKwh,
    totalThermalNeedsAfterKwh,
    totalDeliveredBeforeKwh: resolveOptional(deliveredBefore, contributors),
    totalDeliveredAfterKwh: resolveOptional(deliveredAfter, contributors),
    totalAnnualEmissionsBeforeTon: resolveOptional(
      emissionsBefore,
      contributors,
    ),
    totalAnnualEmissionsAfterTon: resolveOptional(emissionsAfter, contributors),
    totalEmbodiedCarbonTon: resolveOptional(embodiedCarbon, contributors),
    totalWholeLifeCarbonTon: resolveOptional(wholeLifeCarbon, contributors),
    portfolioRoi:
      netProfitEur !== undefined && totalCapexEur > 0
        ? netProfitEur / totalCapexEur
        : undefined,
    portfolioPaybackYears: computePooledPaybackYears(cashFlowContributions),
  };
}
