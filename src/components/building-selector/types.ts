import type {
  ArchetypeDetails,
  BuildingModifications,
} from "../../types/archetype";
import type { ArchetypeInfo } from "../../types/forecasting";
import type {
  ArchetypeMatchResult,
  IBuildingService,
} from "../../services/types";

export type BuildingSelectorMode = "browse" | "map";
export type BuildingSelectorHost = "hra" | "pra";
export type BuildingSelectorAdjustmentScope = "limited" | "full";
export type BuildingSelectorMatchStatus = "exact" | "fallback";
export type ApartmentLocation = "bottom" | "middle" | "top";

export type BuildingSelectorService = Pick<
  IBuildingService,
  | "detectCountryFromCoords"
  | "findMatchingArchetype"
  | "getArchetypeDetails"
  | "getArchetypes"
  | "getAvailableCategories"
  | "getAvailablePeriods"
>;

export interface BuildingSelectorCoordinates {
  lat: number;
  lng: number;
}

export interface BuildingSelectorMatchMeta {
  status: BuildingSelectorMatchStatus;
  detectedCountry: string | null;
  matchResult: ArchetypeMatchResult;
}

export interface BuildingSelectorSelection {
  mode: BuildingSelectorMode;
  coords: BuildingSelectorCoordinates;
  country: string;
  category: string;
  constructionPeriod: string;
  archetype: ArchetypeInfo;
  details: ArchetypeDetails;
  floorArea: number;
  numberOfFloors: number;
  floorHeight: number;
  apartmentLocation?: ApartmentLocation;
  floorNumber?: number;
  modifications?: BuildingModifications;
  matchMeta?: BuildingSelectorMatchMeta;
}

export interface BuildingSelectorInitialValue {
  mode?: BuildingSelectorMode;
  coords?: Partial<BuildingSelectorCoordinates> | null;
  country?: string | null;
  category?: string | null;
  constructionPeriod?: string | null;
  archetype?: ArchetypeInfo | null;
  floorArea?: number | null;
  numberOfFloors?: number | null;
  apartmentLocation?: ApartmentLocation;
  modifications?: BuildingModifications;
}

export interface BuildingSelectorDraft {
  floorArea: number | string;
  numberOfFloors: number | string;
  floorHeight: number | string;
  apartmentLocation: ApartmentLocation | null;
  wallUValue: number | string;
  roofUValue: number | string;
  windowUValue: number | string;
  heatingSetpoint: number | string;
  coolingSetpoint: number | string;
  numberOfOccupants: number | string;
}

export interface BuildingSelectorHandle {
  /** Reset the selector to its empty initial state. */
  reset(): void;
}
