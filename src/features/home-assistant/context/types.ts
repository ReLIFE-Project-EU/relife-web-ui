/**
 * State and action types for the Home Renovation Assistant wizard.
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
  // Existing fields (UI-focused)
  country: string;
  climateZone: string;
  buildingType: string; // UI value, maps to API PropertyType via apiMappings
  floorArea: number | null;
  constructionPeriod: string; // UI dropdown value (e.g., "1971-1990")
  heatingTechnology: string;
  coolingTechnology: string;
  hotWaterTechnology: string;
  numberOfOpenings: number | null;
  glazingTechnology: string;

  // Fields for Financial API (/arv endpoint)
  lat: number | null; // Required for ARV, range: -90 to 90
  lng: number | null; // Required for ARV, range: -180 to 180
  constructionYear: number | null; // Integer 1800-2030, derived from constructionPeriod or user input
  numberOfFloors: number | null; // Required for ARV, 1-100
  floorNumber: number | null; // Optional, for apartments (0 = ground floor)

  // Fields for Financial API (/risk-assessment endpoint)
  projectLifetime: number; // Required, 1-30 years, default: 20

  // Fields for Financial API (/arv endpoint)
  renovatedLast5Years: boolean; // Whether property was renovated in last 5 years, default: true

  // Note: EPC (Energy Performance Certificate) is NOT a user input.
  // It is calculated by the Forecasting API and used as input to the Financial API.
  // See: api-specs/20260108-125427/financial.json - energy_class comes from energy analysis API
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy Estimation Types (Screen 1 → Screen 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface EnergyMix {
  electricity: number; // kWh/year
  heatingOil: number; // kWh/year
}

export interface EstimationResult {
  estimatedEPC: string; // UI label (A+ to G), maps to Greek for API
  annualEnergyNeeds: number; // kWh/year
  annualEnergyCost: number; // EUR/year
  heatingCoolingNeeds: number; // kWh/year
  energyMix: {
    cooling: EnergyMix;
    heating: EnergyMix;
    overall: EnergyMix;
  };
  flexibilityIndex: number; // 0-100
  comfortIndex: number; // 0-100

  // TBD: Verify this matches Forecasting API output format
  // Used as input to Financial API /risk-assessment endpoint
  annualEnergySavings: number; // kWh/year - energy savings from renovation
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
  /** Loan amount as percentage of renovation cost (0-100) */
  percentage: number;
  /** Loan duration in years */
  duration: number;
  /** Annual interest rate as decimal (e.g., 0.05 = 5%) */
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
  annualEnergyNeeds: number;
  annualEnergyCost: number;
  heatingCoolingNeeds: number;
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
  years: number[];
  initial_investment?: number;
  annual_inflows: number[];
  annual_outflows: number[];
  annual_net_cash_flow?: number[];
  cumulative_cash_flow?: number[];
  breakeven_year?: number | null;
  loan_term?: number | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Complete State Shape
// ─────────────────────────────────────────────────────────────────────────────

export interface HomeAssistantState {
  // Wizard control
  currentStep: 0 | 1 | 2;

  // Screen 1 data
  building: BuildingInfo;

  // Screen 1 → 2 results
  estimation: EstimationResult | null;

  // Screen 2 selections
  renovation: RenovationSelections;
  funding: FundingOptions;

  // Screen 3 results
  scenarios: RenovationScenario[];
  financialResults: Record<ScenarioId, FinancialResults>; // keyed by scenario ID
  selectedFundingOption: string;
  selectedFinancialScenario: FinancialScenario;
  selectedPersona: string;
  mcdaRanking: MCDARankingResult[] | null;

  // Loading states
  isEstimating: boolean;
  isEvaluating: boolean;
  isRanking: boolean;

  // Error state
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Types
// ─────────────────────────────────────────────────────────────────────────────

export type HomeAssistantAction =
  // Navigation
  | { type: "SET_STEP"; step: 0 | 1 | 2 }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }

  // Building info updates
  | { type: "UPDATE_BUILDING"; field: keyof BuildingInfo; value: unknown }
  | { type: "SET_BUILDING"; building: Partial<BuildingInfo> }

  // Estimation
  | { type: "START_ESTIMATION" }
  | { type: "SET_ESTIMATION"; result: EstimationResult }
  | { type: "ESTIMATION_ERROR"; error: string }

  // Renovation measure selections
  | { type: "TOGGLE_MEASURE"; measureId: RenovationMeasureId }
  | { type: "SET_MEASURES"; measures: RenovationMeasureId[] }
  | { type: "SET_ESTIMATED_CAPEX"; capex: number | null }
  | { type: "SET_ESTIMATED_MAINTENANCE_COST"; cost: number | null }

  // Funding options
  | { type: "SET_FINANCING_TYPE"; financingType: FinancingType }
  | { type: "UPDATE_LOAN"; field: keyof LoanDetails; value: number }

  // Evaluation
  | { type: "START_EVALUATION" }
  | {
      type: "SET_EVALUATION_RESULTS";
      scenarios: RenovationScenario[];
      financial: Record<ScenarioId, FinancialResults>;
    }
  | { type: "EVALUATION_ERROR"; error: string }

  // Results interaction
  | { type: "SELECT_FUNDING_OPTION"; option: string }
  | { type: "SELECT_FINANCIAL_SCENARIO"; scenario: FinancialScenario }
  | { type: "SELECT_PERSONA"; persona: string }

  // MCDA ranking
  | { type: "START_RANKING" }
  | { type: "SET_RANKING"; ranking: MCDARankingResult[] }
  | { type: "RANKING_ERROR"; error: string }

  // Reset
  | { type: "RESET" }
  | { type: "CLEAR_ERROR" };
