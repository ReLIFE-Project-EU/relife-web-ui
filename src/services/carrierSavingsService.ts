import type { DeliveredEnergyCarrierBreakdown } from "../types/energy";
import {
  GRID_ELECTRICITY_EMISSION_SOURCE,
  MVP_THERMAL_EMISSION_SOURCE,
  PV_SELF_CONSUMPTION_EMISSION_SOURCE,
} from "../constants/emissionSources.ts";

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

/** Net kWh per gross kWh of natural gas (Eurostat energy balances convention). */
export const NATURAL_GAS_NET_PER_GROSS_KWH = 0.9;

/**
 * Year-1 moderate electricity price from relife-financial-service
 * `simulation_engine.py` (`electricity_prices_data.moderate[0]`).
 * Used to calibrate electricity-equivalent kWh sent to the current scalar
 * Financial API risk-assessment contract.
 */
export const FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH = 0.246;

export function extractCarrierSourceBreakdown(
  sourceBreakdownKwh: {
    naturalGas: number;
    gridElectricity: number;
  },
  /** Share of the reference building the caller models (1 = the whole thing). */
  scaleFactor = 1,
): DeliveredEnergyCarrierBreakdown {
  return {
    naturalGasKwh: sourceBreakdownKwh.naturalGas * scaleFactor,
    gridElectricityKwh: sourceBreakdownKwh.gridElectricity * scaleFactor,
  };
}

/**
 * Annual operational CO₂e emissions of a carrier breakdown in t CO₂e/year.
 *
 * Multiplies each delivered-energy carrier by its Forecasting emission factor
 * (kgCO₂eq/kWh). `gridElectricityKwh` is already net of PV self-consumption
 * (see `splitCarriers` in scenarioEnergy), so self-consumed PV is added separately
 * at the `solar_pv` factor. Grid export does not contribute.
 *
 * Returns undefined when a factor needed by a non-zero carrier is missing.
 */
export function computeOperationalEmissionsTonCo2e(
  breakdown: DeliveredEnergyCarrierBreakdown,
  factorsKgCo2ePerKwh: Record<string, number>,
  pvSelfConsumptionKwh?: number,
): number | undefined {
  const pvKwh = pvSelfConsumptionKwh ?? 0;
  const terms: Array<[number, string]> = [
    [breakdown.naturalGasKwh, MVP_THERMAL_EMISSION_SOURCE],
    [breakdown.gridElectricityKwh, GRID_ELECTRICITY_EMISSION_SOURCE],
    [pvKwh, PV_SELF_CONSUMPTION_EMISSION_SOURCE],
  ];

  let totalKg = 0;
  for (const [consumptionKwh, source] of terms) {
    if (!Number.isFinite(consumptionKwh) || consumptionKwh <= 0) {
      continue;
    }

    const factor = factorsKgCo2ePerKwh[source];
    if (factor === undefined || !Number.isFinite(factor)) {
      return undefined;
    }

    totalKg += consumptionKwh * factor;
  }

  return totalKg / 1000;
}

/**
 * Lifetime carbon (kgCO₂e): one-off material carbon plus operational emissions
 * over the appraisal horizon. Annual term is in tonnes because both
 * `RenovationScenario.annualEmissionsTonCo2e` and
 * `RSESimulationResult.renovatedAnnualEmissionsTonCo2eq` carry it that way.
 *
 * Partial module boundary, HVAC end uses only, static emission factor; the
 * `whole-life-carbon` concept documents it for readers. Returns undefined on a
 * missing term rather than a partial sum, as `estimatePackageEmbodiedCarbon` does.
 */
export function computeLifetimeCarbonKgCo2e(params: {
  embodiedCarbonKgCo2e: number | undefined;
  annualOperationalEmissionsTonCo2e: number | undefined;
  projectLifetimeYears: number | undefined;
}): number | undefined {
  const {
    embodiedCarbonKgCo2e,
    annualOperationalEmissionsTonCo2e,
    projectLifetimeYears,
  } = params;

  if (
    !isFiniteNumber(embodiedCarbonKgCo2e) ||
    !isFiniteNumber(annualOperationalEmissionsTonCo2e) ||
    !isFiniteNumber(projectLifetimeYears)
  ) {
    return undefined;
  }

  return (
    embodiedCarbonKgCo2e +
    annualOperationalEmissionsTonCo2e * 1000 * projectLifetimeYears
  );
}

function isFiniteNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

/**
 * Annual cost of a carrier breakdown at the given tariffs (EUR/year).
 *
 * Covers HVAC end uses only, because the breakdown derives from delivered
 * energy. Domestic hot water, lighting and appliances are not included, so
 * this is not a household energy bill.
 *
 * Gas kWh are net; the gas tariff is per gross kWh.
 */
export function computeCarrierAnnualCostEur(
  breakdown: DeliveredEnergyCarrierBreakdown,
  tariffs: CarrierSavingsTariffs,
): number {
  return (
    (breakdown.naturalGasKwh / NATURAL_GAS_NET_PER_GROSS_KWH) *
      tariffs.gasTariffEurPerKwh +
    breakdown.gridElectricityKwh * tariffs.electricityReferencePriceEurPerKwh
  );
}

export function computeCarrierAnnualSavingsEur(
  baseline: DeliveredEnergyCarrierBreakdown,
  renovated: DeliveredEnergyCarrierBreakdown,
  tariffs: CarrierSavingsTariffs,
): number {
  return (
    computeCarrierAnnualCostEur(baseline, tariffs) -
    computeCarrierAnnualCostEur(renovated, tariffs)
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
