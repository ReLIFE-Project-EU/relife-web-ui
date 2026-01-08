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

/**
 * Get the current wizard step
 */
export function useCurrentStep(): number {
  const { state } = useHomeAssistant();
  return state.currentStep;
}

/**
 * Get the building information
 */
export function useBuildingInfo() {
  const { state } = useHomeAssistant();
  return state.building;
}

/**
 * Get the estimation results
 */
export function useEstimation() {
  const { state } = useHomeAssistant();
  return state.estimation;
}

/**
 * Get renovation selections
 */
export function useRenovationSelections() {
  const { state } = useHomeAssistant();
  return state.renovation;
}

/**
 * Get funding options
 */
export function useFundingOptions() {
  const { state } = useHomeAssistant();
  return state.funding;
}

/**
 * Get evaluation results (scenarios and financial data)
 */
export function useEvaluationResults() {
  const { state } = useHomeAssistant();
  return {
    scenarios: state.scenarios,
    financialResults: state.financialResults,
  };
}

/**
 * Get MCDA ranking results
 */
export function useMCDARanking() {
  const { state } = useHomeAssistant();
  return state.mcdaRanking;
}

/**
 * Get loading states
 */
export function useLoadingStates() {
  const { state } = useHomeAssistant();
  return {
    isEstimating: state.isEstimating,
    isEvaluating: state.isEvaluating,
    isRanking: state.isRanking,
  };
}

/**
 * Get error state
 */
export function useError() {
  const { state } = useHomeAssistant();
  return state.error;
}

/**
 * Get selected funding option
 */
export function useSelectedFundingOption() {
  const { state } = useHomeAssistant();
  return state.selectedFundingOption;
}

/**
 * Get selected financial scenario
 */
export function useSelectedFinancialScenario() {
  const { state } = useHomeAssistant();
  return state.selectedFinancialScenario;
}

/**
 * Get selected MCDA persona
 */
export function useSelectedPersona() {
  const { state } = useHomeAssistant();
  return state.selectedPersona;
}
