import type { EnergyTariffOverrides } from "../../../services/energyTariffService";
import type { FundingOptions } from "../../../types/renovation";
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
  /** Null follows the reference gas price; a number is the user’s value. */
  gasTariffOverrideEurPerKwh: number | null;
  electricityTariffOverrideEurPerKwh: number | null;
  /** Applied portfolio-wide financing scenario. */
  funding: FundingOptions;
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
  | ({ type: "SET_ENERGY_TARIFFS" } & EnergyTariffOverrides)
  | { type: "SET_FUNDING"; funding: FundingOptions }
  | { type: "SET_AVAILABLE_ARCHETYPES"; archetypes: RSEArchetypeRef[] }
  | { type: "START_WORKFLOW" }
  | { type: "WORKFLOW_COMPLETE"; result: RSEWorkflowResult }
  | { type: "WORKFLOW_ERROR"; error: string }
  | { type: "RESET" };
