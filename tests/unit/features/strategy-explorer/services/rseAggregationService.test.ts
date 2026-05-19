import { describe, expect, test } from "vitest";

import { aggregatePackage } from "../../../../../src/features/strategy-explorer/services/rseAggregationService";
import type {
  RSEExpandedPortfolioSelection,
  RSEFinancialResult,
  RSESimulationResult,
} from "../../../../../src/features/strategy-explorer/types";

function makePortfolio(): RSEExpandedPortfolioSelection[] {
  return [
    {
      archetype: { country: "IT", category: "Residential", name: "A" },
      buildingCount: 1,
      details: { floorArea: 100 } as RSEExpandedPortfolioSelection["details"],
    },
    {
      archetype: { country: "IT", category: "Residential", name: "B" },
      buildingCount: 3,
      details: { floorArea: 200 } as RSEExpandedPortfolioSelection["details"],
    },
  ];
}

function makeSimulation(
  name: string,
  annualEnergySavingsKwh: number,
  annualCo2ReductionTon: number,
): RSESimulationResult {
  return {
    key: {
      archetype: { country: "IT", category: "Residential", name },
      packageId: "envelope",
      cacheVersion: "v1",
    },
    archetype: { country: "IT", category: "Residential", name },
    packageId: "envelope",
    cacheVersion: "v1",
    baselineAnnualEnergyKwh: 10_000,
    renovatedAnnualEnergyKwh: 10_000 - annualEnergySavingsKwh,
    annualEnergySavingsKwh,
    annualEnergySavingsPercentage: 20,
    baselineAnnualEmissionsTonCo2eq: 2,
    renovatedAnnualEmissionsTonCo2eq: 2 - annualCo2ReductionTon,
    annualCo2ReductionTon,
    annualCo2ReductionPercentage: 20,
    baselineDisplayEpcClass: "C",
    renovatedDisplayEpcClass: "B",
    generatedAt: "2026-05-13T00:00:00.000Z",
    provenance: {
      source: "manual-seed",
      co2ComputedAt: "2026-05-13T00:00:00.000Z",
      co2Method: "forecasting-carrier-split-final-energy-gas-thermal-mvp",
      emissionFactorCountry: "IT",
    },
  };
}

function makeFinancial(
  name: string,
  capexEur: number,
  pointForecasts: RSEFinancialResult["pointForecasts"],
): RSEFinancialResult {
  return {
    archetype: { country: "IT", category: "Residential", name },
    packageId: "envelope",
    capexEur,
    annualMaintenanceEur: name === "A" ? 10 : 20,
    annualEnergySavingsKwh: name === "A" ? 1_000 : 2_000,
    status: "available",
    pointForecasts,
  };
}

