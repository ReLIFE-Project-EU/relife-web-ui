import { describe, expect, test } from "vitest";

import { RSE_FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH } from "../../../../../src/features/strategy-explorer/constants";
import {
  computeCarrierAnnualSavingsEur,
  computeCarrierFinancialEnergySavings,
  extractCarrierSourceBreakdown,
  toElectricityEquivalentKwh,
} from "../../../../../src/features/strategy-explorer/services/rseCarrierSavingsService";
import type { RSEScenarioCo2Summary } from "../../../../../src/features/strategy-explorer/types";

const gasTariff = 0.115;
const elecRef = RSE_FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH;

function makeCo2Summary(
  breakdown: RSEScenarioCo2Summary["sourceBreakdownKwh"],
): RSEScenarioCo2Summary {
  return {
    annualConsumptionKwh: 0,
    annualEmissionsKgCo2eq: 0,
    annualEmissionsTonCo2eq: 0,
    weightedEmissionFactorKgPerKwh: 0,
    equivalentTrees: 0,
    equivalentKmCar: 0,
    sourceBreakdownKwh: breakdown,
    thermalEmissionSource: "natural_gas",
  };
}

describe("rseCarrierSavingsService", () => {
  test("values gas and grid deltas separately without double-counting PV", () => {
    const baseline = { naturalGasKwh: 20_000, gridElectricityKwh: 500 };
    const renovated = { naturalGasKwh: 14_000, gridElectricityKwh: 4_500 };

    const savingsEur = computeCarrierAnnualSavingsEur(baseline, renovated, {
      gasTariffEurPerKwh: gasTariff,
      electricityReferencePriceEurPerKwh: elecRef,
    });

    // Gas: 6000 * 0.115 = 690; grid: (500-4500) * 0.246 = -984 → net -294
    expect(savingsEur).toBeCloseTo(690 - 4_000 * elecRef, 5);
  });

  test("round-trips carrier savings to electricity-equivalent kWh at P_elec_ref", () => {
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
    expect(result.electricityEquivalentKwh * elecRef).toBeCloseTo(
      result.annualSavingsEur,
      5,
    );
  });

  test("extracts gas and grid only from cache CO2 breakdown", () => {
    const breakdown = extractCarrierSourceBreakdown(
      makeCo2Summary({
        naturalGas: 9_000,
        gridElectricity: 1_000,
        solarPv: 500,
      }),
    );

    expect(breakdown).toEqual({
      naturalGasKwh: 9_000,
      gridElectricityKwh: 1_000,
    });
  });

  test("returns non-positive equivalent kWh for non-positive euro savings", () => {
    expect(toElectricityEquivalentKwh(-100, elecRef)).toBeLessThan(0);
    expect(toElectricityEquivalentKwh(0, elecRef)).toBe(0);
  });
});
