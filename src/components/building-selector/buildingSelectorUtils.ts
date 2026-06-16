import type {
  ArchetypeDetails,
  BuildingModifications,
} from "../../types/archetype";
import type { ArchetypeInfo } from "../../types/forecasting";
import type { ArchetypeMatchResult } from "../../services/types";
import { isApartmentLikeCategory } from "../../constants/buildingFormOptions";
import { extractConstructionPeriod } from "../../utils/archetypeModifier";
import {
  getCountryDisplayName,
  normalizeCountryName,
} from "../../utils/countries";
import type {
  ApartmentLocation,
  BuildingSelectorDraft,
  BuildingSelectorMatchStatus,
  BuildingSelectorMode,
  BuildingSelectorSelection,
} from "./types";

export function getArchetypeKey(archetype: {
  country: string;
  category: string;
  name: string;
}): string {
  return `${archetype.country}::${archetype.category}::${archetype.name}`;
}

export function getArchetypePeriod(archetype: Pick<ArchetypeInfo, "name">) {
  return extractConstructionPeriod(archetype.name) ?? "";
}

export function getDisplayCountry(country: string | null | undefined): string {
  if (!country) return "";
  return (
    normalizeCountryName(country) ?? getCountryDisplayName(country) ?? country
  );
}

export function getMatchStatus(
  matchResult: ArchetypeMatchResult,
): BuildingSelectorMatchStatus {
  return matchResult.matchQuality === "excellent" && !matchResult.periodRelaxed
    ? "exact"
    : "fallback";
}

export function mapApartmentLocationToFloorNumber(
  location: ApartmentLocation,
  floors: number,
): number {
  if (location === "bottom") return 0;
  if (location === "middle") return Math.max(0, Math.floor(floors / 2));
  return Math.max(0, floors - 1);
}

export function buildDraftFromDetails(
  details: ArchetypeDetails,
  modifications?: BuildingModifications,
  apartmentLocation?: ApartmentLocation,
): BuildingSelectorDraft {
  return {
    floorArea: modifications?.floorArea ?? details.floorArea,
    numberOfFloors: modifications?.numberOfFloors ?? details.numberOfFloors,
    floorHeight: modifications?.floorHeight ?? details.floorHeight,
    apartmentLocation: apartmentLocation ?? null,
    wallUValue:
      modifications?.wallUValue ?? details.thermalProperties.wallUValue,
    roofUValue:
      modifications?.roofUValue ?? details.thermalProperties.roofUValue,
    windowUValue:
      modifications?.windowUValue ?? details.thermalProperties.windowUValue,
    heatingSetpoint:
      modifications?.heatingSetpoint ?? details.setpoints.heatingSetpoint,
    coolingSetpoint:
      modifications?.coolingSetpoint ?? details.setpoints.coolingSetpoint,
    numberOfOccupants: modifications?.numberOfOccupants ?? "",
  };
}

function changedNumber(
  value: number | string,
  reference: number,
): number | null {
  if (typeof value !== "number") return null;
  return Math.abs(value - reference) >= 0.05 ? value : null;
}

export function buildModifications(
  details: ArchetypeDetails,
  draft: BuildingSelectorDraft,
  scope: "limited" | "full",
): BuildingModifications | undefined {
  const modifications: BuildingModifications = {};

  const floorArea = changedNumber(draft.floorArea, details.floorArea);
  const numberOfFloors =
    typeof draft.numberOfFloors === "number" &&
    draft.numberOfFloors !== details.numberOfFloors
      ? draft.numberOfFloors
      : null;
  const floorHeight = changedNumber(draft.floorHeight, details.floorHeight);

  if (floorArea !== null) modifications.floorArea = floorArea;
  if (numberOfFloors !== null) modifications.numberOfFloors = numberOfFloors;
  if (floorHeight !== null) modifications.floorHeight = floorHeight;

  if (scope === "full") {
    const wallUValue = changedNumber(
      draft.wallUValue,
      details.thermalProperties.wallUValue,
    );
    const roofUValue = changedNumber(
      draft.roofUValue,
      details.thermalProperties.roofUValue,
    );
    const windowUValue = changedNumber(
      draft.windowUValue,
      details.thermalProperties.windowUValue,
    );
    const heatingSetpoint = changedNumber(
      draft.heatingSetpoint,
      details.setpoints.heatingSetpoint,
    );
    const coolingSetpoint = changedNumber(
      draft.coolingSetpoint,
      details.setpoints.coolingSetpoint,
    );

    if (wallUValue !== null) modifications.wallUValue = wallUValue;
    if (roofUValue !== null) modifications.roofUValue = roofUValue;
    if (windowUValue !== null) modifications.windowUValue = windowUValue;
    if (heatingSetpoint !== null) {
      modifications.heatingSetpoint = heatingSetpoint;
    }
    if (coolingSetpoint !== null) {
      modifications.coolingSetpoint = coolingSetpoint;
    }
    if (typeof draft.numberOfOccupants === "number") {
      modifications.numberOfOccupants = draft.numberOfOccupants;
    }
  }

  return Object.keys(modifications).length > 0 ? modifications : undefined;
}

export function buildSelection(params: {
  mode: BuildingSelectorMode;
  details: ArchetypeDetails;
  draft: BuildingSelectorDraft;
  scope: "limited" | "full";
  country: string;
  constructionPeriod: string;
  coords: { lat: number; lng: number };
  matchResult?: ArchetypeMatchResult;
}): BuildingSelectorSelection {
  const modifications = buildModifications(
    params.details,
    params.draft,
    params.scope,
  );
  const floorArea =
    typeof params.draft.floorArea === "number"
      ? params.draft.floorArea
      : params.details.floorArea;
  const numberOfFloors =
    typeof params.draft.numberOfFloors === "number"
      ? params.draft.numberOfFloors
      : params.details.numberOfFloors;
  const floorHeight =
    typeof params.draft.floorHeight === "number"
      ? params.draft.floorHeight
      : params.details.floorHeight;
  const apartmentLocation =
    isApartmentLikeCategory(params.details.category) &&
    params.draft.apartmentLocation
      ? params.draft.apartmentLocation
      : undefined;
  const floorNumber = apartmentLocation
    ? mapApartmentLocationToFloorNumber(apartmentLocation, numberOfFloors)
    : undefined;

  return {
    mode: params.mode,
    coords: params.coords,
    country: getDisplayCountry(params.country),
    category: params.details.category,
    constructionPeriod: params.constructionPeriod,
    archetype: {
      category: params.details.category,
      country: params.details.country,
      name: params.details.name,
    },
    details: params.details,
    floorArea,
    numberOfFloors,
    floorHeight,
    apartmentLocation,
    floorNumber,
    modifications,
    matchMeta: params.matchResult
      ? {
          status: getMatchStatus(params.matchResult),
          detectedCountry: params.matchResult.detectedCountry,
          matchResult: params.matchResult,
        }
      : undefined,
  };
}

export function buildGeneratedBuildingName(
  selection: BuildingSelectorSelection,
): string {
  const period =
    selection.constructionPeriod || getArchetypePeriod(selection.archetype);
  return ["Reference building", selection.country, selection.category, period]
    .filter(Boolean)
    .join(" - ");
}

export function isApartmentSelection(details: ArchetypeDetails): boolean {
  return isApartmentLikeCategory(details.category);
}
