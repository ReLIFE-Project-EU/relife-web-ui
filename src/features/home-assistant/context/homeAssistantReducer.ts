/**
 * Reducer for the Home Renovation Assistant wizard state.
 */

import {
  PACKAGE_ANNUAL_MAINTENANCE_DEFAULT,
  PACKAGE_CAPEX_DEFAULT,
  PACKAGE_SELECTION_MAX,
  PROJECT_LIFETIME_DEFAULT,
} from "../constants";
import type {
  BuildingInfo,
  FundingOptions,
  HomeAssistantAction,
  HomeAssistantState,
  PackageFinancialInputsById,
  RenovationSelections,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Temporary defaults — pre-fill cost fields while the Financial API requires
// non-null values. These will be removed once the backend accepts null.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialBuilding: BuildingInfo = {
  // Location and basic identification
  country: "", // Will be populated from available archetypes
  lat: null,
  lng: null,

  // Building category (from archetype)
  buildingType: "", // Will be populated from archetype category

  // Construction period (from archetype)
  constructionPeriod: "", // Will be populated from archetype name

  // Archetype selection
  selectedArchetype: undefined,
  tentativeArchetype: undefined,
  isModified: false,

  // User-modifiable fields
  floorArea: null,
  numberOfFloors: null,
  apartmentLocation: undefined,

  // Deprecated fields (kept for compatibility)
  climateZone: "",
  heatingTechnology: "",
  coolingTechnology: "",
  hotWaterTechnology: "",
  numberOfOpenings: null,
  glazingTechnology: "",

  // Financial API fields
  constructionYear: null,
  floorNumber: null,
  projectLifetime: PROJECT_LIFETIME_DEFAULT,
  renovatedLast5Years: true,
};

const initialRenovation: RenovationSelections = {
  selectedMeasures: [],
  estimatedCapex: PACKAGE_CAPEX_DEFAULT,
  estimatedMaintenanceCost: PACKAGE_ANNUAL_MAINTENANCE_DEFAULT,
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
  suggestedPackages: [],
  selectedPackageIds: [],
  packageFinancialInputs: {},
  scenarios: [],
  financialResults: {} as Record<string, never>,
  selectedFundingOption: "none",
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

function createDefaultPackageFinancialInput() {
  return {
    capex: PACKAGE_CAPEX_DEFAULT,
    annualMaintenanceCost: PACKAGE_ANNUAL_MAINTENANCE_DEFAULT,
  };
}

function syncPackageFinancialInputs(
  packageIds: string[],
  currentInputs: PackageFinancialInputsById,
): PackageFinancialInputsById {
  return packageIds.reduce<PackageFinancialInputsById>((acc, packageId) => {
    acc[packageId] =
      currentInputs[packageId] ?? createDefaultPackageFinancialInput();
    return acc;
  }, {});
}

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
        suggestedPackages: [],
        selectedPackageIds: [],
        packageFinancialInputs: {},
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
        suggestedPackages: [],
        selectedPackageIds: [],
        packageFinancialInputs: {},
        ...clearedEvaluationResults,
      };
    }

    case "SET_SUGGESTED_PACKAGES": {
      const packageIds = action.packages.map((pkg) => pkg.id);

      return {
        ...state,
        suggestedPackages: action.packages,
        selectedPackageIds: [],
        packageFinancialInputs: syncPackageFinancialInputs(
          packageIds,
          state.packageFinancialInputs,
        ),
        ...clearedEvaluationResults,
      };
    }

    case "TOGGLE_PACKAGE": {
      const isSelected = state.selectedPackageIds.includes(action.packageId);
      if (
        !isSelected &&
        state.selectedPackageIds.length >= PACKAGE_SELECTION_MAX
      ) {
        return state;
      }

      return {
        ...state,
        selectedPackageIds: isSelected
          ? state.selectedPackageIds.filter((id) => id !== action.packageId)
          : [...state.selectedPackageIds, action.packageId],
        ...clearedEvaluationResults,
      };
    }

    case "SET_PACKAGE_FINANCIAL_INPUT": {
      return {
        ...state,
        packageFinancialInputs: {
          ...state.packageFinancialInputs,
          [action.packageId]: {
            ...(state.packageFinancialInputs[action.packageId] ??
              createDefaultPackageFinancialInput()),
            [action.field]: action.value,
          },
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
