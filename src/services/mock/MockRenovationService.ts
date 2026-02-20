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
    selectedMeasures: RenovationMeasureId[],
  ): Promise<RenovationScenario[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_RENOVATION));

    const scenarios: RenovationScenario[] = [];

    // Current scenario (baseline) - this is real data from energy estimation
    const currentScenario: RenovationScenario = {
      id: "current",
      label: "Current Status",
      epcClass: estimation.estimatedEPC,
      annualEnergyNeeds: estimation.annualEnergyNeeds,
      annualEnergyCost: estimation.annualEnergyCost,
      heatingCoolingNeeds: estimation.heatingCoolingNeeds,
      flexibilityIndex: estimation.flexibilityIndex,
      comfortIndex: estimation.comfortIndex,
      measures: [],
    };
    scenarios.push(currentScenario);

    // Only add renovated scenario if measures are selected
    if (selectedMeasures.length > 0) {
      const measures = selectedMeasures
        .map((id) => this.getMeasure(id))
        .filter((m): m is RenovationMeasure => m !== undefined);

      // PLACEHOLDER DATA - In production, these values come from Forecasting API
      // The API performs actual building energy simulation to calculate:
      // - annual_energy_savings (kWh/year)
      // - energy_class (EPC label after renovation)
      // - Other outputs as defined by the Forecasting team
      const renovatedScenario: RenovationScenario = {
        id: "renovated",
        label: "After Renovation",
        // Placeholder: Real EPC comes from Forecasting API
        epcClass: "TBD",
        // Placeholder: Real values come from Forecasting API simulation
        annualEnergyNeeds: 0,
        annualEnergyCost: 0,
        heatingCoolingNeeds: 0,
        flexibilityIndex: 0,
        comfortIndex: 0,
        measures: measures.map((m) => m.name),
      };

      scenarios.push(renovatedScenario);
    }

    return scenarios;
  }
}

// Export singleton instance
export const mockRenovationService: IRenovationService =
  new MockRenovationService();
