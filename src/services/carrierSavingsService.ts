import type { UNI11300Results } from "../types/forecasting";
import type { DeliveredEnergyCarrierBreakdown } from "../types/energy";

export type { DeliveredEnergyCarrierBreakdown };

export interface CarrierSavingsTariffs {
  gasTariffEurPerKwh: number;
  electricityReferencePriceEurPerKwh: number;
}

export interface CarrierSavingsResult {
  annualSavingsEur: number;
  electricityEquivalentKwh: number;
}

export const ENERGY_TARIFF_DEFAULTS = {
  gasEurPerKwh: 0.115,
  gasSourceNote: "Planning default based on EU household natural-gas prices.",
} as const;

/**
 * Year-1 moderate electricity price from relife-financial-service
 * `simulation_engine.py` (`electricity_prices_data.moderate[0]`).
 * Used to calibrate electricity-equivalent kWh sent to the current scalar
 * Financial API risk-assessment contract.
 */
export const FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH = 0.246;

export function extractCarrierSourceBreakdown(sourceBreakdownKwh: {
  naturalGas: number;
  gridElectricity: number;
}): DeliveredEnergyCarrierBreakdown {
  return {
    naturalGasKwh: sourceBreakdownKwh.naturalGas,
    gridElectricityKwh: sourceBreakdownKwh.gridElectricity,
  };
}

export function extractUniCarrierBreakdown(
  uniResults: UNI11300Results | undefined,
  options?: { allowHeatPump?: boolean; pvSelfConsumptionKwh?: number },
): DeliveredEnergyCarrierBreakdown | undefined {
  if (!uniResults?.summary) {
    return undefined;
  }

  const summary = uniResults.summary;
  const heatPumpApplied =
    uniResults.heat_pump_applied === true ||
    summary.heat_pump_cop !== undefined;

  if (!options?.allowHeatPump && heatPumpApplied) {
    return undefined;
  }

  const deliveredElectricTotal =
    summary.E_delivered_electric_total_kWh ??
    (summary.E_delivered_electric_heat_kWh ?? 0) +
      (summary.E_delivered_electric_cool_kWh ?? 0);
  const deliveredThermal = heatPumpApplied
    ? 0
    : (summary.E_delivered_thermal_kWh ?? 0);
  const gridElectricityKwh = Math.max(
    0,
    deliveredElectricTotal - (options?.pvSelfConsumptionKwh ?? 0),
  );

  if (
    !Number.isFinite(deliveredThermal) ||
    deliveredThermal < 0 ||
    !Number.isFinite(gridElectricityKwh)
  ) {
    return undefined;
  }

  return {
    naturalGasKwh: deliveredThermal,
    gridElectricityKwh,
  };
}

export function scaleCarrierBreakdown(
  breakdown: DeliveredEnergyCarrierBreakdown | undefined,
  scaleFactor: number,
): DeliveredEnergyCarrierBreakdown | undefined {
  if (!breakdown || !Number.isFinite(scaleFactor) || scaleFactor < 0) {
    return undefined;
  }

  return {
    naturalGasKwh: breakdown.naturalGasKwh * scaleFactor,
    gridElectricityKwh: breakdown.gridElectricityKwh * scaleFactor,
  };
}

export function totalCarrierEnergyKwh(
  breakdown: DeliveredEnergyCarrierBreakdown | undefined,
): number | undefined {
  if (!breakdown) {
    return undefined;
  }

  return breakdown.naturalGasKwh + breakdown.gridElectricityKwh;
}

export function computeCarrierAnnualSavingsEur(
  baseline: DeliveredEnergyCarrierBreakdown,
  renovated: DeliveredEnergyCarrierBreakdown,
  tariffs: CarrierSavingsTariffs,
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
  baseline: DeliveredEnergyCarrierBreakdown,
  renovated: DeliveredEnergyCarrierBreakdown,
  tariffs: CarrierSavingsTariffs,
): CarrierSavingsResult {
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