describe("aggregatePackage", () => {
  test("scales per-archetype values by building counts", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: makePortfolio(),
      simulations: [
        makeSimulation("A", 1_000, 0.2),
        makeSimulation("B", 2_000, 0.5),
      ],
      financials: [
        makeFinancial("A", 100, {
          NPV: 10,
          ROI: 0.5,
          IRR: 0.1,
          PBP: 5,
          DPP: 6,
        }),
        makeFinancial("B", 300, {
          NPV: 20,
          ROI: 0.1,
          IRR: 0.2,
          PBP: 7,
          DPP: 8,
        }),
      ],
      goal: { kind: "energy" },
    });

    expect(result.totalBuildings).toBe(4);
    expect(result.totalCapexEur).toBe(1_000);
    expect(result.totalAnnualMaintenanceEur).toBe(70);
    expect(result.totalAnnualEnergySavingsKwh).toBe(7_000);
    expect(result.totalAnnualCo2ReductionTon).toBeCloseTo(1.7);
    expect(result.financialIndicators.aggregateNPV).toBe(70);
  });

  test("recomputes aggregate ROI instead of averaging per-archetype ROI", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: makePortfolio(),
      simulations: [
        makeSimulation("A", 1_000, 0.2),
        makeSimulation("B", 2_000, 0.5),
      ],
      financials: [
        makeFinancial("A", 100, { ROI: 0.5 }),
        makeFinancial("B", 300, { ROI: 0.1 }),
      ],
      goal: { kind: "energy" },
    });

    expect(result.financialIndicators.aggregateROI).toBeCloseTo(0.14);
    expect(result.financialIndicators.aggregateROI).not.toBeCloseTo(0.3);
  });

  test("computes proportional budget fit for financial goals", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: makePortfolio(),
      simulations: [
        makeSimulation("A", 1_000, 0.2),
        makeSimulation("B", 2_000, 0.5),
      ],
      financials: [
        makeFinancial("A", 100, { ROI: 0.5 }),
        makeFinancial("B", 300, { ROI: 0.1 }),
      ],
      goal: { kind: "financial", maxBudgetEur: 450 },
    });

    expect(result.renovatableBuildingEquivalent).toBe(1.8);
    expect(result.renovatableBuildingsWithinBudget).toBe(1);
  });

  test("computes aggregate payback years as building-count-weighted average of PBP", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: makePortfolio(),
      simulations: [
        makeSimulation("A", 1_000, 0.2),
        makeSimulation("B", 2_000, 0.5),
      ],
      financials: [
        makeFinancial("A", 100, { IRR: 0.1, PBP: 5, DPP: 6 }),
        makeFinancial("B", 300, { IRR: 0.2, PBP: 7, DPP: 8 }),
      ],
      goal: { kind: "energy" },
    });

    // (5 * 1 + 7 * 3) / 4 = 6.5
    expect(result.financialIndicators.aggregatePaybackYears).toBeCloseTo(6.5);
    expect(result.financialIndicators.perArchetypeOnly?.IRR).toEqual({
      "IT\u001fResidential\u001fA": 0.1,
      "IT\u001fResidential\u001fB": 0.2,
    });
    expect(result.financialIndicators.perArchetypeOnly?.PBP).toEqual({
      "IT\u001fResidential\u001fA": 5,
      "IT\u001fResidential\u001fB": 7,
    });
  });

  test("uses safe zero ratios when CAPEX is zero", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: [makePortfolio()[0]],
      simulations: [makeSimulation("A", 1_000, 0.2)],
      financials: [makeFinancial("A", 0, { ROI: 0.5 })],
      goal: { kind: "energy" },
    });

    expect(result.energySavedPerEur).toBe(0);
    expect(result.co2ReducedTonPerEur).toBe(0);
    expect(result.financialIndicators.aggregateROI).toBeUndefined();
  });

  test("returns undefined aggregateROI when all per-archetype ROIs are invalid", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: makePortfolio(),
      simulations: [
        makeSimulation("A", 1_000, 0.2),
        makeSimulation("B", 2_000, 0.5),
      ],
      financials: [makeFinancial("A", 100, {}), makeFinancial("B", 300, {})],
      goal: { kind: "energy" },
    });

    expect(result.financialIndicators.aggregateROI).toBeUndefined();
  });

  test("aggregates cost and cache metrics when financial KPIs are unavailable", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: [makePortfolio()[0]],
      simulations: [makeSimulation("A", 0, 0.2)],
      financials: [
        {
          ...makeFinancial("A", 100, {}),
          annualEnergySavingsKwh: 0,
          status: "unavailable",
          unavailableReason: "non-positive-energy-savings",
        },
      ],
      goal: { kind: "energy" },
    });

    expect(result.totalBuildings).toBe(1);
    expect(result.totalCapexEur).toBe(100);
    expect(result.totalAnnualEnergySavingsKwh).toBe(0);
    expect(result.totalAnnualCo2ReductionTon).toBeCloseTo(0.2);
    expect(result.financialIndicators.aggregateNPV).toBeUndefined();
    expect(result.financialIndicators.aggregateROI).toBeUndefined();
  });

  test("returns undefined aggregatePaybackYears when all PBPs are invalid", () => {
    const result = aggregatePackage({
      packageId: "envelope",
      portfolio: makePortfolio(),
      simulations: [
        makeSimulation("A", 1_000, 0.2),
        makeSimulation("B", 2_000, 0.5),
      ],
      financials: [
        makeFinancial("A", 100, { ROI: 0.5 }),
        makeFinancial("B", 300, { ROI: 0.1 }),
      ],
      goal: { kind: "energy" },
    });

    expect(result.financialIndicators.aggregatePaybackYears).toBeUndefined();
  });
});
