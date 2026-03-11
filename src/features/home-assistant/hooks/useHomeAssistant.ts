import { useContext } from "react";
import {
  HomeAssistantContext,
  type HomeAssistantContextValue,
} from "../context/HomeAssistantContextDefinition";

// Re-export context value type for convenience
export type { HomeAssistantContextValue };

// ─────────────────────────────────────────────────────────────────────────────
// Consumer Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useHomeAssistant(): HomeAssistantContextValue {
  const context = useContext(HomeAssistantContext);

  if (!context) {
    throw new Error(
      "useHomeAssistant must be used within a HomeAssistantProvider",
    );
  }

  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Selector Hooks (for optimized re-renders)
// ─────────────────────────────────────────────────────────────────────────────

export function useCurrentStep(): number {
  const { state } = useHomeAssistant();
  return state.currentStep;
}

export function useBuildingInfo() {
  const { state } = useHomeAssistant();
  return state.building;
}

export function useEstimation() {
  const { state } = useHomeAssistant();
  return state.estimation;
}

export function useRenovationSelections() {
  const { state } = useHomeAssistant();
  return state.renovation;
}

export function useFundingOptions() {
  const { state } = useHomeAssistant();
  return state.funding;
}

export function useEvaluationResults() {
  const { state } = useHomeAssistant();
  return {
    scenarios: state.scenarios,
    financialResults: state.financialResults,
  };
}

export function useMCDARanking() {
  const { state } = useHomeAssistant();
  return state.mcdaRanking;
}

export function useLoadingStates() {
  const { state } = useHomeAssistant();
  return {
    isEstimating: state.isEstimating,
    isEvaluating: state.isEvaluating,
    isRanking: state.isRanking,
  };
}

export function useError() {
  const { state } = useHomeAssistant();
  return state.error;
}

export function useSelectedFundingOption() {
  const { state } = useHomeAssistant();
  return state.selectedFundingOption;
}

export function useSelectedFinancialScenario() {
  const { state } = useHomeAssistant();
  return state.selectedFinancialScenario;
}

export function useSelectedPersona() {
  const { state } = useHomeAssistant();
  return state.selectedPersona;
}
