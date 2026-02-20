/**
 * Reducer for the Portfolio Renovation Advisor wizard state.
 */

import { PRA_DEFAULT_PROJECT_LIFETIME } from "../constants";
import type { PortfolioAdvisorAction, PortfolioAdvisorState } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

export const initialState: PortfolioAdvisorState = {
  currentStep: 0,
  buildings: [],
  renovation: {
    selectedMeasures: [],
    estimatedCapex: null,
    estimatedMaintenanceCost: null,
  },
  projectLifetime: PRA_DEFAULT_PROJECT_LIFETIME,
  financingScheme: "equity",
  funding: {
    financingType: "self-funded",
    loan: {
      percentage: 80,
      duration: 10,
      interestRate: 0.05,
    },
  },
  buildingResults: {},
  selectedPersona: "cost-optimization",
  mcdaRanking: null,
  analysisProgress: null,
  isEstimating: false,
  isEvaluating: false,
  isRanking: false,
  error: null,
};

/**
 * Helper to clear all analysis results when inputs change.
 */
const clearedAnalysisResults = {
  buildingResults: {} as PortfolioAdvisorState["buildingResults"],
  mcdaRanking: null,
  analysisProgress: null,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

export function portfolioAdvisorReducer(
  state: PortfolioAdvisorState,
  action: PortfolioAdvisorAction,
): PortfolioAdvisorState {
  switch (action.type) {
    // ─────────────────────────────────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };

    // ─────────────────────────────────────────────────────────────────────────
    // Building Management
    // ─────────────────────────────────────────────────────────────────────────
    case "ADD_BUILDING":
      return {
        ...state,
        buildings: [...state.buildings, action.building],
        ...clearedAnalysisResults,
      };

    case "REMOVE_BUILDING":
      return {
        ...state,
        buildings: state.buildings.filter((b) => b.id !== action.buildingId),
        ...clearedAnalysisResults,
      };

    case "SET_BUILDINGS":
      return {
        ...state,
        buildings: action.buildings,
        ...clearedAnalysisResults,
      };

    case "APPEND_BUILDINGS":
      return {
        ...state,
        buildings: [...state.buildings, ...action.buildings],
        ...clearedAnalysisResults,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Renovation Measure Selections
    // ─────────────────────────────────────────────────────────────────────────
    case "TOGGLE_MEASURE": {
      const { measureId } = action;
      const isSelected = state.renovation.selectedMeasures.includes(measureId);
      const newSelectedMeasures = isSelected
        ? state.renovation.selectedMeasures.filter((id) => id !== measureId)
        : [...state.renovation.selectedMeasures, measureId];

      return {
        ...state,
        renovation: {
          ...state.renovation,
          selectedMeasures: newSelectedMeasures,
        },
        ...clearedAnalysisResults,
      };
    }

    case "SET_MEASURES":
      return {
        ...state,
        renovation: {
          ...state.renovation,
          selectedMeasures: action.measures,
        },
        ...clearedAnalysisResults,
      };

    case "SET_ESTIMATED_CAPEX":
      return {
        ...state,
        renovation: {
          ...state.renovation,
          estimatedCapex: action.capex,
        },
        ...clearedAnalysisResults,
      };

    case "SET_ESTIMATED_MAINTENANCE_COST":
      return {
        ...state,
        renovation: {
          ...state.renovation,
          estimatedMaintenanceCost: action.cost,
        },
        ...clearedAnalysisResults,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Project Settings
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_PROJECT_LIFETIME":
      return {
        ...state,
        projectLifetime: action.years,
        ...clearedAnalysisResults,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Financing
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_FINANCING_SCHEME": {
      // Map scheme to financing type
      const financingType = action.scheme === "debt" ? "loan" : "self-funded";
      return {
        ...state,
        financingScheme: action.scheme,
        funding: {
          ...state.funding,
          financingType,
        },
        ...clearedAnalysisResults,
      };
    }

    case "SET_FINANCING_TYPE":
      return {
        ...state,
        funding: {
          ...state.funding,
          financingType: action.financingType,
        },
        ...clearedAnalysisResults,
      };

    case "UPDATE_LOAN":
      return {
        ...state,
        funding: {
          ...state.funding,
          loan: {
            ...state.funding.loan,
            [action.field]: action.value,
          },
        },
        ...clearedAnalysisResults,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Analysis
    // ─────────────────────────────────────────────────────────────────────────
    case "START_ANALYSIS":
      return {
        ...state,
        isEvaluating: true,
        buildingResults: {},
        analysisProgress: { completed: 0, total: state.buildings.length },
        error: null,
      };

    case "UPDATE_ANALYSIS_PROGRESS":
      return {
        ...state,
        analysisProgress: {
          completed: action.completed,
          total: action.total,
          currentBuilding: action.currentBuilding,
        },
      };

    case "SET_BUILDING_RESULT":
      return {
        ...state,
        buildingResults: {
          ...state.buildingResults,
          [action.buildingId]: action.result,
        },
      };

    case "BATCH_SET_BUILDING_RESULTS":
      return {
        ...state,
        buildingResults: {
          ...state.buildingResults,
          ...action.results,
        },
      };

    case "ANALYSIS_COMPLETE":
      return {
        ...state,
        isEvaluating: false,
        analysisProgress: null,
      };

    case "ANALYSIS_ERROR":
      return {
        ...state,
        isEvaluating: false,
        error: action.error,
        analysisProgress: null,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // MCDA / Persona
    // ─────────────────────────────────────────────────────────────────────────
    case "SELECT_PERSONA":
      return {
        ...state,
        selectedPersona: action.persona,
        mcdaRanking: null,
      };

    case "START_RANKING":
      return {
        ...state,
        isRanking: true,
        error: null,
      };

    case "SET_RANKING":
      return {
        ...state,
        mcdaRanking: action.ranking,
        isRanking: false,
        error: null,
      };

    case "RANKING_ERROR":
      return {
        ...state,
        isRanking: false,
        error: action.error,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Reset and Error Handling
    // ─────────────────────────────────────────────────────────────────────────
    case "RESET":
      return initialState;

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}
