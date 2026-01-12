/**
 * Mock Energy Service
 * Provides EPC estimation and energy consumption calculations.
 *
 * TBD INTEGRATION NOTES
 * =====================
 * When integrating with the real Forecasting API:
 * - [ ] Implement project-based workflow:
 *       1. POST /project - Create project, get project_id
 *       2. PUT /project/{id}/building - Upload BuildingPayload
 *       3. PUT /project/{id}/plant - Upload PlantPayload
 *       4. POST /project/{id}/simulate - Run simulation (requires EPW weather file)
 *       5. GET /project/{id}/epc - Get EPC result
 * - [ ] Map BuildingInfo to BuildingPayload.data:
 *       - area_m2, volume_m3, U_envelope_W_m2K, infiltration_ach,
 *         internal_gains_W, thermal_capacity_kJ_K
 * - [ ] Map system technologies to PlantPayload.data:
 *       - heat_setpoint_C, cool_setpoint_C, heat_power_max_W,
 *         cool_power_max_W, heat_efficiency, cool_efficiency
 * - [ ] Handle EPW weather file (source TBD - user upload or API-provided based on location)
 * - [ ] Extract annual_energy_savings from simulation results
 *
 * Reference: api-specs/20260108-125427/forecasting.json
 */

import type {
  BuildingInfo,
  EnergyMix,
  EstimationResult,
} from "../../context/types";
import type { IEnergyService } from "../types";
import {
  MOCK_BASE_COMFORT_INDEX,
  MOCK_BASE_ENERGY_INTENSITY,
  MOCK_BASE_FLEXIBILITY_INDEX,
  MOCK_BUILDING_TYPE_FACTOR,
  MOCK_CLIMATE_FACTOR,
  MOCK_COOLING_ENERGY_SPLIT,
  MOCK_DEFAULT_FLOOR_AREA,
  MOCK_DELAY_LONG,
  MOCK_ENERGY_PRICE_EUR_PER_KWH,
  MOCK_EPC_THRESHOLDS,
  MOCK_GLAZING_EFFICIENCY,
  MOCK_HEATING_EFFICIENCY,
  MOCK_HEATING_ENERGY_SPLIT,
  MOCK_MAX_OPENING_FACTOR,
  MOCK_NON_HVAC_ENERGY_MULTIPLIER,
  MOCK_PERIOD_FACTOR,
} from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getEPCClass(energyIntensity: number): string {
  for (const threshold of MOCK_EPC_THRESHOLDS) {
    if (energyIntensity <= threshold.maxValue) {
      return threshold.class;
    }
  }
  return "G";
}

function calculateBaseEnergyIntensity(building: BuildingInfo): number {
  // Base energy intensity (kWh/m²/year) for a "reference" building
  const baseIntensity = MOCK_BASE_ENERGY_INTENSITY;

  // Apply factors
  const periodFactor = MOCK_PERIOD_FACTOR[building.constructionPeriod] || 1.0;
  const buildingFactor =
    MOCK_BUILDING_TYPE_FACTOR[building.buildingType] || 1.0;
  const heatingFactor =
    MOCK_HEATING_EFFICIENCY[building.heatingTechnology] || 1.0;
  const glazingFactor =
    MOCK_GLAZING_EFFICIENCY[building.glazingTechnology] || 1.0;

  // Opening density impact (more windows = worse efficiency if poor glazing)
  const floorArea = building.floorArea || MOCK_DEFAULT_FLOOR_AREA;
  const openings = building.numberOfOpenings || 10;
  const openingDensity = openings / (floorArea / 10); // openings per 10m²
  const openingFactor = 0.8 + openingDensity * 0.1 * glazingFactor;

  return (
    baseIntensity *
    periodFactor *
    buildingFactor *
    heatingFactor *
    Math.min(openingFactor, MOCK_MAX_OPENING_FACTOR)
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
  let comfort = MOCK_BASE_COMFORT_INDEX; // Base comfort

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
  let flexibility = MOCK_BASE_FLEXIBILITY_INDEX; // Base flexibility

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
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_LONG));

    const floorArea = building.floorArea || MOCK_DEFAULT_FLOOR_AREA;
    const climateFactor = MOCK_CLIMATE_FACTOR[building.climateZone] || {
      heating: 1.0,
      cooling: 0.8,
    };

    // Calculate base energy intensity
    const baseIntensity = calculateBaseEnergyIntensity(building);

    // Split into heating and cooling
    const heatingIntensity =
      baseIntensity * MOCK_HEATING_ENERGY_SPLIT * climateFactor.heating;
    const coolingIntensity =
      baseIntensity * MOCK_COOLING_ENERGY_SPLIT * climateFactor.cooling;
    const totalIntensity = heatingIntensity + coolingIntensity;

    // Convert to absolute values
    const heatingCoolingNeeds = totalIntensity * floorArea;
    const annualEnergyNeeds =
      heatingCoolingNeeds * MOCK_NON_HVAC_ENERGY_MULTIPLIER; // Add hot water, lighting, etc.
    const annualEnergyCost = annualEnergyNeeds * MOCK_ENERGY_PRICE_EUR_PER_KWH;

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
      // TBD: This value represents current state energy consumption.
      // Annual energy savings are calculated when comparing before/after renovation.
      // The Financial API /risk-assessment endpoint expects savings in kWh/year.
      annualEnergySavings: Math.round(annualEnergyNeeds),
    };
  }
}

// Export singleton instance
export const mockEnergyService: IEnergyService = new MockEnergyService();
