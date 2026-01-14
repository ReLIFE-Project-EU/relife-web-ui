/**
 * Reducer for the Home Renovation Assistant wizard state.
 */

import { PROJECT_LIFETIME_DEFAULT } from "../constants";
import type {
  BuildingInfo,
  FundingOptions,
  HomeAssistantAction,
  HomeAssistantState,
  RenovationSelections,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialBuilding: BuildingInfo = {
  // Existing fields (UI-focused)
  country: "AT", // Austria as default (matches mock-up)
  climateZone: "D",
  buildingType: "apartment",
  floorArea: null,
  constructionPeriod: "1991-2000",
  heatingTechnology: "biomass-central",
  coolingTechnology: "natural-airflow",
  hotWaterTechnology: "electric-boiler",
  numberOfOpenings: null,
  glazingTechnology: "double-aluminium",

  // Fields for Financial API (/arv endpoint)
  lat: null, // Required for ARV, will be set via UI
  lng: null, // Required for ARV, will be set via UI
  constructionYear: null, // Derived from constructionPeriod or user input
  numberOfFloors: null, // Required for ARV
  floorNumber: null, // Optional, for apartments

  // Fields for Financial API (/risk-assessment endpoint)
  projectLifetime: PROJECT_LIFETIME_DEFAULT, // Default: 20 years (1-30 range)

  // Fields for Financial API (/arv endpoint)
  renovatedLast5Years: true, // Default: true (API spec default)
};

const initialRenovation: RenovationSelections = {
  selectedMeasures: [],
  estimatedCapex: null,
  estimatedMaintenanceCost: null,
};

const initialFunding: FundingOptions = {
  financingType: "self-funded", // Default: homeowner pays upfront
  loan: {
    percentage: 80, // 80% of renovation cost
    duration: 10, // 10 years
    interestRate: 0.05, // 5% annual rate
  },
};

export const initialState: HomeAssistantState = {
  currentStep: 0,
  building: initialBuilding,
  estimation: null,
  renovation: initialRenovation,
  funding: initialFunding,
  scenarios: [],
  financialResults: {} as Record<string, never>,
  selectedFundingOption: "none",
  selectedFinancialScenario: "baseline",
  selectedPersona: "cost-optimization",
  mcdaRanking: null,
  isEstimating: false,
  isEvaluating: false,
  isRanking: false,
  error: null,
};

/**
 * Helper to clear all evaluation results when renovation inputs change.
 * Ensures cache coherency by invalidating dependent data.
 */
const clearedEvaluationResults = {
  scenarios: [] as HomeAssistantState["scenarios"],
  financialResults: {} as Record<string, never>,
  mcdaRanking: null,
} as const;

/**
 * Helper to clear financial results when funding options change.
 * Scenarios remain valid since building/renovation inputs haven't changed.
 */
const clearedFinancialResults = {
  financialResults: {} as Record<string, never>,
  mcdaRanking: null,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

export function homeAssistantReducer(
  state: HomeAssistantState,
  action: HomeAssistantAction,
): HomeAssistantState {
  switch (action.type) {
    // ─────────────────────────────────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };

    case "NEXT_STEP":
      if (state.currentStep < 2) {
        return {
          ...state,
          currentStep: (state.currentStep + 1) as 0 | 1 | 2,
          error: null,
        };
      }
      return state;

    case "PREV_STEP":
      if (state.currentStep > 0) {
        return {
          ...state,
          currentStep: (state.currentStep - 1) as 0 | 1 | 2,
          error: null,
        };
      }
      return state;

    // ─────────────────────────────────────────────────────────────────────────
    // Building Info Updates
    // ─────────────────────────────────────────────────────────────────────────
    case "UPDATE_BUILDING":
      return {
        ...state,
        building: {
          ...state.building,
          [action.field]: action.value,
        },
        // Clear estimation when building info changes
        estimation: null,
      };

    case "SET_BUILDING":
      return {
        ...state,
        building: {
          ...state.building,
          ...action.building,
        },
        estimation: null,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Estimation
    // ─────────────────────────────────────────────────────────────────────────
    case "START_ESTIMATION":
      return {
        ...state,
        isEstimating: true,
        error: null,
      };

    case "SET_ESTIMATION":
      return {
        ...state,
        estimation: action.result,
        isEstimating: false,
        error: null,
      };

    case "ESTIMATION_ERROR":
      return {
        ...state,
        isEstimating: false,
        error: action.error,
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
        // Clear evaluation results when selections change
        ...clearedEvaluationResults,
      };
    }

    case "SET_MEASURES": {
      return {
        ...state,
        renovation: {
          ...state.renovation,
          selectedMeasures: action.measures,
        },
        ...clearedEvaluationResults,
      };
    }

    case "SET_ESTIMATED_CAPEX": {
      return {
        ...state,
        renovation: {
          ...state.renovation,
          estimatedCapex: action.capex,
        },
        ...clearedEvaluationResults,
      };
    }

    case "SET_ESTIMATED_MAINTENANCE_COST": {
      return {
        ...state,
        renovation: {
          ...state.renovation,
          estimatedMaintenanceCost: action.cost,
        },
        ...clearedEvaluationResults,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Funding Options
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_FINANCING_TYPE": {
      return {
        ...state,
        funding: {
          ...state.funding,
          financingType: action.financingType,
        },
        ...clearedFinancialResults,
      };
    }

    case "UPDATE_LOAN": {
      return {
        ...state,
        funding: {
          ...state.funding,
          loan: {
            ...state.funding.loan,
            [action.field]: action.value,
          },
        },
        ...clearedFinancialResults,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    case "START_EVALUATION":
      return {
        ...state,
        isEvaluating: true,
        error: null,
      };

    case "SET_EVALUATION_RESULTS":
      return {
        ...state,
        scenarios: action.scenarios,
        financialResults: action.financial,
        isEvaluating: false,
        error: null,
      };

    case "EVALUATION_ERROR":
      return {
        ...state,
        isEvaluating: false,
        error: action.error,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Results Interaction
    // ─────────────────────────────────────────────────────────────────────────
    case "SELECT_FUNDING_OPTION":
      return {
        ...state,
        selectedFundingOption: action.option,
      };

    case "SELECT_FINANCIAL_SCENARIO":
      return {
        ...state,
        selectedFinancialScenario: action.scenario,
      };

    case "SELECT_PERSONA":
      return {
        ...state,
        selectedPersona: action.persona,
        mcdaRanking: null, // Clear ranking when persona changes
      };

    // ─────────────────────────────────────────────────────────────────────────
    // MCDA Ranking
    // ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper to get initial interventions for a package (used when selecting)
// ─────────────────────────────────────────────────────────────────────────────

// Function removed as it was unused and caused lint errors
