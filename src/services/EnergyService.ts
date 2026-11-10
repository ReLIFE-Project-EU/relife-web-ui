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
import type {
  BuildingModifications,
  BuildingPayload,
} from "../types/archetype";
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
import { countryNamesEqual } from "../utils/countries";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import { ArchetypeMatchStrategy } from "./archetypeMatching";

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
  private readonly archetypeSimulationCache = new Map<
    string,
    Promise<ECMScenario>
  >();
  private readonly buildingService: IBuildingService;

  constructor(buildingService: IBuildingService) {
    this.buildingService = buildingService;
  }

  /** The catalogue, read through the building service's cache. */
  private async getArchetypes(): Promise<ArchetypeInfo[]> {
    try {
      return await this.buildingService.getArchetypes();
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

  /** Auto-match for a building with no selected archetype, by the map rule. */
  private async findMatchingArchetype(
    building: BuildingInfo,
    auditCtx?: AuditCtx,
  ): Promise<ResolvedArchetype> {
    const match = await this.buildingService.findMatchingArchetype(
      building.buildingType,
      building.constructionPeriod,
      building.lat !== null && building.lng !== null
        ? { lat: building.lat, lng: building.lng }
        : null,
      building.country,
    );
    if (!match) {
      throw new ArchetypeNotAvailableError(
        building.country,
        building.buildingType,
      );
    }

    const { countryScore, periodScore } = match.scoreBreakdown;
    const strategy =
      countryScore < 1
        ? ArchetypeMatchStrategy.OTHER_COUNTRY
        : periodScore < 1
          ? ArchetypeMatchStrategy.EXACT_CATEGORY_PERIOD_MISMATCH
          : ArchetypeMatchStrategy.EXACT_FULL;

    if (strategy !== ArchetypeMatchStrategy.EXACT_FULL) {
      auditLog.warn(
        "energy",
        "energy.archetype.fallback",
        {
          reason: strategy,
          requested: {
            country: building.country,
            category: building.buildingType,
            period: building.constructionPeriod,
          },
          chosen: match.archetype,
        },
        auditCtx,
      );
    }

    return { archetype: match.archetype, strategy };
  }

  private buildEstimationFromSimulation(params: {
    simulationResponse: ECMScenario;
    simulated: SimulatedBuilding;
    matchStrategy: ArchetypeMatchStrategy;
    validationNotes?: string[];
    referenceBaseline?: ScenarioEnergy;
    auditCtx?: AuditCtx;
  }): EstimationResult {
    const {
      simulationResponse,
      simulated,
      matchStrategy,
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
        validationNoteCount: validationNotes?.length ?? 0,
      },
      auditCtx,
    );

    return {
      baseline,
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
          ? (Object.keys(
              building.modifications,
            ) as (keyof BuildingModifications)[])
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
