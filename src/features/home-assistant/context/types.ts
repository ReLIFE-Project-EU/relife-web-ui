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
// ─────────────────────────────────────────────────────────────────────────────

export type PackageId = "soft" | "regular" | "deep";

export interface RenovationSelections {
  selectedPackages: PackageId[];
  interventions: Record<PackageId, string[]>; // Selected intervention IDs per package
  costs: Record<PackageId, number>; // EUR/m² per package
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

export type ScenarioId = "current" | "mild" | "regular" | "deep";

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
  n_sims: number; // Number of Monte Carlo simulations (typically 10000)
  project_lifetime: number;
  capex: number; // Used CAPEX value (may come from API dataset)
  loan_amount: number;
  annual_loan_payment?: number;
  loan_rate_percent?: number;
  output_level: string;
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
    cashFlowVisualization?: string; // base64 PNG (included for private level)
  } | null;

  // Legacy fields for backward compatibility during transition
  // TODO: Remove these once all components are updated
  capitalExpenditure: number;
  returnOnInvestment: number; // Percentage (derived from ROI)
  paybackTime: number; // Years (derived from PBP)
  netPresentValue: number; // EUR (derived from NPV)
  afterRenovationValue: number; // EUR (derived from ARV totalPrice)
  paybackTimeRange?: { min: number; max: number };
  npvRange?: { min: number; max: number };
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

  // Renovation selections
  | { type: "TOGGLE_PACKAGE"; packageId: PackageId }
  | {
      type: "TOGGLE_INTERVENTION";
      packageId: PackageId;
      interventionId: string;
    }
  | { type: "UPDATE_PACKAGE_COST"; packageId: PackageId; cost: number }
  | {
      type: "SET_PACKAGE_INTERVENTIONS";
      packageId: PackageId;
      interventions: string[];
    }

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
