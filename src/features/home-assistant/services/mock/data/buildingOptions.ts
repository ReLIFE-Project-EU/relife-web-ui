import type { BuildingInfo } from "../../../context/types";
import type { SelectOption } from "../../types";

export const COUNTRIES: SelectOption[] = [
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "FR", label: "France" },
  { value: "GR", label: "Greece" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "PT", label: "Portugal" },
];

export const CLIMATE_ZONES: SelectOption[] = [
  { value: "A", label: "A - Mediterranean (hot summers, mild winters)" },
  { value: "B", label: "B - Warm temperate" },
  { value: "C", label: "C - Temperate" },
  { value: "D", label: "D - Cold" },
  { value: "E", label: "E - Very cold (alpine/nordic)" },
];

export const BUILDING_TYPES: SelectOption[] = [
  { value: "apartment", label: "Apartment" },
  { value: "detached", label: "Detached House" },
  { value: "semi-detached", label: "Semi-Detached House" },
  { value: "terraced", label: "Terraced House" },
];

export const CONSTRUCTION_PERIODS: SelectOption[] = [
  { value: "pre-1945", label: "Before 1945" },
  { value: "1945-1970", label: "1945-1970" },
  { value: "1971-1990", label: "1971-1990" },
  { value: "1991-2000", label: "1991-2000" },
  { value: "2001-2010", label: "2001-2010" },
  { value: "post-2010", label: "After 2010" },
];

// Note: EPC classes are NOT exposed as user input options.
// EPC is calculated by the Forecasting API based on building characteristics.
// This array is kept for internal reference (e.g., display, validation).
export const EPC_CLASSES_INTERNAL: string[] = [
  "A+",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
];

export const HEATING_TECHNOLOGIES: SelectOption[] = [
  { value: "gas-boiler", label: "Gas Boiler" },
  { value: "oil-boiler", label: "Oil Boiler" },
  { value: "biomass-central", label: "Biomass Central Heating" },
  { value: "heat-pump-air", label: "Air Source Heat Pump" },
  { value: "heat-pump-ground", label: "Ground Source Heat Pump" },
  { value: "electric-resistance", label: "Electric Resistance Heating" },
  { value: "district-heating", label: "District Heating" },
];

export const COOLING_TECHNOLOGIES: SelectOption[] = [
  { value: "natural-airflow", label: "Natural Airflow (no cooling)" },
  { value: "split-ac", label: "Split Air Conditioning" },
  { value: "central-ac", label: "Central Air Conditioning" },
  { value: "heat-pump-reversible", label: "Reversible Heat Pump" },
  { value: "evaporative", label: "Evaporative Cooling" },
];

export const HOT_WATER_TECHNOLOGIES: SelectOption[] = [
  { value: "electric-boiler", label: "Electric Boiler" },
  { value: "gas-water-heater", label: "Gas Water Heater" },
  { value: "heat-pump-water", label: "Heat Pump Water Heater" },
  { value: "solar-thermal", label: "Solar Thermal" },
  { value: "combi-boiler", label: "Combination Boiler (heating system)" },
];

export const GLAZING_TECHNOLOGIES: SelectOption[] = [
  { value: "single-wood", label: "Single glazed (wood frame)" },
  { value: "double-wood", label: "Double glazed (wood frame)" },
  { value: "double-aluminium", label: "Double glazed (aluminium frame)" },
  { value: "double-pvc", label: "Double glazed (PVC frame)" },
  { value: "triple-wood", label: "Triple glazed (wood frame)" },
  { value: "triple-pvc", label: "Triple glazed (PVC frame)" },
];

export const COUNTRY_DEFAULTS: Record<string, Partial<BuildingInfo>> = {
  AT: {
    climateZone: "D",
    heatingTechnology: "biomass-central",
    hotWaterTechnology: "combi-boiler",
  },
  GR: {
    climateZone: "A",
    heatingTechnology: "oil-boiler",
    coolingTechnology: "split-ac",
    hotWaterTechnology: "solar-thermal",
  },
  ES: {
    climateZone: "B",
    heatingTechnology: "gas-boiler",
    coolingTechnology: "split-ac",
    hotWaterTechnology: "gas-water-heater",
  },
  IT: {
    climateZone: "B",
    heatingTechnology: "gas-boiler",
    hotWaterTechnology: "gas-water-heater",
  },
  DE: {
    climateZone: "D",
    heatingTechnology: "gas-boiler",
    hotWaterTechnology: "combi-boiler",
  },
  FR: {
    climateZone: "C",
    heatingTechnology: "electric-resistance",
    hotWaterTechnology: "electric-boiler",
  },
  NL: {
    climateZone: "C",
    heatingTechnology: "gas-boiler",
    hotWaterTechnology: "combi-boiler",
  },
  BE: {
    climateZone: "C",
    heatingTechnology: "gas-boiler",
    hotWaterTechnology: "combi-boiler",
  },
  PT: {
    climateZone: "B",
    heatingTechnology: "gas-boiler",
    coolingTechnology: "split-ac",
    hotWaterTechnology: "gas-water-heater",
  },
};
