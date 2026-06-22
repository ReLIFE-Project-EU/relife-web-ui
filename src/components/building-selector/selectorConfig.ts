import {
  IconBuilding,
  IconBuildingCommunity,
  IconHome,
} from "@tabler/icons-react";
import type { BuildingSelectorDraft, BuildingSelectorHost } from "./types";
import { isApartmentLikeCategory } from "../../constants/buildingFormOptions";

type NumericDraftField = Exclude<
  keyof BuildingSelectorDraft,
  "apartmentLocation"
>;

export interface AdjustmentField {
  key: NumericDraftField;
  label: string;
  min: number;
  max: number;
  step?: number;
  decimalScale?: number;
}

export interface SelectorCopy {
  title: string;
  description: string;
  browseLabel: string;
  mapLabel: string;
  searchPlaceholder: string;
  accentColor: string;
  selectedLabel: string;
  chooseLabel: string;
  selectedReferenceLabel: string;
  selectionEmptyLabel: string;
  selectionEmptyHint: string;
  clearSelectionLabel: string;
  adjustmentTitle: string;
}

export const LIMITED_FIELDS: AdjustmentField[] = [
  { key: "floorArea", label: "Floor area (m2)", min: 10, max: 1000 },
  { key: "numberOfFloors", label: "Number of floors", min: 1, max: 20 },
  {
    key: "floorHeight",
    label: "Floor height (m)",
    min: 2,
    max: 6,
    step: 0.1,
    decimalScale: 1,
  },
];

export const FULL_FIELD_GROUPS: {
  title: string;
  fields: AdjustmentField[];
}[] = [
  { title: "Geometry", fields: LIMITED_FIELDS },
  {
    title: "Thermal envelope",
    fields: [
      {
        key: "wallUValue",
        label: "Wall U-value (W/m2K)",
        min: 0.1,
        max: 5,
        step: 0.1,
        decimalScale: 2,
      },
      {
        key: "roofUValue",
        label: "Roof U-value (W/m2K)",
        min: 0.1,
        max: 5,
        step: 0.1,
        decimalScale: 2,
      },
      {
        key: "windowUValue",
        label: "Window U-value (W/m2K)",
        min: 0.1,
        max: 5,
        step: 0.1,
        decimalScale: 2,
      },
    ],
  },
  {
    title: "Setpoints and occupancy",
    fields: [
      {
        key: "heatingSetpoint",
        label: "Heating setpoint (deg C)",
        min: 15,
        max: 22,
      },
      {
        key: "coolingSetpoint",
        label: "Cooling setpoint (deg C)",
        min: 24,
        max: 30,
      },
      {
        key: "numberOfOccupants",
        label: "Number of occupants",
        min: 1,
        max: 50,
      },
    ],
  },
];

export const SELECTOR_COPY: Record<BuildingSelectorHost, SelectorCopy> = {
  hra: {
    title: "Find the home most like yours",
    description:
      "Browse typical homes, or place your home on the map and let us match one.",
    browseLabel: "From catalog",
    mapLabel: "From map",
    searchPlaceholder: "Search typical homes...",
    accentColor: "orange",
    selectedLabel: "Selected",
    chooseLabel: "Choose this",
    selectedReferenceLabel: "Selected reference",
    selectionEmptyLabel: "No reference home selected yet",
    selectionEmptyHint: "Pick a typical home from the list below to continue.",
    clearSelectionLabel: "Clear",
    adjustmentTitle: "Adjust to my home",
  },
  pra: {
    title: "Find or place a building",
    description:
      "Select a reference building from the catalog or use the map to match a portfolio building.",
    browseLabel: "From catalog",
    mapLabel: "From map",
    searchPlaceholder: "Search reference buildings...",
    accentColor: "teal",
    selectedLabel: "Selected",
    chooseLabel: "Select",
    selectedReferenceLabel: "Selected reference",
    selectionEmptyLabel: "No reference building selected yet",
    selectionEmptyHint:
      "Pick a reference building from the list below to continue.",
    clearSelectionLabel: "Clear",
    adjustmentTitle: "Customize simulation parameters",
  },
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function getBuildingIcon(category: string) {
  if (isApartmentLikeCategory(category)) return IconBuildingCommunity;
  if (category.toLowerCase().includes("family")) return IconHome;
  return IconBuilding;
}
