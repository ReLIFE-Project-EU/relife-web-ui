import { describe, expect, test } from "vitest";

import { aggregatePortfolioPackage } from "../../../../src/features/portfolio-advisor/services/portfolioAggregation";
import type { BuildingAnalysisResult } from "../../../../src/features/portfolio-advisor/context/types";

const PACKAGE_ID = "renovated";

/**
 * A successful building. Overrides let each test vary only what it is about,
 * so an assertion failure points at the field under test.
 */
function successResult(options: {
  id: string;
  capex: number;
  roi: number;
  npv?: number;
  netByYear?: number[];
  embodiedCarbonKgCo2e?: number;
  /** Omit the risk result the way FinancialService does when it skips the call. */
  unappraised?: boolean;
}): BuildingAnalysisResult {
  const scenarioBase = {
    epcClass: "B",
    annualEnergyNeeds: 8_000,
    heatingCoolingNeeds: 8_000,
    flexibilityIndex: 50,
    comfortIndex: 50,
    measureIds: [],
    measures: [],
  };

  return {
    buildingId: options.id,
    status: "success",
    estimation: {
      estimatedEPC: "E",
      annualEnergyNeeds: 12_000,
      heatingCoolingNeeds: 12_000,
      heatingDemand: 9_000,
      coolingDemand: 3_000,
      flexibilityIndex: 50,
      comfortIndex: 50,
      annualEnergyConsumption: 12_000,
      deliveredTotal: 9_999,
      archetypeFloorArea: 100,
    },
    scenarios: [
      {
        ...scenarioBase,
        id: "current",
        label: "Current Status",
        epcClass: "E",
        annualEnergyNeeds: 12_000,
        heatingCoolingNeeds: 12_000,
        annualEmissionsTonCo2e: 4,
        deliveredTotal: 14_000,
        packageId: "current",
      },
      {
        ...scenarioBase,
        id: PACKAGE_ID,
        label: "After Renovation",
        annualEmissionsTonCo2e: 1.5,
        deliveredTotal: 5_000,
        embodiedCarbonKgCo2e: options.embodiedCarbonKgCo2e,
        packageId: PACKAGE_ID,
      },
    ],
    financialResults: {
      arv: null,
      capitalExpenditure: options.capex,
      returnOnInvestment: options.roi,
      paybackTime: 10,
      netPresentValue: options.npv ?? 1_000,
      afterRenovationValue: null,
      riskAssessment: options.unappraised
        ? null
        : ({
            pointForecasts: {},
            metadata: {},
            ...(options.netByYear
              ? {
                  cashFlowData: {
                    years: options.netByYear.map((_, index) => index),
                    annual_inflows: [],
                    annual_outflows: [],
                    annual_net_cash_flow: options.netByYear,
                  },
                }
              : {}),
          } as unknown as NonNullable<
            BuildingAnalysisResult["financialResults"]
          >["riskAssessment"]),
    },
  };
}

function aggregate(results: BuildingAnalysisResult[]) {
  return aggregatePortfolioPackage({
    packageId: PACKAGE_ID,
    results,
    totalBuildings: results.length,
    projectLifetimeYears: 20,
  });
}

describe("portfolio ROI", () => {
  test("weights by euros invested, not by building count", () => {
    // A mean of the two ratios would be 0.30. Weighted by CAPEX, the small
    // building's high return barely moves the portfolio.
    const result = aggregate([
      successResult({ id: "small", capex: 10_000, roi: 0.5 }),
      successResult({ id: "large", capex: 990_000, roi: 0.1 }),
    ]);

    expect(result.portfolioRoi).toBeCloseTo(0.104, 3);
  });

  test("is unavailable when nothing was invested", () => {
    const result = aggregate([successResult({ id: "free", capex: 0, roi: 0 })]);

    expect(result.portfolioRoi).toBeUndefined();
  });
});

describe("pooled payback", () => {
  test("interpolates within the break-even year of the summed series", () => {
    // Pooled: -200 at year 0, then +50/year. Recovered halfway through year 4.
    const result = aggregate([
      successResult({
        id: "a",
        capex: 100,
        roi: 0.1,
        netByYear: [-100, 25, 25, 25, 25, 25],
      }),
      successResult({
        id: "b",
        capex: 100,
        roi: 0.1,
        netByYear: [-100, 25, 25, 25, 25, 25],
      }),
    ]);

    expect(result.portfolioPaybackYears).toBeCloseTo(4, 5);
  });

  test("is unavailable when the pooled series never breaks even", () => {
    const result = aggregate([
      successResult({ id: "a", capex: 100, roi: 0, netByYear: [-100, 1, 1] }),
    ]);

    expect(result.portfolioPaybackYears).toBeUndefined();
  });

  test("is unavailable when a building has no cash-flow series", () => {
    const result = aggregate([
      successResult({
        id: "a",
        capex: 100,
        roi: 0.1,
        netByYear: [-100, 60, 60],
      }),
      successResult({ id: "b", capex: 100, roi: 0.1 }),
    ]);

    expect(result.portfolioPaybackYears).toBeUndefined();
  });
});

