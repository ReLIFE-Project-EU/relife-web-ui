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
import type { ArchetypeInfo, ECMScenario } from "../types/forecasting";
import type { BuildingInfo, EstimationResult } from "../types/renovation";
import {
  DEFAULT_FLOOR_AREA,
  calculateAnnualTotals,
  extractUniTotals,
  getEPCClass,
  resolveEpcRatingIntensity,
  transformColumnarToRowFormat,
} from "./energyUtils";
import {
  buildECMParams,
  type BuildECMParamsContext,
} from "./renovationEcmParams";
import {
  extractUniCarrierBreakdown,
  scaleCarrierBreakdown,
} from "./carrierSavingsService";
import type {
  IEnergyService,
  IBuildingService,
  EstimationOutcome,
} from "./types";
import {
  applyAllModifications,
  validateModifications,
} from "../utils/archetypeModifier";
import { countryNamesEqual, normalizeCountryName } from "../utils/countries";
import {
  deriveConstructionPeriod,
  deriveConstructionYear,
  normalizeConstructionPeriod,
} from "../utils/apiMappings";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import { ArchetypeMatchStrategy } from "./archetypeMatching";
import { extractArchetypePeriod } from "../utils/archetypePeriod";

interface ResolvedArchetype {
  archetype: ArchetypeInfo;
  strategy: ArchetypeMatchStrategy;
}

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
  mediterranean: [
    "Greece",
    "Italy",
    "Spain",
    "Portugal",
    "Croatia",
    "Cyprus",
    "Malta",
  ],
  central: [
    "Germany",
    "Austria",
    "Netherlands",
    "Belgium",
    "France",
    "Luxembourg",
    "Ireland",
    "Slovenia",
  ],
  northern: [
    "Finland",
    "Sweden",
    "Norway",
    "Denmark",
    "Estonia",
    "Latvia",
    "Lithuania",
  ],
  eastern: ["Poland", "Czechia", "Hungary", "Romania", "Slovakia", "Bulgaria"],
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
  // Bucket archetype-vocabulary periods (e.g. "1946-1969") into the
  // canonical keys the bonus map uses.
  const normalizedPeriod = normalizeConstructionPeriod(
    building.constructionPeriod,
  );
  const bucketedPeriod = normalizedPeriod
    ? deriveConstructionPeriod(deriveConstructionYear(normalizedPeriod))
    : undefined;
  comfort += (bucketedPeriod ? periodBonus[bucketedPeriod] : undefined) || 0;

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
  const normalizedPeriod = normalizeConstructionPeriod(
    building.constructionPeriod,
  );
  const bucketedPeriod = normalizedPeriod
    ? deriveConstructionPeriod(deriveConstructionYear(normalizedPeriod))
    : undefined;
  flexibility +=
    (bucketedPeriod ? periodBonus[bucketedPeriod] : undefined) || 0;

  return Math.max(0, Math.min(100, flexibility));
}

/**
 * Get the climate region for a country
 */
function getClimateRegion(country: string): string | null {
  const normalizedCountry = normalizeCountryName(country) ?? country;
  for (const [region, countries] of Object.entries(CLIMATE_REGIONS)) {
    if (countries.includes(normalizedCountry)) {
      return region;
    }
  }
  return null;
}

