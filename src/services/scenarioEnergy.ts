/**
 * Scenario energy: one ECM run reduced to the modeled home's annual figures.
 *
 * EnergyService reduces the baseline once at estimation; RenovationService
 * reuses it and reduces each package run; the RSE cache seed shares the
 * carrier split. Imports carry `.ts` extensions because the seed script loads
 * this module under Node's type stripping.
 */

import type { DeliveredEnergyCarrierBreakdown } from "../types/energy";
import type {
  ECMScenario,
  UNI11300Results,
  UNI11300Summary,
} from "../types/forecasting";
import {
  calculateAnnualTotals,
  computeComfortBandIndex,
  computeDailyMeanOperativeTemperatures,
  extractUniTotals,
  resolveEpcRatingIntensity,
  transformColumnarToRowFormat,
} from "./energyUtils.ts";
import {
  energyScaleFactor,
  type SimulatedBuilding,
} from "./simulatedBuilding.ts";

/** Annual figures of one simulated scenario, in whole kWh for the modeled home. */
export interface ScenarioEnergy {
  thermalNeed: number;
  heatingNeed: number;
  coolingNeed: number;
  deliveredTotal?: number;
  carrierBreakdown?: DeliveredEnergyCarrierBreakdown;
  primaryEnergy?: number;
  heatingPrimaryEnergy?: number;
  coolingPrimaryEnergy?: number;
  heatPumpCop?: number;
  pvGeneration?: number;
  pvSelfConsumption?: number;
  pvGridExport?: number;
  pvSelfConsumptionRate?: number;
  pvSelfSufficiencyRate?: number;
  /** Share of hours (0–100) with operative temperature in the comfort band. */
  comfortBandIndex?: number;
  /** Daily mean operative temperature (°C), the DALY input; undefined when the hourly profile is unusable. */
  dailyMeanOperativeTemperatures?: number[];
  /** Unrounded figures behind the audit trace. */
  trace: ScenarioEnergyTrace;
}

/** `raw` describes the simulated building, `scaled` the modeled home. */
export interface ScenarioEnergyTrace {
  areaScaleFactor: number;
  raw: {
    heating: number;
    cooling: number;
    hvac: number;
    /** UNI 11300 delivered total, before any PV credit. */
    deliveredTotal?: number;
    carrierBreakdown?: DeliveredEnergyCarrierBreakdown;
    primaryEnergy?: number;
    pvGeneration?: number;
    pvSelfConsumption?: number;
  };
  scaled: {
    heating: number;
    cooling: number;
    hvac: number;
    deliveredTotal?: number;
    carrierBreakdown?: DeliveredEnergyCarrierBreakdown;
    primaryEnergy?: number;
    pvGeneration?: number;
    pvSelfConsumption?: number;
    pvGridExport?: number;
  };
  /** kWh/m² on the EPC rating basis (primary, else delivered, else thermal need). */
  epcIntensity: number;
  uniSummary?: UNI11300Summary;
}

/**
 * Delivered energy by carrier. Thermal energy counts as natural gas (zero
 * under a heat pump); grid import is system electricity less PV
 * self-consumption.
 */
export function splitCarriers(
  uniResults: UNI11300Results | undefined,
  pvSelfConsumptionKwh = 0,
): DeliveredEnergyCarrierBreakdown | undefined {
  if (!uniResults?.summary) {
    return undefined;
  }

  const summary = uniResults.summary;
  const heatPumpApplied =
    uniResults.heat_pump_applied === true ||
    summary.heat_pump_cop !== undefined;
  const systemElectricityKwh =
    summary.E_delivered_electric_total_kWh ??
    (summary.E_delivered_electric_heat_kWh ?? 0) +
      (summary.E_delivered_electric_cool_kWh ?? 0);
  const naturalGasKwh = heatPumpApplied
    ? 0
    : (summary.E_delivered_thermal_kWh ?? 0);
  const gridElectricityKwh = Math.max(
    0,
    systemElectricityKwh - pvSelfConsumptionKwh,
  );

  if (
    !Number.isFinite(naturalGasKwh) ||
    naturalGasKwh < 0 ||
    !Number.isFinite(gridElectricityKwh)
  ) {
    return undefined;
  }

  return { naturalGasKwh, gridElectricityKwh };
}

