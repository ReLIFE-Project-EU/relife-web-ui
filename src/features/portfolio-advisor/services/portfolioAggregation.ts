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

  /** Counts of contributing buildings per EPC class letter. */
  epcCountsBefore: Record<string, number>;
  epcCountsAfter: Record<string, number>;
}

/**
 * A building's pre-renovation figures.
 *
 * Delivered energy and emissions come from the re-simulated baseline scenario
 * because that is what FinancialService prices the savings against; the two
 * sources disagree materially (~15% on delivered energy in a plain run), so a
 * chart built on the estimation would contradict the money beside it. Thermal
 * needs and EPC stay on the estimation, where the rest of the screen reads
 * them, and where the two sources agree. Resolved here so the split can later
 * be unified in one place.
 */
function baselineFiguresOf(result: BuildingAnalysisResult) {
  const scenario = baselineScenarioOf(result);
  return {
    thermalKwh: result.estimation?.annualEnergyNeeds,
    deliveredKwh: scenario?.deliveredTotal,
    epcClass: result.estimation?.estimatedEPC,
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

function tallyEpc(counts: Record<string, number>, epcClass?: string): void {
  if (!epcClass) return;
  counts[epcClass] = (counts[epcClass] ?? 0) + 1;
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

  const epcCountsBefore: Record<string, number> = {};
  const epcCountsAfter: Record<string, number> = {};
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

    // FinancialService substitutes zeros for NPV/ROI when it skips the risk
    // assessment (no savings, no carrier split, or a subsidy covering the whole
    // cost). Those buildings still carry real CAPEX, so counting their return as
    // zero understates the portfolio rather than admitting it is unknown.
    const appraised = financials.riskAssessment !== null;
    addOptional(npv, appraised ? financials.netPresentValue : undefined);
    // ROI is reported against the post-subsidy CAPEX, so net profit must be
    // rebuilt on that same basis before the portfolio ratio is taken.
    addOptional(
      netProfit,
      appraised
        ? financials.returnOnInvestment * financials.capitalExpenditure
        : undefined,
    );

    const netByYear =
      financials.riskAssessment?.cashFlowData?.annual_net_cash_flow;
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

    tallyEpc(epcCountsBefore, baseline.epcClass);
    tallyEpc(epcCountsAfter, scenario.epcClass);
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
    epcCountsBefore,
    epcCountsAfter,
  };
}
