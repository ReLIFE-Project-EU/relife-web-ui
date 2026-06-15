/**
 * State and action types for the Portfolio Renovation Advisor wizard.
 */

import type {
  EstimationResult,
  FinancialChartMetadata,
  FinancialResults,
  FinancialRiskIndicator,
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
  /**
   * Geographic country: where the building is physically located.
   * Derived from coordinates (offline EU polygon lookup) or user input.
   * May differ from archetypeCountry when the best-match archetype is
   * from a different country than the building's actual location.
   */
  country: string;
  /**
   * Country of the matched archetype, if different from the building's
   * geographic country. Required for cross-country matches to correctly
   * resolve the archetype in the forecasting API.
   * Undefined when country and archetype country are the same.
   */
  archetypeCountry?: string;
  archetypeName?: string;
  modifications?: BuildingModifications;
  lat: number;
  lng: number;
  floorArea: number;
  archetypeFloorArea?: number; // floor area of the matched archetype (m²) — used for mismatch warnings
  constructionPeriod: string;
  numberOfFloors: number;
  propertyType: string;
  floorNumber?: number;
  estimatedCapex?: number; // EUR — total capital expenditure for renovation
  annualMaintenanceCost?: number; // EUR/year — annual O&M cost post-renovation
  selectedMeasures?: RenovationMeasureId[]; // Per-building override; falls back to portfolio-level measures when undefined
  validationStatus: "valid" | "invalid" | "pending";
  validationErrors?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
export interface ProfessionalProbabilities {
  [key: string]: number; // "Pr(NPV > 0)", "Pr(PBP < Ny)", "Pr(DPP < Ny)"
}

export interface PRAFinancialResults extends FinancialResults {
  probabilities?: ProfessionalProbabilities;
  chartMetadata?: Partial<
    Record<FinancialRiskIndicator, FinancialChartMetadata>
  >;
}

/**
 * Provenance of the CAPEX/OPEX used in a building's financial analysis. A flag
 * is true when that cost was resolved from EU reference data via the Financial
 * API lookup (i.e. no per-building/CSV value and no global override was set).
 */
export interface CostSource {
  capexFromLookup: boolean;
  opexFromLookup: boolean;
  /**
   * CAPEX came from the lookup and the package includes a heating-system
   * measure whose capacity was sized by the floor-area stopgap heuristic, so
   * the heating portion of CAPEX is preliminary.
   */
  usesHeatingStopgap?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Results
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildingAnalysisResult {
  buildingId: string;
  status: "pending" | "running" | "success" | "error" | "rejected";
  error?: string;
  /**
   * Structured diagnostic populated when status === "rejected".
   * Set by `PortfolioAnalysisService.analyzeBuilding` after `validateEstimation`
   * (src/services/estimationValidation.ts) classifies the archetype match
   * as `unusable`. Carries the strategy, scale factor, requested vs chosen
   * archetype, and a human-readable remediation hint for the UI.
   */
  rejection?: import("../../../services/estimationValidation").EstimationDiagnostic;
  estimation?: EstimationResult;
  scenarios?: RenovationScenario[];
  financialResults?: PRAFinancialResults;
  /** Provenance of the costs used; set when status === "success". */
  costSource?: CostSource;
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
  gasTariffEurPerKwh: number;
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
  | {
      type: "SET_BUILDING_MEASURES";
      buildingId: string;
      measures: RenovationMeasureId[] | undefined;
    }
  | { type: "SET_ESTIMATED_CAPEX"; capex: number | null }
  | { type: "SET_ESTIMATED_MAINTENANCE_COST"; cost: number | null }
  | { type: "SET_PROJECT_LIFETIME"; years: number }
  | { type: "SET_FINANCING_SCHEME"; scheme: FinancingScheme }
  | { type: "SET_FINANCING_TYPE"; financingType: FinancingType }
  | { type: "UPDATE_LOAN"; field: keyof LoanDetails; value: number }
  | { type: "SET_GAS_TARIFF"; gasTariffEurPerKwh: number }
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
