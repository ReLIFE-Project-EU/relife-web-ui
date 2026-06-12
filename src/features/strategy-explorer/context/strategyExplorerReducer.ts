import { RSE_ENERGY_TARIFF_DEFAULTS, RSE_PACKAGE_IDS } from "../constants";
import type { StrategyExplorerAction, StrategyExplorerState } from "./types";

export const initialState: StrategyExplorerState = {
  currentStep: 0,
  portfolio: { selections: [] },
  goal: null,
  packageIds: [...RSE_PACKAGE_IDS],
  gasTariffEurPerKwh: RSE_ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
  availableArchetypes: [],
  workflowResult: null,
  isRunningWorkflow: false,
  error: null,
};

const clearedWorkflowResults = {
  workflowResult: null as StrategyExplorerState["workflowResult"],
} as const;

export function strategyExplorerReducer(
  state: StrategyExplorerState,
  action: StrategyExplorerAction,
): StrategyExplorerState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };

    case "SET_PORTFOLIO":
      return {
        ...state,
        portfolio: action.portfolio,
        ...clearedWorkflowResults,
      };

    case "SET_GOAL":
      return {
        ...state,
        goal: action.goal,
        ...clearedWorkflowResults,
      };

    case "SET_PACKAGES":
      return {
        ...state,
        packageIds: action.packageIds,
        ...clearedWorkflowResults,
      };

    case "SET_GAS_TARIFF":
      return {
        ...state,
        gasTariffEurPerKwh: action.gasTariffEurPerKwh,
        ...clearedWorkflowResults,
      };

    case "SET_AVAILABLE_ARCHETYPES":
      return { ...state, availableArchetypes: action.archetypes };

    case "START_WORKFLOW":
      return {
        ...state,
        isRunningWorkflow: true,
        error: null,
      };

    case "WORKFLOW_COMPLETE":
      return {
        ...state,
        workflowResult: action.result,
        isRunningWorkflow: false,
      };

    case "WORKFLOW_ERROR":
      return {
        ...state,
        isRunningWorkflow: false,
        error: action.error,
      };

    case "RESET":
      return initialState;

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}
