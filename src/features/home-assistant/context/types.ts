/**
 * State and action types for the Home Renovation Assistant wizard.
 *
 * Domain types (BuildingInfo, EstimationResult, etc.) are defined in
 * src/types/renovation.ts and re-exported here for backward compatibility.
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

import type {
  BuildingInfo,
  FinancialResults,
  FinancialScenario,
  FinancingType,
  FundingOptions,
  LoanDetails,
  MCDARankingResult,
  RenovationMeasureId,
  RenovationScenario,
  RenovationSelections,
  ScenarioId,
  EstimationResult,
} from "../../../types/renovation";

// Re-export all shared domain types for backward compatibility
export type {
  ARVResult,
  BuildingInfo,
  CashFlowData,
  EnergyMix,
  EstimationResult,
  FinancialResults,
  FinancialScenario,
  FinancingType,
  FundingOptions,
  LoanDetails,
  MCDARankingResult,
  PackageId,
  PercentileData,
  RenovationMeasureId,
  RenovationScenario,
  RenovationSelections,
  RiskAssessmentMetadata,
  RiskAssessmentPercentiles,
  RiskAssessmentPointForecasts,
  ScenarioId,
} from "../../../types/renovation";

// ─────────────────────────────────────────────────────────────────────────────
// Complete State Shape
// ─────────────────────────────────────────────────────────────────────────────

export interface HomeAssistantState {
  // Wizard control
  currentStep: 0 | 1 | 2;

  // Screen 1 data
  building: BuildingInfo;

  // Screen 1 -> 2 results
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
