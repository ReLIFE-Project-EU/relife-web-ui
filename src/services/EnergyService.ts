/**
 * Energy Service - Real Forecasting API Implementation
 *
 * Provides EPC estimation and energy consumption calculations using the
 * Forecasting API's direct simulation endpoint with archetype mode and PVGIS weather data.
 *
 * Architecture:
 * - Uses GET /building/available to dynamically discover available archetypes
 * - Uses POST /simulate?archetype=true&weather_source=pvgis for energy simulation
 * - Calculates EPC class locally from energy intensity (kWh/m²)
 * - Scales results based on user's floor area vs archetype's floor area
 *
 * Error Handling:
 * - No mock fallback - errors are surfaced to the UI
 * - ArchetypeNotAvailableError: No matching archetype for country/building type
 * - APIConnectionError: Network or server connectivity issues
 * - APIResponseError: Unexpected or invalid response data
 */

import { forecasting } from "../api";
import { APIError } from "../types/common";
import type { ArchetypeInfo } from "../types/forecasting";
import type {
  BuildingInfo,
  EnergyMix,
  EstimationResult,
} from "../types/renovation";
import {
  DEFAULT_FLOOR_AREA,
  calculateAnnualTotals,
  estimateAnnualHvacEnergyCost,
  getEPCClass,
} from "./energyUtils";
import type { IEnergyService, IBuildingService } from "./types";
import { applyAllModifications } from "../utils/archetypeModifier";

// ─────────────────────────────────────────────────────────────────────────────
// Custom Error Types
// ─────────────────────────────────────────────────────────────────────────────

export class ArchetypeNotAvailableError extends Error {
  constructor(country: string, buildingType: string) {
    super(
      `Energy estimation is not yet available for ${country} (${buildingType}). ` +
        `This feature is coming soon.`,
    );
    this.name = "ArchetypeNotAvailableError";
  }
}

export class APIConnectionError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "Unable to connect to the energy service. Please check your connection and try again.",
    );
    this.name = "APIConnectionError";
  }
}

export class APIResponseError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "Received unexpected data from the energy service. Please try again later.",
    );
    this.name = "APIResponseError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base comfort and flexibility indices
 */
const BASE_COMFORT_INDEX = 70;
const BASE_FLEXIBILITY_INDEX = 50;

/**
 * Mapping from UI building types to API category values
 */
const BUILDING_TYPE_TO_CATEGORY: Record<string, string> = {
  apartment: "Multi family House",
  terraced: "Multi family House",
  "semi-detached": "Single Family House",
  detached: "Single Family House",
};

/**
 * Climate regions for fallback archetype matching
 * Countries grouped by similar climate characteristics
 */