describe("optional totals", () => {
  test("one building without material carbon makes the total unavailable", () => {
    const result = aggregate([
      successResult({
        id: "a",
        capex: 100,
        roi: 0.1,
        embodiedCarbonKgCo2e: 5_000,
      }),
      successResult({ id: "b", capex: 100, roi: 0.1 }),
    ]);

    // Not 5 tonnes: a partial sum would read as a genuinely smaller footprint.
    expect(result.totalEmbodiedCarbonTon).toBeUndefined();
    expect(result.totalWholeLifeCarbonTon).toBeUndefined();
  });

  test("sums material and whole-life carbon when every building supplies it", () => {
    const result = aggregate([
      successResult({
        id: "a",
        capex: 100,
        roi: 0.1,
        embodiedCarbonKgCo2e: 5_000,
      }),
      successResult({
        id: "b",
        capex: 100,
        roi: 0.1,
        embodiedCarbonKgCo2e: 3_000,
      }),
    ]);

    expect(result.totalEmbodiedCarbonTon).toBeCloseTo(8, 5);
    // Each building also carries 1.5 t/year operational over 20 years.
    expect(result.totalWholeLifeCarbonTon).toBeCloseTo(8 + 2 * 30, 5);
  });
});

describe("coverage", () => {
  test("counts failures without letting them into the totals", () => {
    const errored: BuildingAnalysisResult = {
      buildingId: "err",
      status: "error",
      error: "boom",
    };
    const rejected: BuildingAnalysisResult = {
      buildingId: "rej",
      status: "rejected",
    };

    const result = aggregatePortfolioPackage({
      packageId: PACKAGE_ID,
      results: [
        successResult({ id: "ok", capex: 1_000, roi: 0.2, npv: 500 }),
        errored,
        rejected,
      ],
      totalBuildings: 3,
      projectLifetimeYears: 20,
    });

    expect(result.coverage).toEqual({
      totalBuildings: 3,
      contributing: 1,
      errored: 1,
      rejected: 1,
      withoutPackage: 0,
    });
    expect(result.totalCapexEur).toBe(1_000);
    expect(result.totalNpvEur).toBe(500);
  });
});

describe("unappraised buildings", () => {
  test("do not let a skipped risk assessment read as zero return", () => {
    // FinancialService substitutes NPV/ROI zeros when it skips the call, so
    // summing them would understate both the total and the ratio.
    const result = aggregate([
      successResult({ id: "appraised", capex: 100_000, roi: 2, npv: 200_000 }),
      successResult({
        id: "at-target",
        capex: 100_000,
        roi: 0,
        unappraised: true,
      }),
    ]);

    expect(result.totalNpvEur).toBeUndefined();
    expect(result.portfolioRoi).toBeUndefined();
    // CAPEX is known regardless, so it still sums.
    expect(result.totalCapexEur).toBe(200_000);
  });
});

describe("delivered energy baseline", () => {
  test("reads the re-simulated baseline, not the step-1 estimation", () => {
    // The two disagree by ~15% in practice, and the financial savings are
    // priced against the baseline scenario.
    const result = aggregate([
      successResult({ id: "a", capex: 100, roi: 0.1 }),
    ]);

    expect(result.totalDeliveredBeforeKwh).toBe(14_000);
    expect(result.totalDeliveredAfterKwh).toBe(5_000);
  });
});

describe("no contributing buildings", () => {
  test("reports optional totals as unavailable rather than zero", () => {
    const result = aggregatePortfolioPackage({
      packageId: PACKAGE_ID,
      results: [{ buildingId: "rej", status: "rejected" }],
      totalBuildings: 1,
      projectLifetimeYears: 20,
    });

    expect(result.coverage.contributing).toBe(0);
    expect(result.totalEmbodiedCarbonTon).toBeUndefined();
    expect(result.totalWholeLifeCarbonTon).toBeUndefined();
    expect(result.totalAnnualMaintenanceEur).toBeUndefined();
    expect(result.totalDeliveredBeforeKwh).toBeUndefined();
    expect(result.totalAnnualEmissionsBeforeTon).toBeUndefined();
    expect(result.totalNpvEur).toBeUndefined();
  });
});
