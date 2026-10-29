/**
 * Energy Service - Real Forecasting API Implementation
 *
 * Provides baseline energy estimation and consumption calculations using the
 * Forecasting API's direct simulation endpoint with archetype mode and PVGIS weather data.
 *
 * Architecture:
 * - Uses GET /building/available to dynamically discover available archetypes
 * - Uses POST /simulate?archetype=true&weather_source=pvgis for energy simulation
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
import type { BuildingPayload } from "../types/archetype";
import type { ArchetypeInfo, ECMScenario } from "../types/forecasting";
import type { BuildingInfo, EstimationResult } from "../types/renovation";
import {
  DEFAULT_FLOOR_AREA,
  transformColumnarToRowFormat,
} from "./energyUtils";
import { buildECMParams } from "./renovationEcmParams";
import { reduceEcmRun, type ScenarioEnergy } from "./scenarioEnergy";
import {
  energyScaleFactor,
  simulatedFloorArea,
  type SimulatedBuilding,
} from "./simulatedBuilding";
import type { IEnergyService, IBuildingService } from "./types";
import {
  applyAllModifications,
  surfaceAreasFromBui,
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
  simulated: SimulatedBuilding,
): Promise<ECMScenario> {
  const response = await forecasting.simulateECM({
    ...buildECMParams([], simulated),
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
  }): string {
    return [params.category, params.country, params.name].join(":");
  }

  private simulateArchetype(
    simulated: SimulatedBuilding,
  ): Promise<ECMScenario> {
    const cacheKey = this.getArchetypeSimulationCacheKey(simulated.archetype);
    const cachedPromise = this.archetypeSimulationCache.get(cacheKey);

    if (cachedPromise) {
      return cachedPromise;
    }

    const simulationPromise = simulateEcmBaseline(simulated).catch(
      (error: unknown) => {
        this.archetypeSimulationCache.delete(cacheKey);
        throw error;
      },
    );

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
    simulated: SimulatedBuilding;
    matchStrategy: ArchetypeMatchStrategy;
    building: BuildingInfo;
    validationNotes?: string[];
    referenceBaseline?: ScenarioEnergy;
    auditCtx?: AuditCtx;
  }): EstimationResult {
    const {
      simulationResponse,
      simulated,
      matchStrategy,
      building,
      validationNotes,
      referenceBaseline,
      auditCtx,
    } = params;
    const { archetype } = simulated;
    const archetypeArea = simulatedFloorArea(simulated);

    if (
      transformColumnarToRowFormat(simulationResponse.results?.hourly_building)
        .length === 0
    ) {
      throw new APIResponseError(
        "Simulation response has empty hourly building data array",
      );
    }

    if (archetypeArea <= 0) {
      throw new APIResponseError(
        "Could not determine archetype floor area. " +
          `archetypeArea=${archetypeArea}`,
      );
    }

    const baseline = reduceEcmRun(simulationResponse, simulated);
    const { raw, scaled } = baseline.trace;
    const comfortIndex = calculateComfortIndex(building);
    const flexibilityIndex = calculateFlexibilityIndex(building);

    auditLog.debug(
      "energy",
      "energy.simulation.summary",
      {
        basis: simulated.adjustment ? "custom" : "archetype",
        archetype: {
          name: archetype.name,
          category: archetype.category,
          country: archetype.country,
        },
        archetypeArea,
        userArea: simulated.modeledFloorArea,
        areaScaleFactor: baseline.trace.areaScaleFactor,
        annualTotalsRaw: {
          Q_H_total: raw.heating,
          Q_C_total: raw.cooling,
          Q_HC_total: raw.hvac,
          deliveredTotal: raw.deliveredTotal,
        },
        scaled: {
          heatingDemand: scaled.heating,
          coolingDemand: scaled.cooling,
          hvacTotal: scaled.hvac,
          deliveredTotal: scaled.deliveredTotal,
          carrierBreakdown: scaled.carrierBreakdown,
          primaryEnergy: scaled.primaryEnergy,
        },
        energyIntensity: baseline.trace.epcIntensity,
        uniTotalsAvailable: raw.deliveredTotal !== undefined,
        uniSummary: baseline.trace.uniSummary,
        comfortIndex,
        flexibilityIndex,
        validationNoteCount: validationNotes?.length ?? 0,
      },
      auditCtx,
    );

    return {
      baseline,
      flexibilityIndex: Math.round(flexibilityIndex),
      comfortIndex: Math.round(comfortIndex),
      simulated,
      matchStrategy,
      ...(validationNotes && validationNotes.length > 0
        ? { validationNotes }
        : {}),
      ...(referenceBaseline ? { referenceBaseline } : {}),
    };
  }

  /**
   * Estimate energy needs and consumption based on building characteristics.
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
  ): Promise<EstimationResult> {
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

    try {
      const archetypeDetails = await this.buildingService.getArchetypeDetails({
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      });
      const archetypeRef = {
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      };
      const modeledFloorArea = building.floorArea || DEFAULT_FLOOR_AREA;
      const modifications = building.modifications;
      const matchingGeometryOnly =
        modifications &&
        Object.entries(modifications).every(
          ([key, value]) =>
            (key === "floorArea" && value === archetypeDetails.floorArea) ||
            (key === "numberOfFloors" &&
              value === archetypeDetails.numberOfFloors),
        );

      if (building.isModified && modifications && !matchingGeometryOnly) {
        const localValidation = validateModifications(
          modifications,
          archetypeDetails,
        );
        if (!localValidation.isValid) {
          throw new APIResponseError(
            localValidation.errors.map((error) => error.message).join(" "),
          );
        }

        const { bui, system } = applyAllModifications(
          archetypeDetails,
          modifications,
        );
        const validationResponse = await forecasting.validateCustomBuilding({
          bui,
          system,
        });

        // Use backend-validated payloads for simulation.
        // The backend auto-corrects minor issues and returns the fixed versions.
        const validatedBui = validationResponse.bui_checked ?? bui;
        const validatedSystem = validationResponse.system_checked ?? system;
        auditLog.debug(
          "energy",
          "energy.archetype.details",
          {
            catalogueBui: archetypeDetails.bui,
            modifiedBui: validatedBui as BuildingPayload,
            uni11300Config: archetypeDetails.uni11300Config,
          },
          auditCtx,
        );

        const simulated: SimulatedBuilding = {
          archetype: archetypeRef,
          bui: validatedBui as BuildingPayload,
          adjustment: {
            system: validatedSystem,
            uni11300Config: archetypeDetails.uni11300Config,
          },
          modeledFloorArea,
        };
        // The catalogue archetype scaled to the same share of the home.
        const reference: SimulatedBuilding = {
          archetype: archetypeRef,
          bui: archetypeDetails.bui,
          modeledFloorArea:
            archetypeDetails.floorArea * energyScaleFactor(simulated),
        };

        const [customSimulation, referenceSimulation] = await Promise.all([
          simulateEcmBaseline(simulated),
          this.simulateArchetype(reference),
        ]);

        const { baseline: referenceBaseline } =
          this.buildEstimationFromSimulation({
            simulationResponse: referenceSimulation,
            simulated: reference,
            matchStrategy,
            building: {
              ...building,
              floorArea: reference.modeledFloorArea,
            },
            auditCtx,
          });

        const validationNotes = [
          ...validationResponse.bui_issues,
          ...validationResponse.system_messages,
        ];

        const result = this.buildEstimationFromSimulation({
          simulationResponse: customSimulation,
          simulated,
          matchStrategy,
          building,
          validationNotes,
          referenceBaseline,
          auditCtx,
        });
        auditLog.info(
          "energy",
          "energy.estimate.end",
          {
            annualEnergyNeeds: result.baseline.thermalNeed,
            heatingCoolingNeeds: result.baseline.thermalNeed,
            deliveredTotal: result.baseline.deliveredTotal,
            primaryEnergy: result.baseline.primaryEnergy,
            archetypeFloorArea: simulatedFloorArea(simulated),
            roofArea: surfaceAreasFromBui(simulated.bui).roofM2,
            modified: true,
          },
          auditCtx,
        );
        return result;
      }

      auditLog.debug(
        "energy",
        "energy.archetype.details",
        {
          catalogueBui: archetypeDetails.bui,
          modifiedBui: undefined,
          uni11300Config: archetypeDetails.uni11300Config,
        },
        auditCtx,
      );

      const simulated: SimulatedBuilding = {
        archetype: archetypeRef,
        bui: archetypeDetails.bui,
        modeledFloorArea,
      };
      const simulationResponse = await this.simulateArchetype(simulated);

      const result = this.buildEstimationFromSimulation({
        simulationResponse,
        simulated,
        matchStrategy,
        building,
        auditCtx,
      });
      auditLog.info(
        "energy",
        "energy.estimate.end",
        {
          annualEnergyNeeds: result.baseline.thermalNeed,
          heatingCoolingNeeds: result.baseline.thermalNeed,
          deliveredTotal: result.baseline.deliveredTotal,
          primaryEnergy: result.baseline.primaryEnergy,
          archetypeFloorArea: simulatedFloorArea(simulated),
          roofArea: surfaceAreasFromBui(simulated.bui).roofM2,
          modified: false,
        },
        auditCtx,
      );
      return result;
    } catch (error) {
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
