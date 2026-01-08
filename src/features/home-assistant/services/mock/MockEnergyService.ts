/**
 * Mock Energy Service
 * Provides EPC estimation and energy consumption calculations.
 *
 * NOTE: This is a simplified mock implementation. In production, this would
 * integrate with the forecasting service API:
 * - forecasting.createProject()
 * - forecasting.uploadBuilding()
 * - forecasting.getEPC()
 */

import type {
  BuildingInfo,
  EstimationResult,
  EnergyMix,
} from "../../context/types";
import type { IEnergyService } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// EPC Estimation Factors
// ─────────────────────────────────────────────────────────────────────────────

// Construction period impact on energy efficiency (lower = better)
const PERIOD_FACTOR: Record<string, number> = {
  "pre-1945": 1.8,
  "1945-1970": 1.5,
  "1971-1990": 1.3,
  "1991-2000": 1.1,
  "2001-2010": 0.9,
  "post-2010": 0.7,
};

// Building type impact (apartments generally more efficient due to shared walls)
const BUILDING_TYPE_FACTOR: Record<string, number> = {
  apartment: 0.85,
  terraced: 0.95,
  "semi-detached": 1.0,
  detached: 1.15,
};

// Heating technology efficiency (lower = better)
const HEATING_EFFICIENCY: Record<string, number> = {
  "heat-pump-ground": 0.5,
  "heat-pump-air": 0.6,
  "district-heating": 0.75,
  "biomass-central": 0.85,
  "gas-boiler": 1.0,
  "oil-boiler": 1.2,
  "electric-resistance": 1.4,
};

// Glazing technology efficiency (lower = better)
const GLAZING_EFFICIENCY: Record<string, number> = {
  "triple-pvc": 0.6,
  "triple-wood": 0.65,
  "double-pvc": 0.8,
  "double-wood": 0.85,
  "double-aluminium": 0.95,
  "single-wood": 1.4,
};

// Climate zone impact on energy needs
const CLIMATE_FACTOR: Record<string, { heating: number; cooling: number }> = {
  A: { heating: 0.5, cooling: 1.5 }, // Mediterranean
  B: { heating: 0.7, cooling: 1.2 }, // Warm temperate
  C: { heating: 1.0, cooling: 0.8 }, // Temperate
  D: { heating: 1.3, cooling: 0.4 }, // Cold
  E: { heating: 1.6, cooling: 0.2 }, // Very cold
};

// EPC class thresholds (kWh/m²/year)
const EPC_THRESHOLDS: { class: string; maxValue: number }[] = [
  { class: "A+", maxValue: 30 },
  { class: "A", maxValue: 50 },
  { class: "B", maxValue: 90 },
  { class: "C", maxValue: 150 },
  { class: "D", maxValue: 230 },
  { class: "E", maxValue: 330 },
  { class: "F", maxValue: 450 },
  { class: "G", maxValue: Infinity },
];

// Average energy price (EUR/kWh) - simplified
const ENERGY_PRICE = 0.25;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getEPCClass(energyIntensity: number): string {
  for (const threshold of EPC_THRESHOLDS) {
    if (energyIntensity <= threshold.maxValue) {
      return threshold.class;
    }
  }
  return "G";
}

function calculateBaseEnergyIntensity(building: BuildingInfo): number {
  // Base energy intensity (kWh/m²/year) for a "reference" building
  const BASE_INTENSITY = 150;

  // Apply factors
  const periodFactor = PERIOD_FACTOR[building.constructionPeriod] || 1.0;
  const buildingFactor = BUILDING_TYPE_FACTOR[building.buildingType] || 1.0;
  const heatingFactor = HEATING_EFFICIENCY[building.heatingTechnology] || 1.0;
  const glazingFactor = GLAZING_EFFICIENCY[building.glazingTechnology] || 1.0;

  // Opening density impact (more windows = worse efficiency if poor glazing)
  const floorArea = building.floorArea || 100;
  const openings = building.numberOfOpenings || 10;
  const openingDensity = openings / (floorArea / 10); // openings per 10m²
  const openingFactor = 0.8 + openingDensity * 0.1 * glazingFactor;

  return (
    BASE_INTENSITY *
    periodFactor *
    buildingFactor *
    heatingFactor *
    Math.min(openingFactor, 1.5)
  );
}

