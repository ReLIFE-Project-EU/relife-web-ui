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

export function useRSEPackages() {
  const { state } = useStrategyExplorer();
  return state.packageIds;
}

export function useRSEAvailableArchetypes() {
  const { state } = useStrategyExplorer();
  return state.availableArchetypes;
}
