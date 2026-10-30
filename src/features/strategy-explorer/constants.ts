import type { RenovationMeasureId } from "../../types/renovation";
import {
  GRID_ELECTRICITY_EMISSION_SOURCE,
  MVP_THERMAL_EMISSION_SOURCE,
  PV_SELF_CONSUMPTION_EMISSION_SOURCE,
} from "../../constants/emissionSources.ts";
import { DEFAULT_FUNDING_OPTIONS } from "../../constants/funding.ts";
import { ENERGY_TARIFF_DEFAULTS } from "../../services/carrierSavingsService.ts";

export const RSE_CACHE_PAYLOAD_SCHEMA_VERSION = 1;

export const RSE_CACHE_STATUSES = ["draft", "published", "retired"] as const;
export type RSECacheStatus = (typeof RSE_CACHE_STATUSES)[number];

export const RSE_CACHE_SOURCES = ["manual-seed", "offline-pipeline"] as const;
export type RSECacheSource = (typeof RSE_CACHE_SOURCES)[number];

export const RSE_CO2_METHODS = [
  "forecasting-carrier-split-final-energy-gas-thermal-mvp",
] as const;
export type RSECo2Method = (typeof RSE_CO2_METHODS)[number];

export const RSE_PACKAGE_IDS = [
  "envelope",
  "systems-heat-pump",
  "systems-boiler",
  "combined",
] as const;
export type RSEPackageId = (typeof RSE_PACKAGE_IDS)[number];

export const RSE_MVP_PACKAGE_MEASURE_IDS = {
  envelope: [
    "wall-insulation",
    "roof-insulation",
    "floor-insulation",
    "windows",
  ],
  "systems-heat-pump": ["air-water-heat-pump"],
  "systems-boiler": ["condensing-boiler"],
  combined: [
    "wall-insulation",
    "roof-insulation",
    "floor-insulation",
    "windows",
    "air-water-heat-pump",
    "pv",
  ],
} as const satisfies Record<RSEPackageId, readonly RenovationMeasureId[]>;

export const RSE_REFERENCE_DATA_COST_NOTE =
  "Investment and maintenance estimates use EU reference data, envelope geometry and floor area. For apartments, the geometry is scaled to one dwelling by floor area.";

export const RSE_HEATING_STOPGAP_NOTE =
  "Heat pump and boiler costs are approximate, with capacity estimated from floor area.";

export const RSE_MVP_THERMAL_EMISSION_SOURCE = MVP_THERMAL_EMISSION_SOURCE;
export const RSE_GRID_ELECTRICITY_EMISSION_SOURCE =
  GRID_ELECTRICITY_EMISSION_SOURCE;
export const RSE_PV_SELF_CONSUMPTION_EMISSION_SOURCE =
  PV_SELF_CONSUMPTION_EMISSION_SOURCE;

export const RSE_EMISSION_ENERGY_SOURCES = [
  RSE_MVP_THERMAL_EMISSION_SOURCE,
  RSE_GRID_ELECTRICITY_EMISSION_SOURCE,
  RSE_PV_SELF_CONSUMPTION_EMISSION_SOURCE,
] as const;
export type RSEEmissionEnergySource =
  (typeof RSE_EMISSION_ENERGY_SOURCES)[number];

export const RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES = [
  "IT",
  "EU",
  "DE",
] as const;
export type RSESupportedEmissionFactorCountry =
  (typeof RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES)[number];

export const RSE_DEFAULT_EMISSION_FACTOR_COUNTRY = "EU";

export const RSE_FINANCIAL_OUTPUT_LEVEL = "professional";

export const RSE_FINANCIAL_CONCURRENCY_LIMIT = 2;

export const RSE_INVALID_PAYBACK_YEAR_OFFSET = 1;

export const RSE_UNAVAILABLE_REASONS = {
  missingCacheEntry: "missing-cache-entry",
  emptyPortfolio: "empty-portfolio",
  incompleteArchetypeRef: "incomplete-archetype-ref",
  duplicateArchetype: "duplicate-archetype",
  invalidBuildingCount: "invalid-building-count",
  invalidFloorArea: "invalid-floor-area",
  invalidCacheEntry: "invalid-cache-entry",
  costLookupFailed: "cost-lookup-failed",
  nonPositiveEnergySavings: "non-positive-energy-savings",
  fullySubsidized: "fully-subsidized",
  missingCarrierBreakdown: "missing-carrier-breakdown",
} as const;
export type RSEUnavailableReason =
  (typeof RSE_UNAVAILABLE_REASONS)[keyof typeof RSE_UNAVAILABLE_REASONS];

export const RSE_FINANCIAL_DEFAULTS = {
  projectLifetimeYears: 20,
  funding: DEFAULT_FUNDING_OPTIONS,
} as const;

/**
 * Planning tariffs for the interim carrier-aware financial translation.
 * Gas is user-editable; electricity is read-only and must match
 * `FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH` (backend calibration).
 */
export const RSE_ENERGY_TARIFF_DEFAULTS = {
  ...ENERGY_TARIFF_DEFAULTS,
} as const;

export const RSE_RANKING_WEIGHTS = {
  energy: {
    savedPerEur: 0.55,
    absoluteSavings: 0.45,
  },
  emission: {
    reducedTonPerEur: 0.55,
    absoluteReduction: 0.45,
  },
  financial: {
    renovatableBuildingsWithinBudget: 0.5,
    aggregateRoi: 0.2,
    aggregateNpv: 0.2,
    aggregatePayback: 0.1,
  },
} as const;

export const RSE_FORECASTING_CO2_FIELD_PATHS = {
  uniResults: "primary_energy_uni11300",
  thermalKwh: "primary_energy_uni11300.summary.E_delivered_thermal_kWh",
  electricTotalKwh:
    "primary_energy_uni11300.summary.E_delivered_electric_total_kWh",
  pvSelfConsumptionKwh: "pv_hp.summary.annual_kwh.self_consumption",
} as const;
