/**
 * Mock Service Constants
 *
 * Centralised constants used by mock services.
 * These represent business logic defaults, economic indicators, and simulation parameters.
 */

import type { FinancialScenario } from "../../types/renovation";

// ─────────────────────────────────────────────────────────────────────────────
// Economic & Financial Indicators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default annual discount rate (3%)
 */
export const MOCK_DISCOUNT_RATE = 0.03;

/**
 * Average energy price in EUR/kWh
 */
export const MOCK_ENERGY_PRICE_EUR_PER_KWH = 0.25;

/**
 * Default mortgage/loan interest rate (3.5%)
 */
export const MOCK_DEFAULT_LOAN_RATE = 0.035;

/**
 * Default number of years for the project evaluation horizon
 */
export const MOCK_DEFAULT_PROJECT_LIFETIME = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Property Value & Construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Average property value per square meter (EUR/m²)
 * TBD: In production, this comes from location-based ML models
 */
export const MOCK_BASE_PROPERTY_VALUE_PER_SQM = 3000;

/**
 * Minimum factor for property value based on building age
 */
export const MOCK_MIN_AGE_FACTOR = 0.7;

/**
 * Annual property value depreciation factor due to age
 */
export const MOCK_AGE_DEPRECIATION_FACTOR = 0.005;

/**
 * Property value multiplier for recently renovated buildings
 */
export const MOCK_RENOVATION_VALUE_MULTIPLIER = 1.1;

// ─────────────────────────────────────────────────────────────────────────────
// Energy Simulation Parameters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base energy intensity for a reference building (kWh/m²/year)
 */
export const MOCK_BASE_ENERGY_INTENSITY = 150;

/**
 * Default floor area if not provided (m²)
 */
export const MOCK_DEFAULT_FLOOR_AREA = 100;

/**
 * Percentage of energy needs typically allocated to heating vs cooling
 */
export const MOCK_HEATING_ENERGY_SPLIT = 0.7;
export const MOCK_COOLING_ENERGY_SPLIT = 0.3;

/**
 * Default coordinates used if none are provided (Athens, GR)
 */
export const MOCK_DEFAULT_LAT = 37.98;
export const MOCK_DEFAULT_LNG = 23.73;

/**
 * Default coordinates by country (approximate capital/major city)
 */
export const MOCK_COUNTRY_COORDINATES: Record<
  string,
  { lat: number; lng: number }
> = {
  AT: { lat: 48.21, lng: 16.37 }, // Vienna
  BE: { lat: 50.85, lng: 4.35 }, // Brussels
  DE: { lat: 52.52, lng: 13.4 }, // Berlin
  ES: { lat: 40.42, lng: -3.7 }, // Madrid
  FR: { lat: 48.86, lng: 2.35 }, // Paris
  GR: { lat: 37.98, lng: 23.73 }, // Athens
  IT: { lat: 41.9, lng: 12.5 }, // Rome
  NL: { lat: 52.37, lng: 4.9 }, // Amsterdam
  PT: { lat: 38.72, lng: -9.14 }, // Lisbon
};

// ─────────────────────────────────────────────────────────────────────────────
// Simulation & Mock Behaviour
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Number of Monte Carlo simulations for risk assessment
 */
export const MOCK_N_SIMS = 10000;

/**
 * Delay in milliseconds to simulate API latency
 */
export const MOCK_DELAY_SHORT = 200;
export const MOCK_DELAY_MEDIUM = 400;
export const MOCK_DELAY_LONG = 800;

/**
 * Proxy for infinity when calculating years (e.g., payback period)
 */
export const MOCK_MAX_YEARS_PROXY = 999;

/**
 * CAPEX multiplier from energy savings when not provided
 */
export const MOCK_CAPEX_SAVINGS_MULTIPLIER = 2.5;

/**
 * Success rate generation factors
 */
export const MOCK_SUCCESS_BASE_HIGH = 0.85;
export const MOCK_SUCCESS_RANDOM_HIGH = 0.1;
export const MOCK_SUCCESS_BASE_LOW = 0.3;
export const MOCK_SUCCESS_RANDOM_LOW = 0.2;

/**
 * Range multipliers for uncertainty display
 */
export const MOCK_RANGE_NPV_MIN = 0.8;
export const MOCK_RANGE_NPV_MAX = 1.2;
export const MOCK_RANGE_PAYBACK_MIN = 0.85;
export const MOCK_RANGE_PAYBACK_MAX = 1.15;

/**
 * Normalization factor for ROI in MCDA.
 * ROI is a dimensionless fraction (e.g., 1.423 = 142.3%). Value of 2.0 = max 200% return.
 */
