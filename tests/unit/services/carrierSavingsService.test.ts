import { describe, expect, test } from "vitest";

import {
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
  computeCarrierAnnualSavingsEur,
  computeCarrierFinancialEnergySavings,
  extractCarrierSourceBreakdown,
  extractUniCarrierBreakdown,
  toElectricityEquivalentKwh,
} from "../../../src/services/carrierSavingsService";
import type { UNI11300Results } from "../../../src/types/forecasting";

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

  test("extracts UNI thermal and electric carriers", () => {
    const uniResults: UNI11300Results = {
      summary: {
        E_delivered_thermal_kWh: 1000,
        E_delivered_electric_total_kWh: 250,
        EP_total_kWh: 1800,
      },
    };

    expect(extractUniCarrierBreakdown(uniResults)).toEqual({
      naturalGasKwh: 1000,
      gridElectricityKwh: 250,
    });
  });

  test("heat pump UNI output is treated as grid electricity when allowed", () => {
    const uniResults: UNI11300Results = {
      heat_pump_applied: true,
      summary: {
        E_delivered_thermal_kWh: 5000,
        E_delivered_electric_total_kWh: 900,
        EP_total_kWh: 1800,
      },
    };

    expect(extractUniCarrierBreakdown(uniResults)).toBeUndefined();
    expect(
      extractUniCarrierBreakdown(uniResults, { allowHeatPump: true }),
    ).toEqual({
      naturalGasKwh: 0,
      gridElectricityKwh: 900,
    });
  });

  test("PV self-consumption reduces grid electricity only", () => {
    const uniResults: UNI11300Results = {
      summary: {
        E_delivered_thermal_kWh: 1500,
        E_delivered_electric_total_kWh: 500,
        EP_total_kWh: 3000,
      },
    };

    expect(
      extractUniCarrierBreakdown(uniResults, {
        pvSelfConsumptionKwh: 300,
      }),
    ).toEqual({
      naturalGasKwh: 1500,
      gridElectricityKwh: 200,
    });
  });

  test("returns non-positive equivalent kWh for non-positive euro savings", () => {
    expect(toElectricityEquivalentKwh(-100, elecRef)).toBeLessThan(0);
    expect(toElectricityEquivalentKwh(0, elecRef)).toBe(0);
  });
});
