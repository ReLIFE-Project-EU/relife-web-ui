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
  RenovationPackage,
} from "../../../types/renovation";
import { deriveConstructionYear } from "../../../utils/apiMappings";
import { PRA_CONCURRENCY_LIMIT } from "../constants";
import type {
  BuildingAnalysisResult,
  PRABuilding,
  PRAFinancialResults,
} from "../context/types";
import type {
  IPortfolioAnalysisService,
  PortfolioAnalysisRequest,
} from "./types";

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
    request: PortfolioAnalysisRequest,
  ): Promise<Record<string, BuildingAnalysisResult>> {
    const {
      buildings,
      selectedMeasures,
      financingScheme,
      funding,
      projectLifetime,
      onProgress,
      globalCapex,
      globalMaintenanceCost,
    } = request;
    void financingScheme;
    const results: Record<string, BuildingAnalysisResult> = {};
    let completed = 0;

    // Process in batches of PRA_CONCURRENCY_LIMIT
    const queue = [...buildings];
    while (queue.length > 0) {
      const batch = queue.splice(0, PRA_CONCURRENCY_LIMIT);
      const batchResults = await Promise.allSettled(
        batch.map((b) =>
          this.analyzeBuilding(
            b,
            b.selectedMeasures ?? selectedMeasures,
            funding,
            projectLifetime,
            globalCapex,
            globalMaintenanceCost,
          ),
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
    const renovatedMeasures = selectedMeasures.filter((measureId) =>
      this.renovation.isAnalysisEligibleMeasure(measureId),
    );

    if (selectedMeasures.length === 0) {
      throw new Error(
        "Portfolio analysis requires at least one selected renovation measure per building.",
      );
    }

    if (renovatedMeasures.length === 0) {
      throw new Error(
        "Portfolio analysis requires at least one analyzable measure per building. Supported measures are wall, roof, floor, windows, condensing boiler, and air-water heat pump.",
      );
    }

    if (this.hasMultipleSystemMeasures(renovatedMeasures)) {
      throw new Error(
        "Portfolio analysis currently supports at most one system upgrade per building. Select either condensing boiler or air-water heat pump, not both.",
      );
    }

    const packages: RenovationPackage[] =
      renovatedMeasures.length > 0
        ? [
            {
              id: "renovated",
              label: "After Renovation",
              measureIds: renovatedMeasures,
            },
          ]
        : [];
    const scenarios = await this.renovation.evaluateScenarios(
      buildingInfo,
      estimation,
      packages,
    );

    // Step 3: Calculate financial results
    // Per-building values take precedence; fall back to global overrides
    const capex = building.estimatedCapex ?? globalCapex ?? null;
    const maintenanceCost =
      building.annualMaintenanceCost ?? globalMaintenanceCost ?? null;

    const financialResults = await this.financial.calculateForAllScenarios({
      scenarios,
      fundingOptions: funding,
      floorArea: building.floorArea,
      currentEstimation: estimation,
      packageFinancialInputs: {
        renovated: {
          capex,
          annualMaintenanceCost: maintenanceCost,
        },
      },
      building: buildingInfo,
    });

    // Enhance results with professional-level data if available
    const renovatedResults = financialResults["renovated"];
    let praFinancialResults: PRAFinancialResults | undefined;

    if (renovatedResults) {
      praFinancialResults = { ...renovatedResults };

      // Prefer the dedicated probabilities field mapped by FinancialService
      const riskAssessment = renovatedResults.riskAssessment;
      if (
        riskAssessment?.probabilities &&
        Object.keys(riskAssessment.probabilities).length > 0
      ) {
        praFinancialResults.probabilities = riskAssessment.probabilities;
      } else {
        // Fallback: mine Pr(*) keys from metadata for backward compatibility
        const metadata = riskAssessment?.metadata;
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
    }

    return {
      buildingId: building.id,
      status: "success",
      estimation,
      scenarios,
      financialResults: praFinancialResults,
    };
  }

  private hasMultipleSystemMeasures(
    measureIds: RenovationMeasureId[],
  ): boolean {
    const systemMeasureIds: RenovationMeasureId[] = [
      "condensing-boiler",
      "air-water-heat-pump",
    ];

    return (
      measureIds.filter((measureId) => systemMeasureIds.includes(measureId))
        .length > 1
    );
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
      constructionPeriod: b.constructionPeriod,
      selectedArchetype: b.archetypeName
        ? {
            name: b.archetypeName,
            category: b.category,
            country: b.archetypeCountry ?? b.country,
          }
        : undefined,
      isModified: !!hasModifications,
      modifications: hasModifications ? b.modifications : undefined,
      floorArea: b.floorArea,
      numberOfFloors: b.numberOfFloors,
      climateZone: "",
      heatingTechnology: "",
      coolingTechnology: "",
      hotWaterTechnology: "",
      numberOfOpenings: null,
      glazingTechnology: "",
      constructionYear: deriveConstructionYear(b.constructionPeriod),
      floorNumber: b.floorNumber ?? null,
      projectLifetime,
      renovatedLast5Years: true,
    };
  }
}