export const MOCK_MCDA_MAX_ROI_NORMALIZATION = 2.0;

/**
 * Normalization factor for NPV in MCDA
 */
export const MOCK_MCDA_NPV_NORMALIZATION_FACTOR = 50000;

/**
 * Delay in milliseconds for renovation evaluation
 */
export const MOCK_DELAY_RENOVATION = 600;

/**
 * EPC improvement multipliers for comfort and flexibility
 */
export const MOCK_COMFORT_IMPROVEMENT_FACTOR = 0.5;
export const MOCK_FLEXIBILITY_IMPROVEMENT_FACTOR = 0.4;
export const MOCK_MAX_COMFORT_IMPROVEMENT = 30;
export const MOCK_MAX_FLEXIBILITY_IMPROVEMENT = 25;

/**
 * Base scores for comfort and flexibility
 */
export const MOCK_BASE_COMFORT_INDEX = 70;
export const MOCK_BASE_FLEXIBILITY_INDEX = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Financial Scenarios & Impacts
// ─────────────────────────────────────────────────────────────────────────────

// Scenario multipliers for financial projections
export const MOCK_SCENARIO_MULTIPLIERS: Record<
  FinancialScenario,
  { energyPrice: number; inflation: number; propertyValue: number }
> = {
  baseline: { energyPrice: 1.0, inflation: 1.0, propertyValue: 1.0 },
  optimistic: { energyPrice: 1.3, inflation: 0.9, propertyValue: 1.15 },
  pessimistic: { energyPrice: 0.8, inflation: 1.15, propertyValue: 0.9 },
};

// EPC class impact on property value (percentage increase per class)
export const MOCK_EPC_VALUE_IMPACT: Record<string, number> = {
  "\u0391+": 0.15,
  "\u0391": 0.12,
  "\u0392+": 0.1,
  "\u0392": 0.08,
  "\u0393": 0.04,
  "\u0394": 0.0,
  "\u0395": -0.03,
  "\u0396": -0.06,
  "\u0397": -0.1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Energy Service Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum opening factor multiplier
 */
export const MOCK_MAX_OPENING_FACTOR = 1.5;

// Construction period impact on energy efficiency (lower = better)
export const MOCK_PERIOD_FACTOR: Record<string, number> = {
  "pre-1945": 1.8,
  "1945-1970": 1.5,
  "1971-1990": 1.3,
  "1991-2000": 1.1,
  "2001-2010": 0.9,
  "post-2010": 0.7,
};

// Building type impact (apartments generally more efficient due to shared walls)
export const MOCK_BUILDING_TYPE_FACTOR: Record<string, number> = {
  apartment: 0.85,
  terraced: 0.95,
  "semi-detached": 1.0,
  detached: 1.15,
};

// Heating technology efficiency (lower = better)
export const MOCK_HEATING_EFFICIENCY: Record<string, number> = {
  "heat-pump-ground": 0.5,
  "heat-pump-air": 0.6,
  "district-heating": 0.75,
  "biomass-central": 0.85,
  "gas-boiler": 1.0,
  "oil-boiler": 1.2,
  "electric-resistance": 1.4,
};

// Glazing technology efficiency (lower = better)
export const MOCK_GLAZING_EFFICIENCY: Record<string, number> = {
  "triple-pvc": 0.6,
  "triple-wood": 0.65,
  "double-pvc": 0.8,
  "double-wood": 0.85,
  "double-aluminium": 0.95,
  "single-wood": 1.4,
};

// Climate zone impact on energy needs
export const MOCK_CLIMATE_FACTOR: Record<
  string,
  { heating: number; cooling: number }
> = {
  A: { heating: 0.5, cooling: 1.5 }, // Mediterranean
  B: { heating: 0.7, cooling: 1.2 }, // Warm temperate
  C: { heating: 1.0, cooling: 0.8 }, // Temperate
  D: { heating: 1.3, cooling: 0.4 }, // Cold
  E: { heating: 1.6, cooling: 0.2 }, // Very cold
};

// EPC class thresholds (kWh/m²/year)
export const MOCK_EPC_THRESHOLDS: { class: string; maxValue: number }[] = [
  { class: "A+", maxValue: 30 },
  { class: "A", maxValue: 50 },
  { class: "B", maxValue: 90 },
  { class: "C", maxValue: 150 },
  { class: "D", maxValue: 230 },
  { class: "E", maxValue: 330 },
  { class: "F", maxValue: 450 },
  { class: "G", maxValue: Infinity },
];
