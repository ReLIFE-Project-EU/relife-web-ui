import type { BuildingInfo } from "../../../types/renovation";

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
