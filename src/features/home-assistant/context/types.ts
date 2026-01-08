/**
 * State and action types for the Home Renovation Assistant wizard.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Building Information Types (Screen 1)
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildingInfo {
  country: string;
  climateZone: string;
  buildingType: string;
  floorArea: number | null;
  constructionPeriod: string;
  currentEPC: string | null;
  heatingTechnology: string;
  coolingTechnology: string;
  hotWaterTechnology: string;
  numberOfOpenings: number | null;
  glazingTechnology: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy Estimation Types (Screen 1 → Screen 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface EnergyMix {
  electricity: number; // kWh/year
  heatingOil: number; // kWh/year
}

export interface EstimationResult {
  estimatedEPC: string; // A+ to G
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
// ─────────────────────────────────────────────────────────────────────────────

export interface ReturnsOnBillsOption {
  enabled: boolean;
  percentOfSavedEnergy: number;
}

export interface LoanOption {
  enabled: boolean;
  amountLimit: number;
  duration: number;
  rateType: "floating" | "fixed";
}

export interface SubsidyOption {
  enabled: boolean;
  percentOfTotal: number;
  amountLimit: number;
}

export interface FundingOptions {
  returnsOnBills: ReturnsOnBillsOption;
  loan: LoanOption;
  subsidy: SubsidyOption;
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

export interface FinancialResults {
  capitalExpenditure: number;
  returnOnInvestment: number; // Percentage
  paybackTime: number; // Years
  netPresentValue: number; // EUR
  afterRenovationValue: number; // EUR
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
  | {
      type: "UPDATE_FUNDING";
      fundingType: keyof FundingOptions;
      field: string;
      value: unknown;
    }
  | { type: "TOGGLE_FUNDING"; fundingType: keyof FundingOptions }

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
