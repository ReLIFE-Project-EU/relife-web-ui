import { describe, expect, test } from "vitest";

import {
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
  computeCarrierAnnualCostEur,
  computeCarrierAnnualSavingsEur,
  computeCarrierFinancialEnergySavings,
  computeLifetimeCarbonKgCo2e,
  computeOperationalEmissionsTonCo2e,
  extractCarrierSourceBreakdown,
  toElectricityEquivalentKwh,
} from "../../../src/services/carrierSavingsService";

const gasTariff = 0.115;
const elecRef = FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH;

describe("carrierSavingsService", () => {
  test("values gas and grid deltas separately", () => {
    const baseline = { naturalGasKwh: 20_000, gridElectricityKwh: 500 };
    const renovated = { naturalGasKwh: 14_000, gridElectricityKwh: 4_500 };

    const savingsEur = computeCarrierAnnualSavingsEur(baseline, renovated, {
      gasTariffEurPerKwh: gasTariff,
      electricityReferencePriceEurPerKwh: elecRef,
    });

    expect(savingsEur).toBeCloseTo(690 - 4_000 * elecRef, 5);

    // Savings are defined as the difference of two annual costs, so the HRA
    // running-cost chart and the Financial API request cannot disagree about
    // what a package costs to run.
    expect(savingsEur).toBeCloseTo(
      computeCarrierAnnualCostEur(baseline, {
        gasTariffEurPerKwh: gasTariff,
        electricityReferencePriceEurPerKwh: elecRef,
      }) -
        computeCarrierAnnualCostEur(renovated, {
          gasTariffEurPerKwh: gasTariff,
          electricityReferencePriceEurPerKwh: elecRef,
        }),
      5,
    );
  });

  test("round-trips carrier savings to electricity-equivalent kWh", () => {
    const result = computeCarrierFinancialEnergySavings(
      { naturalGasKwh: 12_000, gridElectricityKwh: 0 },
      { naturalGasKwh: 8_000, gridElectricityKwh: 0 },
      {
        gasTariffEurPerKwh: gasTariff,
        electricityReferencePriceEurPerKwh: elecRef,
      },
    );

    expect(result.annualSavingsEur).toBeCloseTo(4_000 * gasTariff, 5);
    expect(result.electricityEquivalentKwh).toBeCloseTo(
      result.annualSavingsEur / elecRef,
      5,
    );
  });

  test("extracts gas and grid only from a source breakdown", () => {
    expect(
      extractCarrierSourceBreakdown({
        naturalGas: 9_000,
        gridElectricity: 1_000,
      }),
    ).toEqual({
      naturalGasKwh: 9_000,
      gridElectricityKwh: 1_000,
    });
  });

  test("returns non-positive equivalent kWh for non-positive euro savings", () => {
    expect(toElectricityEquivalentKwh(-100, elecRef)).toBeLessThan(0);
    expect(toElectricityEquivalentKwh(0, elecRef)).toBe(0);
  });

  // EU factors from the Forecasting service EMISSION_FACTORS table
  // (relife-forecasting-service co2_reduction.py).
  const euFactors = {
    natural_gas: 0.202,
    grid_electricity: 0.255,
    solar_pv: 0.04,
  };

  test("converts per-carrier emissions from kg to t CO₂e", () => {
    expect(
      computeOperationalEmissionsTonCo2e(
        { naturalGasKwh: 10_000, gridElectricityKwh: 2_000 },
        euFactors,
      ),
    ).toBeCloseTo((10_000 * 0.202 + 2_000 * 0.255) / 1000, 10); // 2.53 t
  });

  test("values PV self-consumption at the solar factor on top of net grid import", () => {
    // gridElectricityKwh is already net of PV self-consumption (see
    // splitCarriers), so the PV term must add to — not replace —
    // the grid term, and grid export contributes nothing.
    expect(
      computeOperationalEmissionsTonCo2e(
        { naturalGasKwh: 0, gridElectricityKwh: 700 },
        euFactors,
        300,
      ),
    ).toBeCloseTo((700 * 0.255 + 300 * 0.04) / 1000, 10);
  });

  test("returns undefined when a needed emission factor is missing", () => {
    const withoutSolar = {
      natural_gas: 0.202,
      grid_electricity: 0.255,
    };

    expect(
      computeOperationalEmissionsTonCo2e(
        { naturalGasKwh: 1_000, gridElectricityKwh: 500 },
        withoutSolar,
        300,
      ),
    ).toBeUndefined();

    // A missing factor for a zero carrier is irrelevant.
    expect(
      computeOperationalEmissionsTonCo2e(
        { naturalGasKwh: 1_000, gridElectricityKwh: 500 },
        withoutSolar,
      ),
    ).toBeCloseTo((1_000 * 0.202 + 500 * 0.255) / 1000, 10);
  });
  test("computeLifetimeCarbonKgCo2e adds material carbon to lifetime operations", () => {
    expect(
      computeLifetimeCarbonKgCo2e({
        embodiedCarbonKgCo2e: 6_000,
        annualOperationalEmissionsTonCo2e: 2,
        projectLifetimeYears: 20,
      }),
    ).toBe(46_000);

    // All-or-nothing: a partial sum would read as a genuinely small total.
    expect(
      computeLifetimeCarbonKgCo2e({
        embodiedCarbonKgCo2e: 6_000,
        annualOperationalEmissionsTonCo2e: undefined,
        projectLifetimeYears: 20,
      }),
    ).toBeUndefined();
  });
});
