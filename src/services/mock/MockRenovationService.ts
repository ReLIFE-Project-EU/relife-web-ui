/**
 * Mock Renovation Service
 * Provides renovation measures and scenario evaluation.
 *
 * NOTE: In production, scenario evaluation should call the Forecasting API
 * to get actual energy_savings and energy_class values based on building simulation.
 * This mock returns placeholder data for UI development purposes.
 */

import type {
  BuildingInfo,
  EstimationResult,
  RenovationMeasureId,
  RenovationPackage,
  RenovationScenario,
} from "../../types/renovation";
import type {
  IRenovationService,
  MeasureCategory,
  MeasureCategoryInfo,
  RenovationMeasure,
} from "../types";
import { MOCK_DELAY_RENOVATION } from "./constants";
import {
  MEASURE_CATEGORIES,
  RENOVATION_MEASURES,
} from "./data/renovationMeasures";

const ANALYSIS_ELIGIBLE_MEASURE_IDS: RenovationMeasureId[] = [
  "wall-insulation",
  "roof-insulation",
  "windows",
  "floor-insulation",
  "condensing-boiler",
  "air-water-heat-pump",
];

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class MockRenovationService implements IRenovationService {
  getMeasures(): RenovationMeasure[] {
    return RENOVATION_MEASURES;
  }

  getMeasure(measureId: RenovationMeasureId): RenovationMeasure | undefined {
    return RENOVATION_MEASURES.find((m) => m.id === measureId);
  }

  getMeasuresByCategory(category: MeasureCategory): RenovationMeasure[] {
    return RENOVATION_MEASURES.filter((m) => m.category === category);
  }

  getCategories(): MeasureCategoryInfo[] {
    return MEASURE_CATEGORIES;
  }

  getSupportedMeasures(): RenovationMeasure[] {
    return RENOVATION_MEASURES.filter((m) => m.isSupported);
  }

  getRankableMeasures(): RenovationMeasure[] {
    return this.getSupportedMeasures().filter(
      (measure) => measure.category === "envelope",
    );
  }

  getAnalysisEligibleMeasures(): RenovationMeasure[] {
    return ANALYSIS_ELIGIBLE_MEASURE_IDS.map((measureId) =>
      this.getMeasure(measureId),
    ).filter((measure): measure is RenovationMeasure => measure !== undefined);
  }

  isAnalysisEligibleMeasure(measureId: RenovationMeasureId): boolean {
    return ANALYSIS_ELIGIBLE_MEASURE_IDS.includes(measureId);
  }

  suggestPackages(
    selectedMeasures: RenovationMeasureId[],
  ): RenovationPackage[] {
    const selectedRankableMeasures = this.getRankableMeasures()
      .map((measure) => measure.id)
      .filter((measureId) => selectedMeasures.includes(measureId));

    const packages = selectedRankableMeasures.map((measureId) => ({
      id: `package-${measureId}`,
      label: this.getMeasure(measureId)?.name ?? measureId,
      measureIds: [measureId],
    }));

    if (selectedRankableMeasures.length >= 2) {
      packages.push({
        id: `package-${selectedRankableMeasures.join("-")}`,
        label: "Envelope package",
        measureIds: selectedRankableMeasures,
      });
    }

    if (selectedMeasures.includes("condensing-boiler")) {
      packages.push({
        id: "scenario-condensing-boiler",
        label: "Condensing Boiler",
        measureIds: ["condensing-boiler"],
      });
    }

    if (selectedMeasures.includes("air-water-heat-pump")) {
      packages.push({
        id: "scenario-air-water-heat-pump",
        label: "Air-Water Heat Pump",
        measureIds: ["air-water-heat-pump"],
      });
    }

    if (
      selectedRankableMeasures.length > 0 &&
      selectedMeasures.includes("condensing-boiler")
    ) {
      packages.push({
        id: `package-${selectedRankableMeasures.join("-")}-condensing-boiler`,
        label: "Envelope package + Condensing Boiler",
        measureIds: [...selectedRankableMeasures, "condensing-boiler"],
      });
    }

    if (
      selectedRankableMeasures.length > 0 &&
      selectedMeasures.includes("air-water-heat-pump")
    ) {
      packages.push({
        id: `package-${selectedRankableMeasures.join("-")}-air-water-heat-pump`,
        label: "Envelope package + Air-Water Heat Pump",
        measureIds: [...selectedRankableMeasures, "air-water-heat-pump"],
      });
    }

    return packages;
  }

  /**
   * Evaluate renovation scenarios based on selected measures.
   *
   * TODO: In production, this should call the Forecasting API:
   * - POST /[endpoint] with building data + selected measures
   * - Receive: annual_energy_savings, energy_class (EPC), etc.
   *
   * Currently returns placeholder data for UI development.
   * The "renovated" scenario values are NOT real calculations.
   */
  async evaluateScenarios(
    _building: BuildingInfo,
    estimation: EstimationResult,
    packages: RenovationPackage[],
  ): Promise<RenovationScenario[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_RENOVATION));

    const scenarios: RenovationScenario[] = [];

    // Current scenario (baseline) - this is real data from energy estimation
    const currentScenario: RenovationScenario = {
      id: "current",
      packageId: null,
      label: "Current Status",
      epcClass: estimation.estimatedEPC,
      annualEnergyNeeds: estimation.annualEnergyNeeds,
      annualEnergyCost: estimation.annualEnergyCost,
      heatingCoolingNeeds: estimation.heatingCoolingNeeds,
      flexibilityIndex: estimation.flexibilityIndex,
      comfortIndex: estimation.comfortIndex,
      measureIds: [],
      measures: [],
    };
    scenarios.push(currentScenario);

    scenarios.push(
      ...packages.map((renovationPackage, index) => {
        const measures = renovationPackage.measureIds
          .map((id) => this.getMeasure(id))
          .filter((m): m is RenovationMeasure => m !== undefined);

        return {
          id: renovationPackage.id,
          packageId: renovationPackage.id,
          label: renovationPackage.label,
          epcClass: "TBD",
          annualEnergyNeeds: Math.max(
            0,
            estimation.annualEnergyNeeds - 1000 * (index + 1),
          ),
          annualEnergyCost: Math.max(
            0,
            estimation.annualEnergyCost - 250 * (index + 1),
          ),
          heatingCoolingNeeds: Math.max(
            0,
            estimation.heatingCoolingNeeds - 1000 * (index + 1),
          ),
          flexibilityIndex: estimation.flexibilityIndex,
          comfortIndex: Math.min(
            100,
            estimation.comfortIndex + 2 * (index + 1),
          ),
          measureIds: renovationPackage.measureIds,
          measures: measures.map((measure) => measure.name),
        };
      }),
    );

    return scenarios;
  }
}

// Export singleton instance
export const mockRenovationService: IRenovationService =
  new MockRenovationService();
