import type { ManualAddFormState } from "./manualAddFormReducer";
import type { ArchetypeDetails } from "../../../../types/archetype";

export interface ModificationFieldConfig {
  field: keyof ManualAddFormState;
  label: string;
  getPlaceholder: (archetype: ArchetypeDetails) => string;
  min: number;
  max: number;
  step?: number;
  decimalScale?: number;
  group: "geometry" | "thermal" | "setpoints" | "occupancy";
}

export const MODIFICATION_FIELDS: ModificationFieldConfig[] = [
  {
    field: "modFloorArea",
    label: "Floor Area (m\u00B2)",
    getPlaceholder: (a) => `Default: ${a.floorArea}`,
    min: 10,
    max: 1000,
    group: "geometry",
  },
  {
    field: "modNumberOfFloors",
    label: "Number of Floors",
    getPlaceholder: (a) => `Default: ${a.numberOfFloors}`,
    min: 1,
    max: 20,
    group: "geometry",
  },
  {
    field: "modBuildingHeight",
    label: "Building Height (m)",
    getPlaceholder: (a) => `Default: ${a.buildingHeight}`,
    min: 2,
    max: 60,
    group: "geometry",
  },
  {
    field: "modWallUValue",
    label: "Wall U-value (W/m\u00B2K)",
    getPlaceholder: (a) =>
      `Default: ${a.thermalProperties.wallUValue.toFixed(2)}`,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    decimalScale: 2,
    group: "thermal",
  },
  {
    field: "modRoofUValue",
    label: "Roof U-value (W/m\u00B2K)",
    getPlaceholder: (a) =>
      `Default: ${a.thermalProperties.roofUValue.toFixed(2)}`,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    decimalScale: 2,
    group: "thermal",
  },
  {
    field: "modWindowUValue",
    label: "Window U-value (W/m\u00B2K)",
    getPlaceholder: (a) =>
      `Default: ${a.thermalProperties.windowUValue.toFixed(2)}`,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    decimalScale: 2,
    group: "thermal",
  },
  {
    field: "modHeatingSetpoint",
    label: "Heating Setpoint (\u00B0C)",
    getPlaceholder: (a) => `Default: ${a.setpoints.heatingSetpoint}`,
    min: 15,
    max: 22,
    group: "setpoints",
  },
  {
    field: "modCoolingSetpoint",
    label: "Cooling Setpoint (\u00B0C)",
    getPlaceholder: (a) => `Default: ${a.setpoints.coolingSetpoint}`,
    min: 24,
    max: 30,
    group: "setpoints",
  },
  {
    field: "modOccupants",
    label: "Number of Occupants",
    getPlaceholder: () => "Default: archetype value",
    min: 1,
    max: 50,
    group: "occupancy",
  },
];
