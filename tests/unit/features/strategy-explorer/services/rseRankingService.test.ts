import { describe, expect, test } from "vitest";

import { rankPackages } from "../../../../../src/features/strategy-explorer/services/rseRankingService";
import type { RSEPackageAggregate } from "../../../../../src/features/strategy-explorer/types";

function makeAggregate(
  packageId: RSEPackageAggregate["packageId"],
  overrides: Partial<RSEPackageAggregate> = {},
): RSEPackageAggregate {
  const { financialIndicators, ...restOverrides } = overrides;

  return {
    packageId,
    totalBuildings: 10,
    totalCapexEur: 100_000,
    totalEffectiveCapexEur: 100_000,
    totalAnnualMaintenanceEur: 1_000,
    totalAnnualEnergySavingsKwh: 10_000,
    totalAnnualCo2ReductionTon: 2,
    energySavedPerEur: 0.1,
    co2ReducedTonPerEur: 0.00002,
    ...restOverrides,
    financialIndicators: financialIndicators ?? {
      aggregateNPV: 10_000,
      aggregateROI: 0.2,
    },
  };
}

describe("rankPackages", () => {
  test("ranks energy goals by energy saved per euro and absolute savings", () => {
    const rankings = rankPackages(
      [
        makeAggregate("envelope", {
          energySavedPerEur: 0.2,
          totalAnnualEnergySavingsKwh: 5_000,
        }),
        makeAggregate("combined", {
          energySavedPerEur: 0.1,
          totalAnnualEnergySavingsKwh: 20_000,
        }),
      ],
      { kind: "energy" },
      { projectLifetimeYears: 20 },
    );

    expect(rankings[0].packageId).toBe("envelope");
    expect(rankings[0].scoreComponents.energySavedPerEur).toBe(0.55);
    expect(rankings[1].scoreComponents.totalAnnualEnergySavingsKwh).toBe(0.45);
  });

  test("ranks emission goals by CO2 reduced per euro and absolute reduction", () => {
    const rankings = rankPackages(
      [
        makeAggregate("envelope", {
          co2ReducedTonPerEur: 0.00004,
          totalAnnualCo2ReductionTon: 2,
        }),
        makeAggregate("combined", {
          co2ReducedTonPerEur: 0.00002,
          totalAnnualCo2ReductionTon: 10,
        }),
      ],
      { kind: "emission" },
      { projectLifetimeYears: 20 },
    );

    expect(rankings[0].packageId).toBe("envelope");
    expect(rankings[0].scoreComponents.co2ReducedTonPerEur).toBe(0.55);
    expect(rankings[1].scoreComponents.totalAnnualCo2ReductionTon).toBe(0.45);
  });

  test("ranks financial goals by budget fit and aggregate indicators", () => {
    const rankings = rankPackages(
      [
        makeAggregate("envelope", {
          renovatableBuildingsWithinBudget: 1,
          financialIndicators: {
            aggregateROI: 0.1,
            aggregateNPV: 1_000,
            aggregatePaybackYears: 8,
          },
        }),
        makeAggregate("combined", {
          renovatableBuildingsWithinBudget: 5,
          financialIndicators: {
            aggregateROI: 0.3,
            aggregateNPV: 5_000,
            aggregatePaybackYears: 4,
          },
        }),
      ],
      { kind: "financial", maxBudgetEur: 100_000 },
      { projectLifetimeYears: 20 },
    );

    expect(rankings[0].packageId).toBe("combined");
    expect(rankings[0].scoreComponents.aggregateROI).toBe(0.2);
    expect(rankings[0].scoreComponents.aggregateNPV).toBe(0.2);
    expect(rankings[0].scoreComponents.aggregatePayback).toBe(0.1);
  });

  test("normalizes all-equal valid metrics to one", () => {
    const rankings = rankPackages(
      [makeAggregate("envelope"), makeAggregate("combined")],
      { kind: "energy" },
      { projectLifetimeYears: 20 },
    );

    expect(rankings[0].score).toBe(1);
    expect(rankings[1].score).toBe(1);
  });

  test("gives invalid entries zero score when all valid metrics are equal", () => {
    const rankings = rankPackages(
      [
        makeAggregate("envelope", {
          renovatableBuildingsWithinBudget: 1,
          financialIndicators: {
            aggregateROI: 0,
            aggregateNPV: 1_000,
            aggregatePaybackYears: 5,
          },
        }),
        makeAggregate("combined", {
          renovatableBuildingsWithinBudget: 1,
          financialIndicators: {
            aggregateROI: undefined,
            aggregateNPV: 1_000,
            aggregatePaybackYears: 5,
          },
        }),
      ],
      { kind: "financial", maxBudgetEur: 100_000 },
      { projectLifetimeYears: 20 },
    );

    // Both valid metrics (budget fit, NPV, payback) are equal → score 1 each
    // Invalid ROI should contribute 0, not 1
    const envelopeScore = rankings.find((r) => r.packageId === "envelope")!;
    const combinedScore = rankings.find((r) => r.packageId === "combined")!;

    expect(envelopeScore.scoreComponents.aggregateROI).toBe(0.2);
    expect(combinedScore.scoreComponents.aggregateROI).toBe(0);
  });

  test("gives invalid entries zero score when valid values are negative", () => {
    const rankings = rankPackages(
      [
        makeAggregate("envelope", {
          renovatableBuildingsWithinBudget: 1,
          financialIndicators: {
            aggregateROI: -0.2,
            aggregateNPV: -1_000,
            aggregatePaybackYears: 10,
          },
        }),
        makeAggregate("combined", {
          renovatableBuildingsWithinBudget: 1,
          financialIndicators: {
            aggregateROI: undefined,
            aggregateNPV: -1_000,
            aggregatePaybackYears: 10,
          },
        }),
      ],
      { kind: "financial", maxBudgetEur: 100_000 },
      { projectLifetimeYears: 20 },
    );

    // Valid ROI is negative (-0.2), invalid ROI is 0 via finiteOrZero.
    // 0 is the max, so invalid entry would score 1 if valid array were ignored.
    const combinedScore = rankings.find((r) => r.packageId === "combined")!;
    expect(combinedScore.scoreComponents.aggregateROI).toBe(0);
  });

  test("all-invalid financial metric components contribute zero without NaN", () => {
    const rankings = rankPackages(
      [
        makeAggregate("envelope", {
          renovatableBuildingsWithinBudget: 1,
          financialIndicators: {},
        }),
        makeAggregate("combined", {
          renovatableBuildingsWithinBudget: 1,
          financialIndicators: {},
        }),
      ],
      { kind: "financial", maxBudgetEur: 100_000 },
      { projectLifetimeYears: 20 },
    );

    for (const ranking of rankings) {
      expect(Number.isNaN(ranking.score)).toBe(false);
      expect(ranking.scoreComponents.aggregateROI).toBe(0);
      expect(ranking.scoreComponents.aggregateNPV).toBe(0);
      expect(ranking.scoreComponents.aggregatePayback).toBe(0);
    }
  });

  test("ties follow RSE package order", () => {
    const rankings = rankPackages(
      [makeAggregate("combined"), makeAggregate("envelope")],
      { kind: "energy" },
      { projectLifetimeYears: 20 },
    );

    expect(rankings.map((ranking) => ranking.packageId)).toEqual([
      "envelope",
      "combined",
    ]);
  });
});