const CLIMATE_REGIONS: Record<string, string[]> = {
  mediterranean: ["Greece", "Italy", "Spain", "Portugal"],
  central: ["Germany", "Austria", "Netherlands", "Belgium", "France"],
  northern: ["Finland", "Sweden", "Norway", "Denmark"],
  eastern: ["Poland", "Czech Republic", "Hungary", "Romania"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate energy mix based on heating/cooling needs and technology
 */
function calculateEnergyMix(
  heatingNeeds: number,
  coolingNeeds: number,
  heatingTech: string,
): { cooling: EnergyMix; heating: EnergyMix; overall: EnergyMix } {
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

/**
 * Calculate comfort index based on building characteristics
 */
function calculateComfortIndex(building: BuildingInfo): number {
  let comfort = BASE_COMFORT_INDEX;

  const glazingBonus: Record<string, number> = {
    "triple-pvc": 15,
    "triple-wood": 12,
    "double-pvc": 8,
    "double-wood": 5,
    "double-aluminium": 3,
    "single-wood": -10,
  };
  comfort += glazingBonus[building.glazingTechnology] || 0;

  const periodBonus: Record<string, number> = {
    "post-2010": 10,
    "2001-2010": 5,
    "1991-2000": 0,
    "1971-1990": -5,
    "1945-1970": -10,
    "pre-1945": -15,
  };
  comfort += periodBonus[building.constructionPeriod] || 0;

  if (building.heatingTechnology.includes("heat-pump")) {
    comfort += 5;
  }

  return Math.max(0, Math.min(100, comfort));
}

/**
 * Calculate flexibility index based on building characteristics
 */
function calculateFlexibilityIndex(building: BuildingInfo): number {
  let flexibility = BASE_FLEXIBILITY_INDEX;

  if (
    ["heat-pump-air", "heat-pump-ground", "electric-resistance"].includes(
      building.heatingTechnology,
    )
  ) {
    flexibility += 20;
  }

  if (building.hotWaterTechnology === "solar-thermal") {
    flexibility += 10;
  }

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

/**
 * Get the climate region for a country
 */
function getClimateRegion(country: string): string | null {
  for (const [region, countries] of Object.entries(CLIMATE_REGIONS)) {
    if (countries.includes(country)) {
      return region;
    }
  }
  return null;
}

/**
 * Map country code to API country name
 */
function mapCountryCodeToName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    AT: "Austria",
    BE: "Belgium",
    DE: "Germany",
    ES: "Spain",
    FR: "France",
    GR: "Greece",
    IT: "Italy",
    NL: "Netherlands",
    PT: "Portugal",
    FI: "Finland",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    PL: "Poland",
    CZ: "Czech Republic",
    HU: "Hungary",
    RO: "Romania",
  };
  return countryMap[countryCode] || countryCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class EnergyService implements IEnergyService {
  private archetypesCache: ArchetypeInfo[] | null = null;
  private readonly buildingService: IBuildingService;

  constructor(buildingService: IBuildingService) {
    this.buildingService = buildingService;
  }

  /**
   * Fetch and cache available archetypes
   */
  private async getArchetypes(): Promise<ArchetypeInfo[]> {
    if (this.archetypesCache) {
      return this.archetypesCache;
    }

    try {
      const archetypes = await forecasting.listArchetypes();
      this.archetypesCache = archetypes;
      return archetypes;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new APIConnectionError();
      }
      if (error instanceof APIError) {
        throw new APIConnectionError(
          `Energy service returned error ${error.status}: ${error.statusText}`,
        );
      }
      throw error;
    }
  }

  /**
   * Find the best matching archetype for the given building
   *
   * Matching priority:
   * 1. Same country + matching category
   * 2. Same country + any category
   * 3. Similar climate region + matching category
   * 4. Error state
   */
  private async findMatchingArchetype(
    building: BuildingInfo,
  ): Promise<ArchetypeInfo> {
    const archetypes = await this.getArchetypes();
    const countryName = mapCountryCodeToName(building.country);
    const targetCategory =
      BUILDING_TYPE_TO_CATEGORY[building.buildingType] || "Single Family House";

    // Priority 1: Exact match (country + category)
    const exactMatch = archetypes.find(
      (a) => a.country === countryName && a.category === targetCategory,
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Priority 2: Same country, any category
    const countryMatch = archetypes.find((a) => a.country === countryName);
    if (countryMatch) {
      console.warn(
        `No exact archetype match for ${countryName}/${targetCategory}, ` +
          `using ${countryMatch.category} instead`,
      );
      return countryMatch;
    }

    // Priority 3: Similar climate region + matching category
    const userRegion = getClimateRegion(countryName);
    if (userRegion) {
      const regionCountries = CLIMATE_REGIONS[userRegion];
      const regionMatch = archetypes.find(
        (a) =>
          regionCountries.includes(a.country) && a.category === targetCategory,
      );
      if (regionMatch) {
        console.warn(
          `No archetype for ${countryName}, using similar climate: ${regionMatch.country}`,
        );
        return regionMatch;
      }

      // Any match in region
      const anyRegionMatch = archetypes.find((a) =>
        regionCountries.includes(a.country),
      );
      if (anyRegionMatch) {
        console.warn(
          `No archetype for ${countryName}, using ${anyRegionMatch.country}/${anyRegionMatch.category}`,
        );
        return anyRegionMatch;
      }
    }

    // No match found
    throw new ArchetypeNotAvailableError(countryName, building.buildingType);
  }

  /**
   * Estimate EPC and energy consumption based on building characteristics.
   *
   * This method:
   * 1. Fetches available archetypes from the API
   * 2. Finds the best matching archetype for the user's building
   * 3. Runs an energy simulation using the Forecasting API
   * 4. Transforms the response into an EstimationResult
   * 5. Scales results based on user's floor area
   */
  async estimateEPC(building: BuildingInfo): Promise<EstimationResult> {
    // Find matching archetype
    const archetype = await this.findMatchingArchetype(building);

    // Branch: modified or unmodified simulation
    let simulationResponse;

    if (building.isModified && building.modifications) {
      // Modified archetype path: fetch full details, apply modifications, simulate custom
      try {
        const archetypeDetails = await this.buildingService.getArchetypeDetails(
          {
            category: archetype.category,
            country: archetype.country,
            name: archetype.name,
          },
        );

        const { bui, system } = applyAllModifications(
          archetypeDetails,
          building.modifications,
        );

        simulationResponse = await forecasting.simulateCustomBuilding(
          { bui, system },
          "pvgis",
        );
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new APIConnectionError();
        }
        if (error instanceof APIError) {
          throw new APIConnectionError(
            `Energy simulation failed with error ${error.status}: ${error.statusText}`,
          );
        }
        throw error;
      }
    } else {
      // Unmodified archetype path: direct simulation
      try {
        simulationResponse = await forecasting.simulateDirect({
          category: archetype.category,
          country: archetype.country,
          name: archetype.name,
          weatherSource: "pvgis",
        });
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new APIConnectionError();
        }
        if (error instanceof APIError) {
          throw new APIConnectionError(
            `Energy simulation failed with error ${error.status}: ${error.statusText}`,
          );
        }
        throw error;
      }
    }

    // Validate response - API returns hourly data under results.hourly_building
    const hourlyData = simulationResponse.results?.hourly_building;
    if (!hourlyData || !Array.isArray(hourlyData)) {
      throw new APIResponseError(
        `Simulation response has invalid hourly_building data. Type: ${typeof hourlyData}, Value: ${JSON.stringify(hourlyData)}`,
      );
    }
    if (hourlyData.length === 0) {
      throw new APIResponseError(
        "Simulation response has empty hourly building data array",
      );
    }

    // Calculate annual totals from hourly data
    const annualData = calculateAnnualTotals(hourlyData);

    // Use archetype area if available, otherwise default
    // Note: building_area may be provided in extended response fields
    const archetypeArea =
      ((simulationResponse as Record<string, unknown>).building_area as
        | number
        | undefined) ?? DEFAULT_FLOOR_AREA;
    const userArea = building.floorArea || DEFAULT_FLOOR_AREA;

    // Extract energy values from calculated annual totals
    const heatingTotal = annualData.Q_H_total;
    const coolingTotal = annualData.Q_C_total;
    const hvacTotal = annualData.Q_HC_total || heatingTotal + coolingTotal;

    // Scale by floor area ratio
    const areaScaleFactor = userArea / archetypeArea;
    const scaledHvacTotal = hvacTotal * areaScaleFactor;
    const scaledHeating = heatingTotal * areaScaleFactor;
    const scaledCooling = coolingTotal * areaScaleFactor;

    // Calculate energy intensity for EPC
    const energyIntensity = scaledHvacTotal / userArea;
    const estimatedEPC = getEPCClass(energyIntensity);

    const annualEnergyNeeds = scaledHvacTotal;
    const annualEnergyCost = estimateAnnualHvacEnergyCost(annualEnergyNeeds);

    // Calculate energy mix
    const energyMix = calculateEnergyMix(
      scaledHeating,
      scaledCooling,
      building.heatingTechnology,
    );

    // Calculate indices
    const comfortIndex = calculateComfortIndex(building);
    const flexibilityIndex = calculateFlexibilityIndex(building);

    return {
      estimatedEPC,
      annualEnergyNeeds: Math.round(annualEnergyNeeds),
      annualEnergyCost: Math.round(annualEnergyCost),
      heatingCoolingNeeds: Math.round(scaledHvacTotal),
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
      // This value represents current state energy consumption.
      // Annual energy savings are calculated when comparing before/after renovation.
      annualEnergyConsumption: Math.round(annualEnergyNeeds),
      archetypeFloorArea: archetypeArea,
      // Store matched archetype for reuse in Step 2 (ECM simulation)
      archetype: {
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      },
    };
  }
}
