/**
 * Reducer for the Home Renovation Assistant wizard state.
 */

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
  country: "AT", // Austria as default (matches mock-up)
  climateZone: "D",
  buildingType: "apartment",
  floorArea: null,
  constructionPeriod: "1991-2000",
  currentEPC: null,
  heatingTechnology: "biomass-central",
  coolingTechnology: "natural-airflow",
  hotWaterTechnology: "electric-boiler",
  numberOfOpenings: null,
  glazingTechnology: "double-aluminium",
};

const initialRenovation: RenovationSelections = {
  selectedPackages: [],
  interventions: {
    soft: [],
    regular: [],
    deep: [],
  },
  costs: {
    soft: 180,
    regular: 320,
    deep: 700,
  },
};

const initialFunding: FundingOptions = {
  returnsOnBills: {
    enabled: false,
    percentOfSavedEnergy: 50,
  },
  loan: {
    enabled: false,
    amountLimit: 50000,
    duration: 10,
    rateType: "floating",
  },
  subsidy: {
    enabled: false,
    percentOfTotal: 30,
    amountLimit: 20000,
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
    // Renovation Selections
    // ─────────────────────────────────────────────────────────────────────────
    case "TOGGLE_PACKAGE": {
      const { packageId } = action;
      const isSelected = state.renovation.selectedPackages.includes(packageId);
      const newSelectedPackages = isSelected
        ? state.renovation.selectedPackages.filter((id) => id !== packageId)
        : [...state.renovation.selectedPackages, packageId];

      return {
        ...state,
        renovation: {
          ...state.renovation,
          selectedPackages: newSelectedPackages,
          // Clear interventions if package is deselected
          interventions: isSelected
            ? {
                ...state.renovation.interventions,
                [packageId]: [],
              }
            : state.renovation.interventions,
        },
        // Clear evaluation results when selections change
        ...clearedEvaluationResults,
      };
    }

    case "TOGGLE_INTERVENTION": {
      const { packageId, interventionId } = action;
      const currentInterventions = state.renovation.interventions[packageId];
      const isSelected = currentInterventions.includes(interventionId);
      const newInterventions = isSelected
        ? currentInterventions.filter((id) => id !== interventionId)
        : [...currentInterventions, interventionId];

      return {
        ...state,
        renovation: {
          ...state.renovation,
          interventions: {
            ...state.renovation.interventions,
            [packageId]: newInterventions,
          },
        },
        ...clearedEvaluationResults,
      };
    }

    case "SET_PACKAGE_INTERVENTIONS": {
      const { packageId, interventions } = action;
      return {
        ...state,
        renovation: {
          ...state.renovation,
          interventions: {
            ...state.renovation.interventions,
            [packageId]: interventions,
          },
        },
        ...clearedEvaluationResults,
      };
    }

    case "UPDATE_PACKAGE_COST": {
      const { packageId, cost } = action;
      return {
        ...state,
        renovation: {
          ...state.renovation,
          costs: {
            ...state.renovation.costs,
            [packageId]: cost,
          },
        },
        ...clearedEvaluationResults,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Funding Options
    // ─────────────────────────────────────────────────────────────────────────
    case "TOGGLE_FUNDING": {
      const { fundingType } = action;
      return {
        ...state,
        funding: {
          ...state.funding,
          [fundingType]: {
            ...state.funding[fundingType],
            enabled: !state.funding[fundingType].enabled,
          },
        },
        ...clearedFinancialResults,
      };
    }

    case "UPDATE_FUNDING": {
      const { fundingType, field, value } = action;
      return {
        ...state,
        funding: {
          ...state.funding,
          [fundingType]: {
            ...state.funding[fundingType],
            [field]: value,
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
