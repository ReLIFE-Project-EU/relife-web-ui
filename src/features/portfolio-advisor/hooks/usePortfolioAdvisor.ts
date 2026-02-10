/**
 * Hook to access Portfolio Advisor context
 */

import { useContext } from "react";
import {
  PortfolioAdvisorContext,
  type PortfolioAdvisorContextValue,
} from "../context/PortfolioAdvisorContextDefinition";

// Re-export context value type for convenience
export type { PortfolioAdvisorContextValue };

// ─────────────────────────────────────────────────────────────────────────────
// Consumer Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePortfolioAdvisor(): PortfolioAdvisorContextValue {
  const context = useContext(PortfolioAdvisorContext);

  if (!context) {
    throw new Error(
      "usePortfolioAdvisor must be used within a PortfolioAdvisorProvider",
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
export function useCurrentStep() {
  const { state } = usePortfolioAdvisor();
  return state.currentStep;
}

/**
 * Get the portfolio buildings
 */
export function usePRABuildings() {
  const { state } = usePortfolioAdvisor();
  return state.buildings;
}

/**
 * Get renovation selections
 */
export function usePRARenovation() {
  const { state } = usePortfolioAdvisor();
  return state.renovation;
}

/**
 * Get financing configuration
 */
export function usePRAFinancing() {
  const { state } = usePortfolioAdvisor();
  return {
    financingScheme: state.financingScheme,
    funding: state.funding,
    projectLifetime: state.projectLifetime,
  };
}

/**
 * Get analysis progress
 */
export function usePRAAnalysisProgress() {
  const { state } = usePortfolioAdvisor();
  return state.analysisProgress;
}

/**
 * Get building analysis results
 */
export function usePRABuildingResults() {
  const { state } = usePortfolioAdvisor();
  return state.buildingResults;
}

/**
 * Get loading states
 */
export function usePortfolioLoadingStates() {
  const { state } = usePortfolioAdvisor();
  return {
    isEstimating: state.isEstimating,
    isEvaluating: state.isEvaluating,
    isRanking: state.isRanking,
  };
}

/**
 * Get error state
 */
export function usePortfolioError() {
  const { state } = usePortfolioAdvisor();
  return state.error;
}