/** Run an ECM simulation with no measures applied and return its baseline scenario. */
async function simulateEcmBaseline(
  context: BuildECMParamsContext,
): Promise<ECMScenario> {
  const response = await forecasting.simulateECM({
    ...buildECMParams([], context),
    baseline_only: true,
  });
  const baseline =
    response.scenarios.find(
      (scenario) => scenario.scenario_id === "baseline",
    ) ?? response.scenarios[0];

  if (!baseline?.results?.hourly_building) {
    throw new APIResponseError(
      "ECM API did not return a valid baseline scenario",
    );
  }

  return baseline;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class EnergyService implements IEnergyService {
  private archetypesCache: ArchetypeInfo[] | null = null;
  private readonly archetypeSimulationCache = new Map<
    string,
    Promise<ECMScenario>
  >();
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

  private getArchetypeSimulationCacheKey(params: {
    category: string;
    country: string;
    name: string;
    weatherSource?: "pvgis" | "epw";
  }): string {
    return [
      params.category,
      params.country,
      params.name,
      params.weatherSource ?? "pvgis",
    ].join(":");
  }

  private simulateArchetype(params: {
    category: string;
    country: string;
    name: string;
    weatherSource?: "pvgis" | "epw";
    floorArea: number | null;
  }): Promise<ECMScenario> {
    const cacheKey = this.getArchetypeSimulationCacheKey(params);
    const cachedPromise = this.archetypeSimulationCache.get(cacheKey);

    if (cachedPromise) {
      return cachedPromise;
    }

    const simulationPromise = simulateEcmBaseline({
      kind: "archetype",
      archetype: {
        category: params.category,
        country: params.country,
        name: params.name,
      },
      floorArea: params.floorArea,
    }).catch((error: unknown) => {
      this.archetypeSimulationCache.delete(cacheKey);
      throw error;
    });

    this.archetypeSimulationCache.set(cacheKey, simulationPromise);

    return simulationPromise;
  }

  /**
   * Resolve a user-selected archetype to an ArchetypeInfo from the available list.
   * Returns the strategy alongside the archetype so downstream code (audit log,
   * validateEstimation) can act on it. If the selected archetype is missing
   * from the live catalogue, returns the original payload with
   * SELECTED_NOT_FOUND — falling back to `findMatchingArchetype` here would
   * discard the user's intent silently.
   */
  private async resolveSelectedArchetype(
    selected: NonNullable<BuildingInfo["selectedArchetype"]>,
    auditCtx?: AuditCtx,
  ): Promise<ResolvedArchetype> {
    const archetypes = await this.getArchetypes();
    const match = archetypes.find(
      (a) =>
        a.name === selected.name &&
        a.category === selected.category &&
        countryNamesEqual(a.country, selected.country),
    );
    if (match) {
      return {
        archetype: match,
        strategy: ArchetypeMatchStrategy.USER_SELECTED,
      };
    }

    auditLog.warn(
      "energy",
      "energy.archetype.fallback",
      {
        reason: ArchetypeMatchStrategy.SELECTED_NOT_FOUND,
        requested: selected,
      },
      auditCtx,
    );
    return {
      archetype: {
        name: selected.name,
        category: selected.category,
        country: selected.country,
      },
      strategy: ArchetypeMatchStrategy.SELECTED_NOT_FOUND,
    };
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
    auditCtx?: AuditCtx,
  ): Promise<ResolvedArchetype> {
    const archetypes = await this.getArchetypes();
    const { buildingType } = building;
    const country = normalizeCountryName(building.country) ?? building.country;
    const requestedPeriod = normalizeConstructionPeriod(
      building.constructionPeriod,
    );

    // Priority 1: Exact match (country + category). Period-aware: prefer an
    // archetype whose parsed period matches the requested period; if none does,
    // fall back to any same-country/same-category archetype but classify the
    // strategy as EXACT_CATEGORY_PERIOD_MISMATCH so downstream code can surface
    // the gap.
    const sameCountryAndCategory = archetypes.filter(
      (a) =>
        countryNamesEqual(a.country, country) && a.category === buildingType,
    );
    if (sameCountryAndCategory.length > 0) {
      const periodMatch = requestedPeriod
        ? sameCountryAndCategory.find(
            (a) => extractArchetypePeriod(a.name) === requestedPeriod,
          )
        : undefined;
      if (periodMatch) {
        return {
          archetype: periodMatch,
          strategy: ArchetypeMatchStrategy.EXACT_FULL,
        };
      }

      const chosen = sameCountryAndCategory[0];
      auditLog.warn(
        "energy",
        "energy.archetype.fallback",
        {
          reason: ArchetypeMatchStrategy.EXACT_CATEGORY_PERIOD_MISMATCH,
          requested: {
            country,
            category: buildingType,
            period: requestedPeriod,
          },
          chosen: {
            country: chosen.country,
            category: chosen.category,
            name: chosen.name,
            period: extractArchetypePeriod(chosen.name),
          },
        },
        auditCtx,
      );
      return {
        archetype: chosen,
        strategy: ArchetypeMatchStrategy.EXACT_CATEGORY_PERIOD_MISMATCH,
      };
    }

    // Priority 2: Same country, any category
    const countryMatch = archetypes.find((a) =>
      countryNamesEqual(a.country, country),
    );
    if (countryMatch) {
      auditLog.warn(
        "energy",
        "energy.archetype.fallback",
        {
          reason: ArchetypeMatchStrategy.COUNTRY_ANY_CATEGORY,
          requested: { country, category: buildingType },
          chosen: {
            country: countryMatch.country,
            category: countryMatch.category,
            name: countryMatch.name,
          },
        },
        auditCtx,
      );
      return {
        archetype: countryMatch,
        strategy: ArchetypeMatchStrategy.COUNTRY_ANY_CATEGORY,
      };
    }

    // Priority 3: Similar climate region + matching category
    const userRegion = getClimateRegion(country);
    if (userRegion) {
      const regionCountries = CLIMATE_REGIONS[userRegion];
      const regionMatch = archetypes.find(
        (a) =>
          regionCountries.some((regionCountry) =>
            countryNamesEqual(regionCountry, a.country),
          ) && a.category === buildingType,
      );
      if (regionMatch) {
        auditLog.warn(
          "energy",
          "energy.archetype.fallback",
          {
            reason: ArchetypeMatchStrategy.REGION_CATEGORY_MATCH,
            requested: { country, category: buildingType },
            chosen: {
              country: regionMatch.country,
              category: regionMatch.category,
              name: regionMatch.name,
            },
            region: userRegion,
          },
          auditCtx,
        );
        return {
          archetype: regionMatch,
          strategy: ArchetypeMatchStrategy.REGION_CATEGORY_MATCH,
        };
      }

      // Any match in region
      const anyRegionMatch = archetypes.find((a) =>
        regionCountries.some((regionCountry) =>
          countryNamesEqual(regionCountry, a.country),
        ),
      );
      if (anyRegionMatch) {
        auditLog.warn(
          "energy",
          "energy.archetype.fallback",
          {
            reason: ArchetypeMatchStrategy.REGION_ANY_MATCH,
            requested: { country, category: buildingType },
            chosen: {
              country: anyRegionMatch.country,
              category: anyRegionMatch.category,
              name: anyRegionMatch.name,
            },
            region: userRegion,
          },
          auditCtx,
        );
        return {
          archetype: anyRegionMatch,
          strategy: ArchetypeMatchStrategy.REGION_ANY_MATCH,
        };
      }
    }

    // No match found
    throw new ArchetypeNotAvailableError(country, buildingType);
  }

  private buildEstimationFromSimulation(params: {
    simulationResponse: ECMScenario;
    archetype: ArchetypeInfo;
    matchStrategy: ArchetypeMatchStrategy;
    building: BuildingInfo;
    archetypeArea: number;
    userArea: number;
    modifiedBui?: unknown;
    modifiedSystem?: unknown;
    validationNotes?: string[];
    referenceEstimation?: EstimationResult["referenceEstimation"];
    auditCtx?: AuditCtx;
  }): EstimationResult {
    const {
      simulationResponse,
      archetype,
      matchStrategy,
      building,
      archetypeArea,
      userArea,
      modifiedBui,
      modifiedSystem,
      validationNotes,
      referenceEstimation,
      auditCtx,
    } = params;

    // ECM returns hourly data columnar; the rest of this method works on rows.
    const hourlyData = transformColumnarToRowFormat(
      simulationResponse.results?.hourly_building,
    );
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
    const annualEnergyNeeds = scaledHvacTotal;
    const uniTotals = extractUniTotals(
      simulationResponse.results.primary_energy_uni11300,
    );
    const carrierBreakdown = scaleCarrierBreakdown(
      extractUniCarrierBreakdown(
        simulationResponse.results.primary_energy_uni11300,
      ),
      areaScaleFactor,
    );
    const scaledDeliveredTotal =
      uniTotals !== undefined
        ? uniTotals.deliveredTotal * areaScaleFactor
        : undefined;
    const scaledPrimaryEnergy =
      uniTotals !== undefined
        ? uniTotals.primaryEnergy * areaScaleFactor
        : undefined;
    // EPC is rated on primary energy (EU EPgl,nren basis), falling back to
    // delivered then thermal demand so a heating-system swap actually moves the
    // class. See resolveEpcRatingIntensity.
    const epcRating = resolveEpcRatingIntensity(
      {
        primaryEnergy: scaledPrimaryEnergy,
        deliveredTotal: scaledDeliveredTotal,
        annualEnergyNeeds: scaledHvacTotal,
      },
      userArea,
    );
    const energyIntensity = epcRating.intensity;
    const estimatedEPC = getEPCClass(energyIntensity);

    const comfortIndex = calculateComfortIndex(building);
    const flexibilityIndex = calculateFlexibilityIndex(building);

    auditLog.debug(
      "energy",
      "energy.simulation.summary",
      {
        archetype: {
          name: archetype.name,
          category: archetype.category,
          country: archetype.country,
        },
        archetypeArea,
        userArea,
        areaScaleFactor,
        annualTotalsRaw: {
          Q_H_total: heatingTotal,
          Q_C_total: coolingTotal,
          Q_HC_total: hvacTotal,
        },
        scaled: {
          heatingDemand: scaledHeating,
          coolingDemand: scaledCooling,
          hvacTotal: scaledHvacTotal,
          deliveredTotal: scaledDeliveredTotal,
          carrierBreakdown,
          primaryEnergy: scaledPrimaryEnergy,
        },
        energyIntensity,
        estimatedEPC,
        uniTotalsAvailable: uniTotals !== undefined,
        comfortIndex,
        flexibilityIndex,
        validationNoteCount: validationNotes?.length ?? 0,
      },
      auditCtx,
    );

    return {
      estimatedEPC,
      annualEnergyNeeds: Math.round(annualEnergyNeeds),
      heatingCoolingNeeds: Math.round(scaledHvacTotal),
      heatingDemand: Math.round(scaledHeating),
      coolingDemand: Math.round(scaledCooling),
      flexibilityIndex: Math.round(flexibilityIndex),
      comfortIndex: Math.round(comfortIndex),
      annualEnergyConsumption: Math.round(annualEnergyNeeds),
      ...(scaledDeliveredTotal !== undefined
        ? {
            deliveredTotal: Math.round(scaledDeliveredTotal),
            ...(carrierBreakdown !== undefined
              ? {
                  carrierBreakdown: {
                    naturalGasKwh: Math.round(carrierBreakdown.naturalGasKwh),
                    gridElectricityKwh: Math.round(
                      carrierBreakdown.gridElectricityKwh,
                    ),
                  },
                }
              : {}),
          }
        : {}),
      ...(scaledPrimaryEnergy !== undefined
        ? { primaryEnergy: Math.round(scaledPrimaryEnergy) }
        : {}),
      epcEnergyIntensity: Math.round(energyIntensity),
      epcEnergyBasis: epcRating.basis,
      archetypeFloorArea: archetypeArea,
      archetype: {
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
        matchStrategy,
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
   * 1. Uses building.selectedArchetype when available (set by BuildingSelector)
   * 2. Falls back to heuristic matching by country/category when not set
   *
   * For modified archetypes:
   * - Validates modifications locally, then via the Forecasting API
   * - Runs both modified and reference simulations for comparison
   */
  async estimateEPC(
    building: BuildingInfo,
    auditCtx?: AuditCtx,
  ): Promise<EstimationOutcome> {
    auditLog.info(
      "energy",
      "energy.estimate.start",
      {
        country: building.country,
        buildingType: building.buildingType,
        constructionPeriod: building.constructionPeriod,
        floorArea: building.floorArea,
        numberOfFloors: building.numberOfFloors,
        floorNumber: building.floorNumber,
        lat: building.lat,
        lng: building.lng,
        isModified: building.isModified === true,
        modificationKeys: building.modifications
          ? Object.keys(building.modifications)
          : [],
        selectedArchetype: building.selectedArchetype,
      },
      auditCtx,
    );

    const { archetype, strategy: matchStrategy } = building.selectedArchetype
      ? await this.resolveSelectedArchetype(
          building.selectedArchetype,
          auditCtx,
        )
      : await this.findMatchingArchetype(building, auditCtx);

    auditLog.info(
      "energy",
      "energy.archetype.resolved",
      {
        archetype: {
          name: archetype.name,
          category: archetype.category,
          country: archetype.country,
        },
        matchStrategy,
        viaUserSelection: !!building.selectedArchetype,
        countryMismatch:
          !!building.country &&
          !countryNamesEqual(archetype.country, building.country),
      },
      auditCtx,
    );

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
          simulateEcmBaseline({
            kind: "custom",
            modifiedBui: validatedBui,
            modifiedSystem: validatedSystem,
            floorArea:
              building.modifications.floorArea ?? archetypeDetails.floorArea,
          }),
          this.simulateArchetype({
            category: archetype.category,
            country: archetype.country,
            name: archetype.name,
            weatherSource: "pvgis",
            floorArea: archetypeDetails.floorArea,
          }),
        ]);

        const referenceEstimation = this.buildEstimationFromSimulation({
          simulationResponse: referenceSimulation,
          archetype,
          matchStrategy,
          building: {
            ...building,
            floorArea: archetypeDetails.floorArea,
          },
          archetypeArea: archetypeDetails.floorArea,
          userArea: archetypeDetails.floorArea,
          auditCtx,
        });

        const validationNotes = [
          ...validationResponse.bui_issues,
          ...validationResponse.system_messages,
        ];

        const result = this.buildEstimationFromSimulation({
          simulationResponse: customSimulation,
          archetype,
          matchStrategy,
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
            heatingCoolingNeeds: referenceEstimation.heatingCoolingNeeds,
            flexibilityIndex: referenceEstimation.flexibilityIndex,
            comfortIndex: referenceEstimation.comfortIndex,
            deliveredTotal: referenceEstimation.deliveredTotal,
            primaryEnergy: referenceEstimation.primaryEnergy,
            epcEnergyIntensity: referenceEstimation.epcEnergyIntensity,
            epcEnergyBasis: referenceEstimation.epcEnergyBasis,
          },
          auditCtx,
        });
        auditLog.info(
          "energy",
          "energy.estimate.end",
          {
            estimatedEPC: result.estimatedEPC,
            annualEnergyNeeds: result.annualEnergyNeeds,
            heatingCoolingNeeds: result.heatingCoolingNeeds,
            deliveredTotal: result.deliveredTotal,
            primaryEnergy: result.primaryEnergy,
            archetypeFloorArea: result.archetypeFloorArea,
            modified: true,
            referenceEstimatedEPC: referenceEstimation.estimatedEPC,
          },
          auditCtx,
        );
        return { estimation: result, baselineSimulation: customSimulation };
      } catch (error) {
        this.handleSimulationError(error);
      }
    }

    try {
      const archetypeDetails = await this.buildingService.getArchetypeDetails({
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      });

      const simulationResponse = await this.simulateArchetype({
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
        weatherSource: "pvgis",
        floorArea: archetypeDetails.floorArea,
      });

      const result = this.buildEstimationFromSimulation({
        simulationResponse,
        archetype,
        matchStrategy,
        building,
        archetypeArea: archetypeDetails.floorArea,
        userArea: building.floorArea || DEFAULT_FLOOR_AREA,
        auditCtx,
      });
      auditLog.info(
        "energy",
        "energy.estimate.end",
        {
          estimatedEPC: result.estimatedEPC,
          annualEnergyNeeds: result.annualEnergyNeeds,
          heatingCoolingNeeds: result.heatingCoolingNeeds,
          deliveredTotal: result.deliveredTotal,
          primaryEnergy: result.primaryEnergy,
          archetypeFloorArea: result.archetypeFloorArea,
          modified: false,
        },
        auditCtx,
      );
      return { estimation: result, baselineSimulation: simulationResponse };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new APIConnectionError();
      }
      if (error instanceof APIError) {
        throw new APIConnectionError(
          `Energy simulation failed with error ${error.status}: ${error.statusText}`,
        );
      }
      this.handleSimulationError(error);
    }
  }

  /**
   * Translate low-level fetch/API failures from the simulation calls into a
   * uniform APIConnectionError; re-throw anything else unchanged.
   */
  private handleSimulationError(error: unknown): never {
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
