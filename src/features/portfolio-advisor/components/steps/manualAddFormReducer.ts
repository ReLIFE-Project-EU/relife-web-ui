import type { ArchetypeDetails } from "../../../../types/archetype";

export interface ManualAddFormState {
  name: string;
  category: string | null;
  constructionYear: number | string;
  propertyType: string | null;
  lat: number | string;
  lng: number | string;
  matchedArchetype: ArchetypeDetails | null;
  loadingArchetype: boolean;
  availableArchetypes: ArchetypeDetails[];
  selectedArchetypeName: string | null;
  modFloorArea: number | string;
  modNumberOfFloors: number | string;
  modBuildingHeight: number | string;
  modWallUValue: number | string;
  modRoofUValue: number | string;
  modWindowUValue: number | string;
  modHeatingSetpoint: number | string;
  modCoolingSetpoint: number | string;
  modOccupants: number | string;
}

export const initialFormState: ManualAddFormState = {
  name: "",
  category: null,
  constructionYear: "",
  propertyType: null,
  lat: "",
  lng: "",
  matchedArchetype: null,
  loadingArchetype: false,
  availableArchetypes: [],
  selectedArchetypeName: null,
  modFloorArea: "",
  modNumberOfFloors: "",
  modBuildingHeight: "",
  modWallUValue: "",
  modRoofUValue: "",
  modWindowUValue: "",
  modHeatingSetpoint: "",
  modCoolingSetpoint: "",
  modOccupants: "",
};

export type ManualAddFormAction =
  | {
      type: "SET_FIELD";
      field: keyof ManualAddFormState;
      value: ManualAddFormState[keyof ManualAddFormState];
    }
  | {
      type: "SET_ARCHETYPE_RESULTS";
      matched: ArchetypeDetails;
      available: ArchetypeDetails[];
    }
  | { type: "CLEAR_ARCHETYPE" }
  | { type: "SET_LOADING_ARCHETYPE"; loading: boolean }
  | { type: "RESET_FORM" };

export function manualAddFormReducer(
  state: ManualAddFormState,
  action: ManualAddFormAction,
): ManualAddFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_ARCHETYPE_RESULTS":
      return {
        ...state,
        matchedArchetype: action.matched,
        selectedArchetypeName: action.matched.name,
        availableArchetypes: action.available,
        loadingArchetype: false,
      };
    case "CLEAR_ARCHETYPE":
      return {
        ...state,
        matchedArchetype: null,
        availableArchetypes: [],
        selectedArchetypeName: null,
      };
    case "SET_LOADING_ARCHETYPE":
      return { ...state, loadingArchetype: action.loading };
    case "RESET_FORM":
      return initialFormState;
    default:
      return state;
  }
}
