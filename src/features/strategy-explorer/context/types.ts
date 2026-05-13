import type {
  RSEArchetypeRef,
  RSEPackageId,
  RSEPortfolioDefinition,
  RSERenovationGoal,
  RSEWorkflowResult,
} from "../types";

export interface StrategyExplorerState {
  currentStep: 0 | 1 | 2 | 3;
  portfolio: RSEPortfolioDefinition;
  goal: RSERenovationGoal | null;
  packageIds: RSEPackageId[];
  availableArchetypes: RSEArchetypeRef[];
  workflowResult: RSEWorkflowResult | null;
  isRunningWorkflow: boolean;
  error: string | null;
}

export type StrategyExplorerAction =
  | { type: "SET_STEP"; step: 0 | 1 | 2 | 3 }
  | { type: "SET_PORTFOLIO"; portfolio: RSEPortfolioDefinition }
  | { type: "SET_GOAL"; goal: RSERenovationGoal }
  | { type: "SET_PACKAGES"; packageIds: RSEPackageId[] }
  | { type: "SET_AVAILABLE_ARCHETYPES"; archetypes: RSEArchetypeRef[] }
  | { type: "START_WORKFLOW" }
  | { type: "WORKFLOW_COMPLETE"; result: RSEWorkflowResult }
  | { type: "WORKFLOW_ERROR"; error: string }
  | { type: "RESET" }
  | { type: "CLEAR_ERROR" };
