/**
 * Portfolio Analysis Service
 *
 * Batch orchestration of energy estimation, renovation evaluation,
 * and financial analysis for multiple buildings with concurrency control.
 */

import type {
  IEnergyService,
  IFinancialService,
  IRenovationService,
} from "../../../services/types";
import type {
  BuildingInfo,
  FundingOptions,
  RenovationMeasureId,
} from "../../../types/renovation";
import { deriveConstructionPeriod } from "../../../utils/apiMappings";
import { PRA_CONCURRENCY_LIMIT } from "../constants";
import type { FinancingScheme } from "../constants";
import type {
  BuildingAnalysisResult,
  PRABuilding,
  PRAFinancialResults,
} from "../context/types";
import type { IPortfolioAnalysisService } from "./types";

export class PortfolioAnalysisService implements IPortfolioAnalysisService {
  private readonly energy: IEnergyService;
  private readonly renovation: IRenovationService;
  private readonly financial: IFinancialService;

  constructor(
    energy: IEnergyService,
    renovation: IRenovationService,
    financial: IFinancialService,
  ) {
    this.energy = energy;
    this.renovation = renovation;
    this.financial = financial;
  }

  async analyzePortfolio(
    buildings: PRABuilding[],
    selectedMeasures: RenovationMeasureId[],
    _financingScheme: FinancingScheme,
    funding: FundingOptions,
    projectLifetime: number,
    onProgress: (completed: number, total: number, current: string) => void,
    globalCapex?: number | null,
    globalMaintenanceCost?: number | null,
  ): Promise<Record<string, BuildingAnalysisResult>> {
    const results: Record<string, BuildingAnalysisResult> = {};
    let completed = 0;

    // Process in batches of PRA_CONCURRENCY_LIMIT
    const queue = [...buildings];
    while (queue.length > 0) {
      const batch = queue.splice(0, PRA_CONCURRENCY_LIMIT);
      const batchResults = await Promise.allSettled(
        batch.map((b) =>
          this.analyzeBuilding(b, selectedMeasures, funding, projectLifetime, globalCapex, globalMaintenanceCost),
        ),
      );

      for (let i = 0; i < batch.length; i++) {
        const building = batch[i];
        const result = batchResults[i];
        completed++;

        if (result.status === "fulfilled") {
          results[building.id] = {
            ...result.value,
            buildingId: building.id,
          };
        } else {
          results[building.id] = {
            buildingId: building.id,
            status: "error",
            error: String(result.reason),
          };
        }

        onProgress(completed, buildings.length, building.name);
      }
    }

    return results;
  }

  /**
   * Full analysis pipeline for a single building:
   * 1. Convert PRABuilding to BuildingInfo
   * 2. Estimate EPC via energy service
   * 3. Evaluate renovation scenarios
   * 4. Calculate financial results for all scenarios
   */
  private async analyzeBuilding(
    building: PRABuilding,
    selectedMeasures: RenovationMeasureId[],
    funding: FundingOptions,
    projectLifetime: number,
    globalCapex?: number | null,
    globalMaintenanceCost?: number | null,
  ): Promise<BuildingAnalysisResult> {
    const buildingInfo = this.toBuildingInfo(building, projectLifetime);

    // Step 1: Estimate EPC
    const estimation = await this.energy.estimateEPC(buildingInfo);

    // Step 2: Evaluate renovation scenarios
    const scenarios = await this.renovation.evaluateScenarios(
      buildingInfo,
      estimation,
      selectedMeasures,
    );

    // Step 3: Calculate financial results
    // Per-building values take precedence; fall back to global overrides
    const capex = building.estimatedCapex ?? globalCapex ?? null;
    const maintenanceCost = building.annualMaintenanceCost ?? globalMaintenanceCost ?? null;

    const financialResults = await this.financial.calculateForAllScenarios(
      scenarios,
      funding,
      building.floorArea,
      estimation,
      "baseline",
      capex,
      maintenanceCost,
      buildingInfo,
    );

    // Enhance results with professional-level data if available
    const renovatedResults = financialResults["renovated"];
    let praFinancialResults: PRAFinancialResults | undefined;

    if (renovatedResults) {
      praFinancialResults = { ...renovatedResults };

      // Extract probabilities from risk assessment metadata if present
      const metadata = renovatedResults.riskAssessment?.metadata;
      if (metadata) {
        const probabilities: Record<string, number> = {};
        for (const [key, value] of Object.entries(metadata)) {
          if (key.startsWith("Pr(") && typeof value === "number") {
            probabilities[key] = value;
          }
        }
        if (Object.keys(probabilities).length > 0) {
          praFinancialResults.probabilities = probabilities;
        }
      }
    }

    return {
      buildingId: building.id,
      status: "success",
      estimation,
      scenarios,
      financialResults: praFinancialResults,
    };
  }

  /**
   * Convert PRABuilding to BuildingInfo for shared services.
   */
  private toBuildingInfo(
    b: PRABuilding,
    projectLifetime: number,
  ): BuildingInfo {
    const hasModifications =
      b.modifications && Object.keys(b.modifications).length > 0;

    return {
      country: b.country,
      lat: b.lat,
      lng: b.lng,
      buildingType: b.propertyType,
      constructionPeriod: deriveConstructionPeriod(b.constructionYear),
      selectedArchetype: b.archetypeName
        ? { name: b.archetypeName, category: b.category, country: b.country }
        : undefined,
      isModified: hasModifications ? true : false,
      modifications: hasModifications ? b.modifications : undefined,
      floorArea: b.floorArea,
      numberOfFloors: b.numberOfFloors,
      climateZone: "",
      heatingTechnology: "",
      coolingTechnology: "",
      hotWaterTechnology: "",
      numberOfOpenings: null,
      glazingTechnology: "",
      constructionYear: b.constructionYear,
      floorNumber: b.floorNumber ?? null,
      projectLifetime,
      renovatedLast5Years: true,
    };
  }
}
