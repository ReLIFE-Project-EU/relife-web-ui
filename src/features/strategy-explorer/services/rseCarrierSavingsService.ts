import type {
  RSECarrierSourceBreakdown,
  RSEScenarioCo2Summary,
} from "../types";

export interface RSECarrierSavingsTariffs {
  gasTariffEurPerKwh: number;
  electricityReferencePriceEurPerKwh: number;
}

export interface RSECarrierSavingsResult {
  annualSavingsEur: number;
  electricityEquivalentKwh: number;
}

/**
 * Upstream durable fix: extend relife-financial-service risk assessment to
 * accept carrier-split annual savings (or per-carrier tariffs) so Monte Carlo
 * risk bands price gas and electricity correctly. Until then, this module
 * converts true carrier savings into a single electricity-equivalent kWh
 * calibrated to `electricityReferencePriceEurPerKwh`.
 */
export function extractCarrierSourceBreakdown(
  co2: RSEScenarioCo2Summary,
): RSECarrierSourceBreakdown {
  return {
    naturalGasKwh: co2.sourceBreakdownKwh.naturalGas,
    gridElectricityKwh: co2.sourceBreakdownKwh.gridElectricity,
  };
}

export function computeCarrierAnnualSavingsEur(
  baseline: RSECarrierSourceBreakdown,
  renovated: RSECarrierSourceBreakdown,
  tariffs: RSECarrierSavingsTariffs,
): number {
  const gasDeltaKwh = baseline.naturalGasKwh - renovated.naturalGasKwh;
  const gridDeltaKwh =
    baseline.gridElectricityKwh - renovated.gridElectricityKwh;

  return (
    gasDeltaKwh * tariffs.gasTariffEurPerKwh +
    gridDeltaKwh * tariffs.electricityReferencePriceEurPerKwh
  );
}

export function toElectricityEquivalentKwh(
  annualSavingsEur: number,
  electricityReferencePriceEurPerKwh: number,
): number {
  if (
    !Number.isFinite(annualSavingsEur) ||
    !Number.isFinite(electricityReferencePriceEurPerKwh) ||
    electricityReferencePriceEurPerKwh <= 0
  ) {
    return 0;
  }

  return annualSavingsEur / electricityReferencePriceEurPerKwh;
}

export function computeCarrierFinancialEnergySavings(
  baseline: RSECarrierSourceBreakdown,
  renovated: RSECarrierSourceBreakdown,
  tariffs: RSECarrierSavingsTariffs,
): RSECarrierSavingsResult {
  const annualSavingsEur = computeCarrierAnnualSavingsEur(
    baseline,
    renovated,
    tariffs,
  );
  const electricityEquivalentKwh = toElectricityEquivalentKwh(
    annualSavingsEur,
    tariffs.electricityReferencePriceEurPerKwh,
  );

  return { annualSavingsEur, electricityEquivalentKwh };
}
