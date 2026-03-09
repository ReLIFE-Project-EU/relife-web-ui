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
import type {
  ArchetypeInfo,
  SimulateDirectResponse,
} from "../types/forecasting";
import type {
  BuildingInfo,
  EstimationResult,
} from "../types/renovation";
import {
  DEFAULT_FLOOR_AREA,
  calculateAnnualTotals,
  estimateAnnualHvacEnergyCost,
  getEPCClass,
} from "./energyUtils";
import type { IEnergyService, IBuildingService } from "./types";
import {
  applyAllModifications,
  validateModifications,
} from "../utils/archetypeModifier";

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

function getSimulationValidationNotes(
  simulationResponse: SimulateDirectResponse,
): string[] {
  const buiIssues = simulationResponse.validation?.bui_issues ?? [];
  const systemMessages = simulationResponse.validation?.system_messages ?? [];

  return [...buiIssues, ...systemMessages].filter(Boolean);
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
   * Resolve a user-selected archetype to an ArchetypeInfo from the available list.
   * Falls back to findMatchingArchetype if the exact archetype is no longer available.
   */
  private async resolveSelectedArchetype(
    selected: NonNullable<BuildingInfo["selectedArchetype"]>,
  ): Promise<ArchetypeInfo> {
    const archetypes = await this.getArchetypes();
    const match = archetypes.find(
      (a) =>
        a.name === selected.name &&
        a.category === selected.category &&
        a.country === selected.country,
    );
    if (match) return match;

    console.warn(
      `Selected archetype ${selected.name} not found, falling back to matching`,
    );
    return { name: selected.name, category: selected.category, country: selected.country };
  }

  /**
   * Find the best matching archetype for the given building.
   * Only used as a fallback when building.selectedArchetype is not set.
   *
   * NOTE: building.country and building.buildingType are expected to contain
   * API-level values (country name, category name) — not legacy UI codes.
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
    const { country, buildingType } = building;

    // Priority 1: Exact match (country + category)
    const exactMatch = archetypes.find(
      (a) => a.country === country && a.category === buildingType,
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Priority 2: Same country, any category
    const countryMatch = archetypes.find((a) => a.country === country);
    if (countryMatch) {
      console.warn(
        `No exact archetype match for ${country}/${buildingType}, ` +
          `using ${countryMatch.category} instead`,
      );
      return countryMatch;
    }

    // Priority 3: Similar climate region + matching category
    const userRegion = getClimateRegion(country);
    if (userRegion) {
      const regionCountries = CLIMATE_REGIONS[userRegion];
      const regionMatch = archetypes.find(
        (a) =>
          regionCountries.includes(a.country) && a.category === buildingType,
      );
      if (regionMatch) {
        console.warn(
          `No archetype for ${country}, using similar climate: ${regionMatch.country}`,
        );
        return regionMatch;
      }

      // Any match in region
      const anyRegionMatch = archetypes.find((a) =>
        regionCountries.includes(a.country),
      );
      if (anyRegionMatch) {
        console.warn(
          `No archetype for ${country}, using ${anyRegionMatch.country}/${anyRegionMatch.category}`,
        );
        return anyRegionMatch;
      }
    }

    // No match found
    throw new ArchetypeNotAvailableError(country, buildingType);
  }

  private buildEstimationFromSimulation(params: {
    simulationResponse: SimulateDirectResponse;
    archetype: ArchetypeInfo;
    building: BuildingInfo;
    archetypeArea: number;
    userArea: number;
    modifiedBui?: unknown;
    modifiedSystem?: unknown;
    validationNotes?: string[];
    referenceEstimation?: EstimationResult["referenceEstimation"];
  }): EstimationResult {
    const {
      simulationResponse,
      archetype,
      building,
      archetypeArea,
      userArea,
      modifiedBui,
      modifiedSystem,
      validationNotes,
      referenceEstimation,
    } = params;

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

    const annualData = calculateAnnualTotals(hourlyData);

    if (archetypeArea <= 0) {
      throw new APIResponseError(
        "Could not determine archetype floor area. " +
          `archetypeArea=${archetypeArea}`,
      );
    }

    const heatingTotal = annualData.Q_H_total;
    const coolingTotal = annualData.Q_C_total;
    const hvacTotal = annualData.Q_HC_total || heatingTotal + coolingTotal;

    const areaScaleFactor = userArea / archetypeArea;
    const scaledHvacTotal = hvacTotal * areaScaleFactor;
    const scaledHeating = heatingTotal * areaScaleFactor;
    const scaledCooling = coolingTotal * areaScaleFactor;
    const energyIntensity = scaledHvacTotal / userArea;
    const annualEnergyNeeds = scaledHvacTotal;
    const annualEnergyCost = estimateAnnualHvacEnergyCost(annualEnergyNeeds);
    const estimatedEPC = getEPCClass(energyIntensity);

    const comfortIndex = calculateComfortIndex(building);
    const flexibilityIndex = calculateFlexibilityIndex(building);

    return {
      estimatedEPC,
      annualEnergyNeeds: Math.round(annualEnergyNeeds),
      annualEnergyCost: Math.round(annualEnergyCost),
      heatingCoolingNeeds: Math.round(scaledHvacTotal),
      heatingDemand: Math.round(scaledHeating),
      coolingDemand: Math.round(scaledCooling),
      flexibilityIndex: Math.round(flexibilityIndex),
      comfortIndex: Math.round(comfortIndex),
      annualEnergyConsumption: Math.round(annualEnergyNeeds),
      archetypeFloorArea: archetypeArea,
      archetype: {
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      },
      ...(validationNotes && validationNotes.length > 0
        ? { validationNotes }
        : {}),
      ...(referenceEstimation ? { referenceEstimation } : {}),
      ...(modifiedBui !== undefined
        ? {
            modifiedBui,
            modifiedSystem,
          }
        : {}),
    };
  }

  /**
   * Estimate EPC and energy consumption based on building characteristics.
   *
   * Archetype resolution:
   * 1. Uses building.selectedArchetype when available (set by ArchetypeSelector)
   * 2. Falls back to heuristic matching by country/category when not set
   *
   * For modified archetypes:
   * - Validates modifications locally, then via the Forecasting API
   * - Runs both modified and reference simulations for comparison
   */
  async estimateEPC(building: BuildingInfo): Promise<EstimationResult> {
    const archetype = building.selectedArchetype
      ? await this.resolveSelectedArchetype(building.selectedArchetype)
      : await this.findMatchingArchetype(building);

    if (building.isModified && building.modifications) {
      try {
        const archetypeDetails = await this.buildingService.getArchetypeDetails(
          {
            category: archetype.category,
            country: archetype.country,
            name: archetype.name,
          },
        );

        const localValidation = validateModifications(
          building.modifications,
          archetypeDetails,
        );
        if (!localValidation.isValid) {
          throw new APIResponseError(
            localValidation.errors.map((error) => error.message).join(" "),
          );
        }

        const { bui, system } = applyAllModifications(
          archetypeDetails,
          building.modifications,
        );
        const validationResponse = await forecasting.validateCustomBuilding({
          bui,
          system,
        });

        // Use backend-validated payloads for simulation.
        // The backend auto-corrects minor issues and returns the fixed versions.
        const validatedBui = validationResponse.bui_checked ?? bui;
        const validatedSystem = validationResponse.system_checked ?? system;

        const [customSimulation, referenceSimulation] = await Promise.all([
          forecasting.simulateCustomBuilding(
            { bui: validatedBui, system: validatedSystem },
            "pvgis",
          ),
          forecasting.simulateDirect({
            category: archetype.category,
            country: archetype.country,
            name: archetype.name,
            weatherSource: "pvgis",
          }),
        ]);

        const referenceEstimation = this.buildEstimationFromSimulation({
          simulationResponse: referenceSimulation,
          archetype,
          building: {
            ...building,
            floorArea: archetypeDetails.floorArea,
          },
          archetypeArea: archetypeDetails.floorArea,
          userArea: archetypeDetails.floorArea,
        });

        const validationNotes = [
          ...validationResponse.bui_issues,
          ...validationResponse.system_messages,
          ...getSimulationValidationNotes(customSimulation),
        ];

        return this.buildEstimationFromSimulation({
          simulationResponse: customSimulation,
          archetype,
          building,
          archetypeArea:
            building.modifications.floorArea ?? archetypeDetails.floorArea,
          userArea: building.floorArea || DEFAULT_FLOOR_AREA,
          modifiedBui: validatedBui,
          modifiedSystem: validatedSystem,
          validationNotes,
          referenceEstimation: {
            estimatedEPC: referenceEstimation.estimatedEPC,
            annualEnergyNeeds: referenceEstimation.annualEnergyNeeds,
            annualEnergyCost: referenceEstimation.annualEnergyCost,
            heatingCoolingNeeds: referenceEstimation.heatingCoolingNeeds,
            flexibilityIndex: referenceEstimation.flexibilityIndex,
            comfortIndex: referenceEstimation.comfortIndex,
          },
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

    try {
      const archetypeDetails = await this.buildingService.getArchetypeDetails({
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      });

      const simulationResponse = await forecasting.simulateDirect({
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
        weatherSource: "pvgis",
      });

      return this.buildEstimationFromSimulation({
        simulationResponse,
        archetype,
        building,
        archetypeArea: archetypeDetails.floorArea,
        userArea: building.floorArea || DEFAULT_FLOOR_AREA,
        validationNotes: getSimulationValidationNotes(simulationResponse),
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
}
