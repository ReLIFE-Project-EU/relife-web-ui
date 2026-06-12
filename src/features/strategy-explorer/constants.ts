import type { RenovationMeasureId } from "../../types/renovation";

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

export const RSE_MVP_COST_SOURCE = "mvp-assumption";
export const RSE_SERVICE_API_COST_SOURCE = "service-api";

export const RSE_MVP_COST_SOURCE_NOTE =
  "Temporary planning assumption; authoritative CAPEX and maintenance must come from ReLIFE service/data APIs later.";

export const RSE_COST_SOURCES = [
  RSE_MVP_COST_SOURCE,
  RSE_SERVICE_API_COST_SOURCE,
] as const;
export type RSECostSource = (typeof RSE_COST_SOURCES)[number];

export const RSE_COST_BASIS = {
  floorArea: "eur_per_m2_floor_area",
  surfaceArea: "eur_per_m2_surface_area",
  building: "eur_per_building",
  pvCapacity: "eur_per_kwp",
} as const;

export const RSE_COST_BASIS_KINDS = [
  RSE_COST_BASIS.floorArea,
  RSE_COST_BASIS.surfaceArea,
  RSE_COST_BASIS.building,
  RSE_COST_BASIS.pvCapacity,
] as const;
export type RSECostBasisKind = (typeof RSE_COST_BASIS_KINDS)[number];

export const RSE_MVP_THERMAL_EMISSION_SOURCE = "natural_gas";
export const RSE_GRID_ELECTRICITY_EMISSION_SOURCE = "grid_electricity";
export const RSE_PV_SELF_CONSUMPTION_EMISSION_SOURCE = "solar_pv";

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

export const RSE_BUDGET_FIT_ROUNDING = "floor";

export const RSE_INVALID_PAYBACK_YEAR_OFFSET = 1;

export const RSE_UNAVAILABLE_REASONS = {
  missingCacheEntry: "missing-cache-entry",
  emptyPortfolio: "empty-portfolio",
  incompleteArchetypeRef: "incomplete-archetype-ref",
  duplicateArchetype: "duplicate-archetype",
  invalidBuildingCount: "invalid-building-count",
  invalidFloorArea: "invalid-floor-area",
  invalidPackageData: "invalid-package-data",
  invalidCacheEntry: "invalid-cache-entry",
  nonPositiveEnergySavings: "non-positive-energy-savings",
} as const;
export type RSEUnavailableReason =
  (typeof RSE_UNAVAILABLE_REASONS)[keyof typeof RSE_UNAVAILABLE_REASONS];

export const RSE_FINANCIAL_DEFAULTS = {
  projectLifetimeYears: 20,
  financingType: "self-funded",
  upfrontIncentivePercentage: 0,
} as const;

/**
 * Planning tariffs for the interim carrier-aware financial translation.
 * Gas is user-editable; electricity is read-only and must match
 * `RSE_FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH` (backend calibration).
 */
export const RSE_ENERGY_TARIFF_DEFAULTS = {
  /** EU household natural gas, representative planning value (EUR/kWh). */
  gasEurPerKwh: 0.115,
  gasSourceNote:
    "Planning default based on EU household natural-gas prices.",
} as const;

/**
 * Year-1 moderate electricity price from relife-financial-service
 * `risk_assessment_v3.py` (`electricity_prices_data.moderate[0]`).
 * Used to calibrate the electricity-equivalent kWh sent to the Financial API.
 */
export const RSE_FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH = 0.246;

export const RSE_FINANCIAL_ELECTRICITY_PRICE_SOURCE_NOTE =
  "Representative year-1 moderate electricity price from the Financial service Monte Carlo model; not user-adjustable in this tool.";

/** Upstream follow-up: relife-financial-service should accept carrier-split savings. */
export const RSE_CARRIER_PRICING_UPSTREAM_NOTE =
  "Interim frontend translation in rseCarrierSavingsService.ts; durable fix belongs in relife-financial-service risk assessment.";

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
  thermalKwh: "primary_energy_uni11300.summary.E_delivered_thermal_kWh",
  electricTotalKwh:
    "primary_energy_uni11300.summary.E_delivered_electric_total_kWh",
  electricHeatFallbackKwh:
    "primary_energy_uni11300.summary.E_delivered_electric_heat_kWh",
  electricCoolFallbackKwh:
    "primary_energy_uni11300.summary.E_delivered_electric_cool_kWh",
  pvSelfConsumptionKwh: "pv_hp.summary.annual_kwh.self_consumption",
  pvGridImportKwh: "pv_hp.summary.annual_kwh.grid_import",
} as const;

type RSEMeasureCostBasis =
  | { kind: typeof RSE_COST_BASIS.floorArea; value: number }
  | {
      kind: typeof RSE_COST_BASIS.surfaceArea;
      value: number;
      surface: "wall" | "roof" | "floor" | "window";
    }
  | { kind: typeof RSE_COST_BASIS.building; value: number }
  | { kind: typeof RSE_COST_BASIS.pvCapacity; value: number };

type RSEMeasureCostAssumptionValue = {
  capex: RSEMeasureCostBasis;
  annualMaintenance: RSEMeasureCostBasis;
};

export const RSE_MVP_MEASURE_COST_ASSUMPTIONS = {
  "wall-insulation": {
    capex: { kind: RSE_COST_BASIS.floorArea, value: 70 },
    annualMaintenance: { kind: RSE_COST_BASIS.floorArea, value: 0 },
  },
  "roof-insulation": {
    capex: { kind: RSE_COST_BASIS.floorArea, value: 50 },
    annualMaintenance: { kind: RSE_COST_BASIS.floorArea, value: 0 },
  },
  "floor-insulation": {
    capex: { kind: RSE_COST_BASIS.floorArea, value: 35 },
    annualMaintenance: { kind: RSE_COST_BASIS.floorArea, value: 0 },
  },
  windows: {
    capex: { kind: RSE_COST_BASIS.floorArea, value: 65 },
    annualMaintenance: { kind: RSE_COST_BASIS.floorArea, value: 0 },
  },
  "air-water-heat-pump": {
    capex: { kind: RSE_COST_BASIS.building, value: 22_000 },
    annualMaintenance: { kind: RSE_COST_BASIS.building, value: 300 },
  },
  "condensing-boiler": {
    capex: { kind: RSE_COST_BASIS.building, value: 6_500 },
    annualMaintenance: { kind: RSE_COST_BASIS.building, value: 220 },
  },
  pv: {
    capex: { kind: RSE_COST_BASIS.pvCapacity, value: 1_500 },
    annualMaintenance: { kind: RSE_COST_BASIS.pvCapacity, value: 25 },
  },
} as const satisfies Partial<
  Record<RenovationMeasureId, RSEMeasureCostAssumptionValue>
>;