function calculateEnergyMix(
  heatingNeeds: number,
  coolingNeeds: number,
  heatingTech: string,
): { cooling: EnergyMix; heating: EnergyMix; overall: EnergyMix } {
  // Simplified energy mix based on heating technology
  const isElectric = [
    "heat-pump-air",
    "heat-pump-ground",
    "electric-resistance",
  ].includes(heatingTech);
  const isOil = heatingTech === "oil-boiler";

  // Cooling is typically electric
  const coolingMix: EnergyMix = {
    electricity: coolingNeeds,
    heatingOil: 0,
  };

  // Heating depends on technology
  const heatingMix: EnergyMix = isElectric
    ? { electricity: heatingNeeds, heatingOil: 0 }
    : isOil
      ? { electricity: heatingNeeds * 0.1, heatingOil: heatingNeeds * 0.9 }
      : { electricity: heatingNeeds * 0.3, heatingOil: heatingNeeds * 0.7 };

  const overallMix: EnergyMix = {
    electricity: coolingMix.electricity + heatingMix.electricity,
    heatingOil: coolingMix.heatingOil + heatingMix.heatingOil,
  };

  return {
    cooling: coolingMix,
    heating: heatingMix,
    overall: overallMix,
  };
}

function calculateComfortIndex(building: BuildingInfo): number {
  // Simplified comfort index based on building characteristics
  let comfort = 70; // Base comfort

  // Better glazing = better comfort
  const glazingBonus: Record<string, number> = {
    "triple-pvc": 15,
    "triple-wood": 12,
    "double-pvc": 8,
    "double-wood": 5,
    "double-aluminium": 3,
    "single-wood": -10,
  };
  comfort += glazingBonus[building.glazingTechnology] || 0;

  // Newer buildings = better comfort
  const periodBonus: Record<string, number> = {
    "post-2010": 10,
    "2001-2010": 5,
    "1991-2000": 0,
    "1971-1990": -5,
    "1945-1970": -10,
    "pre-1945": -15,
  };
  comfort += periodBonus[building.constructionPeriod] || 0;

  // Heat pumps provide better temperature control
  if (building.heatingTechnology.includes("heat-pump")) {
    comfort += 5;
  }

  return Math.max(0, Math.min(100, comfort));
}

function calculateFlexibilityIndex(building: BuildingInfo): number {
  // Flexibility index represents energy flexibility potential
  let flexibility = 50; // Base flexibility

  // Electric systems offer more flexibility for demand response
  if (
    ["heat-pump-air", "heat-pump-ground", "electric-resistance"].includes(
      building.heatingTechnology,
    )
  ) {
    flexibility += 20;
  }

  // Solar thermal provides some flexibility
  if (building.hotWaterTechnology === "solar-thermal") {
    flexibility += 10;
  }

  // Newer buildings tend to have better energy management potential
  const periodBonus: Record<string, number> = {
    "post-2010": 15,
    "2001-2010": 10,
    "1991-2000": 5,
    "1971-1990": 0,
    "1945-1970": -5,
    "pre-1945": -10,
  };
  flexibility += periodBonus[building.constructionPeriod] || 0;

  return Math.max(0, Math.min(100, flexibility));
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class MockEnergyService implements IEnergyService {
  async estimateEPC(building: BuildingInfo): Promise<EstimationResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const floorArea = building.floorArea || 100;
    const climateFactor = CLIMATE_FACTOR[building.climateZone] || {
      heating: 1.0,
      cooling: 0.8,
    };

    // Calculate base energy intensity
    const baseIntensity = calculateBaseEnergyIntensity(building);

    // Split into heating and cooling
    const heatingIntensity = baseIntensity * 0.7 * climateFactor.heating;
    const coolingIntensity = baseIntensity * 0.3 * climateFactor.cooling;
    const totalIntensity = heatingIntensity + coolingIntensity;

    // Convert to absolute values
    const heatingCoolingNeeds = totalIntensity * floorArea;
    const annualEnergyNeeds = heatingCoolingNeeds * 1.2; // Add hot water, lighting, etc.
    const annualEnergyCost = annualEnergyNeeds * ENERGY_PRICE;

    // Determine EPC class
    const estimatedEPC = getEPCClass(totalIntensity);

    // Calculate energy mix
    const energyMix = calculateEnergyMix(
      heatingIntensity * floorArea,
      coolingIntensity * floorArea,
      building.heatingTechnology,
    );

    // Calculate indices
    const comfortIndex = calculateComfortIndex(building);
    const flexibilityIndex = calculateFlexibilityIndex(building);

    return {
      estimatedEPC,
      annualEnergyNeeds: Math.round(annualEnergyNeeds),
      annualEnergyCost: Math.round(annualEnergyCost),
      heatingCoolingNeeds: Math.round(heatingCoolingNeeds),
      energyMix: {
        cooling: {
          electricity: Math.round(energyMix.cooling.electricity),
          heatingOil: Math.round(energyMix.cooling.heatingOil),
        },
        heating: {
          electricity: Math.round(energyMix.heating.electricity),
          heatingOil: Math.round(energyMix.heating.heatingOil),
        },
        overall: {
          electricity: Math.round(energyMix.overall.electricity),
          heatingOil: Math.round(energyMix.overall.heatingOil),
        },
      },
      flexibilityIndex: Math.round(flexibilityIndex),
      comfortIndex: Math.round(comfortIndex),
    };
  }
}

// Export singleton instance
export const mockEnergyService: IEnergyService = new MockEnergyService();
