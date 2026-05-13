import { useContext } from "react";
import {
  StrategyExplorerContext,
  type StrategyExplorerContextValue,
} from "../context/StrategyExplorerContextDefinition";

export type { StrategyExplorerContextValue };

export function useStrategyExplorer(): StrategyExplorerContextValue {
  const context = useContext(StrategyExplorerContext);

  if (!context) {
    throw new Error(
      "useStrategyExplorer must be used within a StrategyExplorerProvider",
    );
  }

  return context;
}

export function useCurrentStep() {
  const { state } = useStrategyExplorer();
  return state.currentStep;
}

export function useRSEPortfolio() {
  const { state } = useStrategyExplorer();
  return state.portfolio;
}

export function useRSEGoal() {
  const { state } = useStrategyExplorer();
  return state.goal;
}

export function useRSEPackages() {
  const { state } = useStrategyExplorer();
  return state.packageIds;
}

export function useRSEAvailableArchetypes() {
  const { state } = useStrategyExplorer();
  return state.availableArchetypes;
}

export function useRSEWorkflowResult() {
  const { state } = useStrategyExplorer();
  return state.workflowResult;
}

export function useRSEIsRunningWorkflow() {
  const { state } = useStrategyExplorer();
  return state.isRunningWorkflow;
}

export function useRSEError() {
  const { state } = useStrategyExplorer();
  return state.error;
}
