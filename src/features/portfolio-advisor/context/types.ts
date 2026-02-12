/**
 * State and action types for the Portfolio Renovation Advisor wizard.
 */

import type {
  EstimationResult,
  FinancialResults,
  FinancingType,
  FundingOptions,
  LoanDetails,
  MCDARankingResult,
  RenovationMeasureId,
  RenovationScenario,
  RenovationSelections,
} from "../../../types/renovation";
import type { BuildingModifications } from "../../../types/archetype";
import type { FinancingScheme } from "../constants";

export type { FinancingScheme };

// ─────────────────────────────────────────────────────────────────────────────
// Building Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PRABuilding {
  id: string;
  name: string;
  source: "csv" | "manual";
  category: string;
  country: string;
  archetypeName?: string;
  modifications?: BuildingModifications;
  lat: number;
  lng: number;
  floorArea: number;
  constructionYear: number;
  numberOfFloors: number;
  propertyType: string;
  floorNumber?: number;
  estimatedCapex?: number; // EUR — total capital expenditure for renovation
  annualMaintenanceCost?: number; // EUR/year — annual O&M cost post-renovation
  validationStatus: "valid" | "invalid" | "pending";
  validationErrors?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Professional Output Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartBinData {
  centers: number[];
  counts: number[];
  edges: number[];
}

export interface ChartStatistics {
  mean: number;
  std: number;
  P10: number;
  P50: number;
  P90: number;
}

export interface KPIChartMetadata {
  bins: ChartBinData;
  statistics: ChartStatistics;
}

export interface ProfessionalProbabilities {
  [key: string]: number; // "Pr(NPV > 0)", "Pr(PBP < Ny)", "Pr(DPP < Ny)"
}

export interface PRAFinancialResults extends FinancialResults {
  probabilities?: ProfessionalProbabilities;
  chartMetadata?: Record<string, KPIChartMetadata>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Results
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildingAnalysisResult {
  buildingId: string;
  status: "pending" | "running" | "success" | "error";
  error?: string;
  estimation?: EstimationResult;
  scenarios?: RenovationScenario[];
  financialResults?: PRAFinancialResults;
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioAdvisorState {
  currentStep: 0 | 1 | 2 | 3;
  buildings: PRABuilding[];
  renovation: RenovationSelections;
  projectLifetime: number;
  financingScheme: FinancingScheme;
  funding: FundingOptions;
  buildingResults: Record<string, BuildingAnalysisResult>;
  selectedPersona: string;
  mcdaRanking: MCDARankingResult[] | null;
  analysisProgress: {
    completed: number;
    total: number;
    currentBuilding?: string;
  } | null;
  isEstimating: boolean;
  isEvaluating: boolean;
  isRanking: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export type PortfolioAdvisorAction =
  | { type: "SET_STEP"; step: 0 | 1 | 2 | 3 }
  | { type: "ADD_BUILDING"; building: PRABuilding }
  | { type: "REMOVE_BUILDING"; buildingId: string }
  | { type: "SET_BUILDINGS"; buildings: PRABuilding[] }
  | { type: "APPEND_BUILDINGS"; buildings: PRABuilding[] }
  | { type: "TOGGLE_MEASURE"; measureId: RenovationMeasureId }
  | { type: "SET_MEASURES"; measures: RenovationMeasureId[] }
  | { type: "SET_ESTIMATED_CAPEX"; capex: number | null }
  | { type: "SET_ESTIMATED_MAINTENANCE_COST"; cost: number | null }
  | { type: "SET_PROJECT_LIFETIME"; years: number }
  | { type: "SET_FINANCING_SCHEME"; scheme: FinancingScheme }
  | { type: "SET_FINANCING_TYPE"; financingType: FinancingType }
  | { type: "UPDATE_LOAN"; field: keyof LoanDetails; value: number }
  | { type: "START_ANALYSIS" }
  | {
      type: "UPDATE_ANALYSIS_PROGRESS";
      completed: number;
      total: number;
      currentBuilding?: string;
    }
  | {
      type: "SET_BUILDING_RESULT";
      buildingId: string;
      result: BuildingAnalysisResult;
    }
  | {
      type: "BATCH_SET_BUILDING_RESULTS";
      results: Record<string, BuildingAnalysisResult>;
    }
  | { type: "ANALYSIS_COMPLETE" }
  | { type: "ANALYSIS_ERROR"; error: string }
  | { type: "SELECT_PERSONA"; persona: string }
  | { type: "START_RANKING" }
  | { type: "SET_RANKING"; ranking: MCDARankingResult[] }
  | { type: "RANKING_ERROR"; error: string }
  | { type: "RESET" }
  | { type: "CLEAR_ERROR" };