/** Reduce one ECM run to the modeled home's scenario energy. */
export function reduceEcmRun(
  run: ECMScenario,
  simulated: SimulatedBuilding,
): ScenarioEnergy {
  const hourly = transformColumnarToRowFormat(run.results.hourly_building);
  const annual = calculateAnnualTotals(hourly);
  const factor = energyScaleFactor(simulated);
  const scale = (kwh: number | undefined) =>
    kwh === undefined ? undefined : kwh * factor;

  const uniResults = run.results.primary_energy_uni11300;
  const pvSummary = run.results.pv_hp?.summary;
  const pvAnnual = pvSummary?.annual_kwh;
  const uniTotals = extractUniTotals(uniResults);
  const rawCarriers = splitCarriers(uniResults, pvAnnual?.self_consumption);
  const carrierBreakdown = rawCarriers && {
    naturalGasKwh: rawCarriers.naturalGasKwh * factor,
    gridElectricityKwh: rawCarriers.gridElectricityKwh * factor,
  };

  const hvac = annual.Q_HC_total * factor;
  const primaryEnergy = scale(uniTotals?.primaryEnergy);
  const pvSelfConsumption = scale(pvAnnual?.self_consumption);
  let deliveredTotal = carrierBreakdown
    ? carrierBreakdown.naturalGasKwh + carrierBreakdown.gridElectricityKwh
    : scale(uniTotals?.deliveredTotal);
  if (
    pvSelfConsumption !== undefined &&
    carrierBreakdown === undefined &&
    deliveredTotal !== undefined
  ) {
    deliveredTotal = Math.max(0, deliveredTotal - pvSelfConsumption);
    // TODO(pv-primary): apply electricity primary factor before reducing primary energy.
  }

  const trace: ScenarioEnergyTrace = {
    areaScaleFactor: factor,
    raw: {
      heating: annual.Q_H_total,
      cooling: annual.Q_C_total,
      hvac: annual.Q_HC_total,
      deliveredTotal: uniTotals?.deliveredTotal,
      carrierBreakdown: rawCarriers,
      primaryEnergy: uniTotals?.primaryEnergy,
      pvGeneration: pvAnnual?.pv_generation,
      pvSelfConsumption: pvAnnual?.self_consumption,
    },
    scaled: {
      heating: annual.Q_H_total * factor,
      cooling: annual.Q_C_total * factor,
      hvac,
      deliveredTotal,
      carrierBreakdown,
      primaryEnergy,
      pvGeneration: scale(pvAnnual?.pv_generation),
      pvSelfConsumption,
      pvGridExport: scale(pvAnnual?.grid_export),
    },
    epcIntensity: resolveEpcRatingIntensity(
      { primaryEnergy, deliveredTotal, annualEnergyNeeds: hvac },
      simulated.modeledFloorArea,
    ).intensity,
    uniSummary: uniResults?.summary,
  };

  const { scaled } = trace;
  return {
    thermalNeed: Math.round(scaled.hvac),
    heatingNeed: Math.round(scaled.heating),
    coolingNeed: Math.round(scaled.cooling),
    deliveredTotal: roundKwh(scaled.deliveredTotal),
    carrierBreakdown: scaled.carrierBreakdown && {
      naturalGasKwh: Math.round(scaled.carrierBreakdown.naturalGasKwh),
      gridElectricityKwh: Math.round(
        scaled.carrierBreakdown.gridElectricityKwh,
      ),
    },
    primaryEnergy: roundKwh(scaled.primaryEnergy),
    heatingPrimaryEnergy: roundKwh(scale(uniTotals?.heatingPrimaryEnergy)),
    coolingPrimaryEnergy: roundKwh(scale(uniTotals?.coolingPrimaryEnergy)),
    heatPumpCop: uniTotals?.heatPumpCop,
    pvGeneration: roundKwh(scaled.pvGeneration),
    pvSelfConsumption: roundKwh(scaled.pvSelfConsumption),
    pvGridExport: roundKwh(scaled.pvGridExport),
    pvSelfConsumptionRate: pvSummary?.indicators?.self_consumption_rate,
    pvSelfSufficiencyRate: pvSummary?.indicators?.self_sufficiency_rate,
    comfortBandIndex: computeComfortBandIndex(hourly),
    dailyMeanOperativeTemperatures: dailyMeanOperativeTemperatures(run),
    trace,
  };
}

function roundKwh(kwh: number | undefined): number | undefined {
  return kwh === undefined ? undefined : Math.round(kwh);
}

function dailyMeanOperativeTemperatures(
  run: ECMScenario,
): number[] | undefined {
  try {
    return computeDailyMeanOperativeTemperatures(run.results.hourly_building);
  } catch {
    return undefined;
  }
}
