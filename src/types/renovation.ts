/**
 * Shared renovation domain types used across tools (HRA, PRA, etc.)
 *
 * TBD INTEGRATION NOTES
 * =====================
 * Some types are aligned with api-specs/20260108-125427/ but the following
 * integrations are pending finalization:
 * - [ ] Forecasting API: BuildingInfo -> BuildingPayload mapping
 * - [ ] Technical API: MCDA pillar endpoint integration
 *
 * Reference: api-specs/20260108-125427/financial.json
 */

// ─────────────────────────────────────────────────────────────────────────────
// Building Information Types (Screen 1)
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildingInfo {
  // Location and basic identification
  country: string;
  lat: number | null; // Required for PVGIS weather and archetype matching, range: -90 to 90
  lng: number | null; // Required for PVGIS weather and archetype matching, range: -180 to 180

  // Building category (from archetype)
  buildingType: string; // Maps to archetype category (e.g., "Single Family House")

  // Construction period (from archetype)
  constructionPeriod: string; // e.g., "1946-1969", extracted from archetype name

  // Archetype selection tracking
  selectedArchetype?: {
    name: string;
    category: string;
    country: string;
  };

  // User-modifiable parameters (Optional - for modified archetype workflow)
  isModified: boolean; // Whether user has modified archetype defaults
  modifications?: import("./archetype").BuildingModifications; // Modifications to apply to archetype
  floorArea: number | null; // m² - can be modified by user
  numberOfFloors: number | null; // 1-100 - can be modified by user

  // Deprecated fields (kept for backward compatibility with Financial API)
  // These are now derived from archetype or removed from user input
  climateZone: string; // Deprecated - not user input
  heatingTechnology: string; // Deprecated - fixed in archetype
  coolingTechnology: string; // Deprecated - fixed in archetype
  hotWaterTechnology: string; // Deprecated - fixed in archetype
  numberOfOpenings: number | null; // Deprecated - derived from archetype
  glazingTechnology: string; // Deprecated - fixed in archetype

  // Fields for Financial API (/arv endpoint)
  constructionYear: number | null; // Integer 1800-2030, derived from constructionPeriod
  floorNumber: number | null; // Optional, for apartments (0 = ground floor)

  // Fields for Financial API (/risk-assessment endpoint)
  projectLifetime: number; // Required, 1-30 years, default: 20

  // Fields for Financial API (/arv endpoint)
  renovatedLast5Years: boolean; // Whether property was renovated in last 5 years, default: true

  // Note: EPC (Energy Performance Certificate) is NOT a user input.
  // It is calculated by the Forecasting API and used as input to the Financial API.
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy Estimation Types (Screen 1 -> Screen 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface EnergyMix {
  electricity: number; // kWh/year
  /**
   * Annual consumption of the primary non-electric fuel (kWh/year).
   * Named "heatingOil" for historical reasons but covers any primary fuel type
   * (heating oil, natural gas, etc.) depending on the building's heating technology.
   */
  heatingOil: number; // kWh/year
}

export interface EstimationResult {
  estimatedEPC: string; // UI label (A+ to G), maps to Greek for API
  annualEnergyNeeds: number; // kWh/year (HVAC demand, API-derived)
  annualEnergyCost: number; // EUR/year (derived from annualEnergyNeeds using ENERGY_PRICE_EUR_PER_KWH)
  heatingCoolingNeeds: number; // kWh/year (HVAC demand, API-derived)
  energyMix: {
    cooling: EnergyMix;
    heating: EnergyMix;
    overall: EnergyMix;
  };
  flexibilityIndex: number; // 0-100
  comfortIndex: number; // 0-100

  // Total annual HVAC energy consumption of the building in its current (pre-renovation) state.
  // Named "Consumption" to distinguish it from savings, which are computed in FinancialService
  // by subtracting the renovated scenario's annualEnergyNeeds from this value.
  annualEnergyConsumption: number; // kWh/year

  /**
   * Floor area of the matched archetype (m²).
   * Stored here so RenovationService can use the same denominator as EnergyService
   * when scaling simulated energy values to the user's building area.
   * Falls back to DEFAULT_FLOOR_AREA (100 m²) when the API does not return building_area.
   */
  archetypeFloorArea: number;

  /**
   * Archetype used for the estimation.
   * Persisted here so it can be reused for renovation simulations (Step 2),
   * ensuring consistent baseline.
   */
  archetype?: {
    category: string;
    country: string;
    name: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renovation Selection Types (Screen 2)
// D3.2 defines 8 individual renovation measures that users can multi-select
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Individual renovation measure IDs as defined in D3.2 requirements.
 * Users can select multiple measures to include in their renovation plan.
 */
export type RenovationMeasureId =
  | "wall-insulation"
  | "roof-insulation"
  | "floor-insulation"
  | "windows"
  | "air-water-heat-pump"
  | "condensing-boiler"
  | "pv"
  | "solar-thermal";

/**
 * @deprecated Use RenovationMeasureId instead. Kept for backward compatibility during transition.
 */
export type PackageId = "soft" | "regular" | "deep";

export interface RenovationSelections {
  /** Selected renovation measure IDs */
  selectedMeasures: RenovationMeasureId[];
  /** Optional user-provided CAPEX override (EUR). If null, API fetches from database. */
  estimatedCapex: number | null;
  /** Optional user-provided annual maintenance cost (EUR/year). If null, API fetches from database. */
  estimatedMaintenanceCost: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funding Options Types (Screen 2)
// Per design doc: Only two financing types - Self-funded (Equity) or Loan
// ─────────────────────────────────────────────────────────────────────────────

export type FinancingType = "self-funded" | "loan";

export interface LoanDetails {
  /**
   * Loan amount as a percentage of renovation cost (0–100 scale, e.g., 70 means 70%).
   * Note: uses 0-100 convention — divided by 100 in financialCalculations.applyFundingReduction().
   */
  percentage: number;
  /** Loan duration in years */
  duration: number;
  /**
   * Annual interest rate as a decimal fraction (e.g., 0.05 = 5%).
   * Note: uses 0–1 convention — unlike `percentage` above which uses 0–100.
   */
  interestRate: number;
}

export interface FundingOptions {
  /** The chosen financing type */
  financingType: FinancingType;
  /** Loan details (only relevant when financingType is "loan") */
  loan: LoanDetails;
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Types (Screen 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scenario IDs for comparison.
 * - "current": Baseline before renovation
 * - "renovated": After applying selected measures
 */
export type ScenarioId = "current" | "renovated";

export interface RenovationScenario {
  id: ScenarioId;
  label: string;
  epcClass: string;
  annualEnergyNeeds: number; // kWh/year (HVAC demand, API-derived)
  annualEnergyCost: number; // EUR/year (derived from annualEnergyNeeds using ENERGY_PRICE_EUR_PER_KWH)
  heatingCoolingNeeds: number; // kWh/year (HVAC demand, API-derived)
  flexibilityIndex: number;
  comfortIndex: number;
  measures: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial API Response Types
// Matches api-specs/20260108-125427/financial.json schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ARV (After Renovation Value) result from POST /arv
 */
export interface ARVResult {
  pricePerSqm: number; // EUR/m²
  totalPrice: number; // EUR
  floorArea: number; // Echo of input
  energyClass: string; // Echo of input (Greek label)
  metadata?: Record<string, unknown>;
}

/**
 * Point forecasts from risk assessment (P50/median values)
 * For output_level: "private" (HRA tool), this is the main output
 */
export interface RiskAssessmentPointForecasts {
  NPV: number; // Net Present Value (EUR)
  IRR: number; // Internal Rate of Return (decimal, e.g., 0.057 = 5.7%)
  ROI: number; // Return on Investment (decimal)
  PBP: number; // Payback Period (years)
  DPP: number; // Discounted Payback Period (years)
  MonthlyAvgSavings: number; // EUR/month
  SuccessRate: number; // Probability of positive outcome (0-1)
}

/**
 * Metadata from risk assessment simulation
 */
export interface RiskAssessmentMetadata {
  n_sims?: number; // Number of Monte Carlo simulations (optional - only show if API returns it)
  project_lifetime: number;
  capex: number; // Used CAPEX value (may come from API dataset)
  loan_amount: number;
  annual_loan_payment?: number;
  loan_rate_percent?: number;
  output_level: string;
  cash_flow_data?: CashFlowData;
  [key: string]: unknown;
}

export interface CashFlowData {
  years: number[]; // Year indices [0, 1, 2, ..., n]
  initial_investment?: number; // EUR — out-of-pocket investment at Year 0
  annual_inflows: number[]; // EUR — energy savings revenue per year
  annual_outflows: number[]; // EUR — maintenance + loan payments per year
  annual_net_cash_flow?: number[]; // EUR — inflows minus outflows per year
  cumulative_cash_flow?: number[]; // EUR — running cumulative net cash flow
  breakeven_year?: number | null; // Year index when cumulative turns positive
  loan_term?: number | null; // Years — loan repayment duration
}

/**
 * Percentile data for a single financial metric
 * P10 = pessimistic (10th percentile), P90 = optimistic (90th percentile)
 */
export interface PercentileData {
  P10: number;
  P20?: number;
  P30?: number;
  P40?: number;
  P50: number;
  P60?: number;
  P70?: number;
  P80?: number;
  P90: number;
}

/**
 * Percentiles for all financial indicators
 * Available when output_level is higher than "private"
 */
export interface RiskAssessmentPercentiles {
  NPV?: PercentileData;
  PBP?: PercentileData;
  ROI?: PercentileData;
  IRR?: PercentileData;
  DPP?: PercentileData;
}

/**
 * Complete financial results combining ARV and Risk Assessment
 */
export interface FinancialResults {
  // From POST /arv
  arv: ARVResult | null;

  // From POST /risk-assessment with output_level: "private"
  riskAssessment: {
    pointForecasts: RiskAssessmentPointForecasts;
    metadata: RiskAssessmentMetadata;
    percentiles?: RiskAssessmentPercentiles; // Available when output_level > "private"
    cashFlowVisualization?: string; // base64 PNG (included for private level)
    cashFlowData?: CashFlowData;
  } | null;

  // Derived/cached values from API responses for convenience
  capitalExpenditure: number; // From metadata.capex
  returnOnInvestment: number; // From pointForecasts.ROI
  paybackTime: number; // From pointForecasts.PBP
  netPresentValue: number; // From pointForecasts.NPV
  afterRenovationValue: number; // From arv.totalPrice
  // NOTE: For ranges, use riskAssessment.percentiles (actual API data) instead of fake calculations
}

export type FinancialScenario = "baseline" | "optimistic" | "pessimistic";

export interface MCDARankingResult {
  scenarioId: ScenarioId;
  rank: number;
  score: number;
}
