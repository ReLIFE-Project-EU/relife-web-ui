/**
 * Renovation Service - Real Forecasting API Implementation
 *
 * Provides renovation scenario evaluation using the Forecasting API's
 * ECM (Energy Conservation Measures) application endpoint.
 *
 * Currently Supported Measures:
 * - Wall insulation (via u_wall parameter)
 * - Roof insulation (via u_roof parameter)
 * - Window replacement (via u_window parameter)
 *
 * Not Yet Supported (API pending):
 * - Floor insulation (excluded - not feasible per Forecasting team)
 * - Heat pump (generator parameter coming)
 * - Condensing boiler (generator parameter coming)
 * - PV panels (pv-system parameter coming)
 * - Solar thermal (pv-system parameter coming)
 */

import { forecasting } from "../api";
import type {
  BuildingInfo,
  EstimationResult,
  RenovationScenario,
  RenovationMeasureId,
  ScenarioId,
} from "../types/renovation";
import {
  DEFAULT_FLOOR_AREA,
  ENERGY_PRICE_EUR_PER_KWH,
  NON_HVAC_ENERGY_MULTIPLIER,
  calculateAnnualTotals,
  getEPCClass,
  transformColumnarToRowFormat,
} from "./energyUtils";
import {
  MEASURE_CATEGORIES,
  RENOVATION_MEASURES,
} from "./mock/data/renovationMeasures";
import type { IRenovationService, RenovationMeasure } from "./types";

// =============================================================================
// Constants
// =============================================================================

/**
 * Target U-values for envelope renovation measures (W/m²K).
 * These represent typical "deep renovation" targets.
 *
 * TODO: Consider making these country-specific based on national regulations.
 */
const U_VALUE_TARGETS: Partial<Record<RenovationMeasureId, number>> = {
  "wall-insulation": 0.25,
  "roof-insulation": 0.2,
  windows: 1.4,
};

/**
 * Mapping from HRA measure IDs to ECM API element names.
 */
const MEASURE_TO_ELEMENT: Partial<Record<RenovationMeasureId, string>> = {
  "wall-insulation": "wall",
  "roof-insulation": "roof",
  windows: "window",
};

/**
 * Envelope measure IDs that are supported by the ECM API.
 */
const SUPPORTED_ENVELOPE_MEASURES: RenovationMeasureId[] = [
  "wall-insulation",
  "roof-insulation",
  "windows",
];

// =============================================================================
// Service Implementation
// =============================================================================

export class RenovationService implements IRenovationService {
  // ---------------------------------------------------------------------------
  // Measure Accessors
  // ---------------------------------------------------------------------------

  getMeasures(): RenovationMeasure[] {
    return RENOVATION_MEASURES;
  }

  getMeasuresByCategory(
    category: "envelope" | "systems" | "renewable",
  ): RenovationMeasure[] {
    return RENOVATION_MEASURES.filter((m) => m.category === category);
  }

  getMeasure(id: RenovationMeasureId): RenovationMeasure | undefined {
    return RENOVATION_MEASURES.find((m) => m.id === id);
  }

  getSupportedMeasures(): RenovationMeasure[] {
    return RENOVATION_MEASURES.filter((m) => m.isSupported);
  }

  getCategories() {
    return MEASURE_CATEGORIES;
  }

  // ---------------------------------------------------------------------------
  // Scenario Evaluation
  // ---------------------------------------------------------------------------

  async evaluateScenarios(
    building: BuildingInfo,
    estimation: EstimationResult,
    selectedMeasures: RenovationMeasureId[],
  ): Promise<RenovationScenario[]> {
    // Filter to supported envelope measures only
    const envelopeMeasures = selectedMeasures.filter((m) =>
      SUPPORTED_ENVELOPE_MEASURES.includes(m),
    );

    if (envelopeMeasures.length === 0) {
      // No supported measures selected - return baseline only
      return [this.buildBaselineScenario(estimation)];
    }

    // Use archetype matched during baseline estimation (Step 1)
    if (!estimation.archetype) {
      throw new Error("Missing archetype on baseline estimation result");
    }

    const archetype = estimation.archetype;

    // Map measures to API elements
    const elements = envelopeMeasures
      .map((m) => MEASURE_TO_ELEMENT[m])
      .filter((e): e is string => e !== undefined)
      .join(",");

    // Build API parameters (single-scenario mode)
    const params: {
      category: string;
      country: string;
      name: string;
      scenario_elements: string;
      u_wall?: number;
      u_roof?: number;
      u_window?: number;
    } = {
      category: archetype.category,
      country: archetype.country,
      name: archetype.name,
      scenario_elements: elements,
    };

    // Add U-values for selected measures
    if (envelopeMeasures.includes("wall-insulation")) {
      params.u_wall = U_VALUE_TARGETS["wall-insulation"];
    }
    if (envelopeMeasures.includes("roof-insulation")) {
      params.u_roof = U_VALUE_TARGETS["roof-insulation"];
    }
    if (envelopeMeasures.includes("windows")) {
      params.u_window = U_VALUE_TARGETS["windows"];
    }

    // Call ECM API (single-scenario mode)
    const ecmResponse = await forecasting.simulateECM(params);

    // Extract renovated scenario
    // In single-scenario mode, the array contains one scenario corresponding to the requested elements
    const renovatedScenario = ecmResponse.scenarios[0];

    if (!renovatedScenario) {
      throw new Error("ECM API did not return a renovated scenario");
    }

    // Validate response structure
    if (!renovatedScenario.results) {
      throw new Error(
        "ECM API response missing 'results' field. Response: " +
          JSON.stringify(renovatedScenario),
      );
    }

    if (!renovatedScenario.results.hourly_building) {
      throw new Error(
        "ECM API response missing 'results.hourly_building' field. Response: " +
          JSON.stringify(renovatedScenario.results),
      );
    }

    // Transform columnar format (ECM API) to row format for processing
    // ECM API returns: { Q_HC: [1,2,3], Q_H: [...] }
    // We need: [ {Q_HC:1, Q_H:...}, {Q_HC:2, ...}, ... ]
    const hourlyRecords = transformColumnarToRowFormat(
      renovatedScenario.results.hourly_building,
    );

    // Calculate renovated HVAC energy from hourly data
    const renovatedTotals = calculateAnnualTotals(hourlyRecords);
    const renovatedHvacEnergy = renovatedTotals.Q_HC_total;

    // Scale by floor area ratio (archetype vs user building)
    // TODO: Store archetype area in EstimationResult to avoid assuming DEFAULT_FLOOR_AREA
    const userArea = building.floorArea || DEFAULT_FLOOR_AREA;
    const archetypeArea = DEFAULT_FLOOR_AREA;
    const areaScaleFactor = userArea / archetypeArea;

    const scaledRenovatedHvac = renovatedHvacEnergy * areaScaleFactor;
    const renovatedTotalEnergy =
      scaledRenovatedHvac * NON_HVAC_ENERGY_MULTIPLIER;
    const renovatedIntensity = renovatedTotalEnergy / userArea;

    // Build response scenarios
    const currentScenario = this.buildBaselineScenario(estimation);

    const renovatedScenarioResult: RenovationScenario = {
      id: "renovated" as ScenarioId,
      label: "After Renovation",
      epcClass: getEPCClass(renovatedIntensity),
      annualEnergyNeeds: Math.round(renovatedTotalEnergy),
      annualEnergyCost: Math.round(
        renovatedTotalEnergy * ENERGY_PRICE_EUR_PER_KWH,
      ),
      heatingCoolingNeeds: Math.round(scaledRenovatedHvac),
      comfortIndex: Math.min(100, estimation.comfortIndex + 5),
      flexibilityIndex: estimation.flexibilityIndex,
      measures: envelopeMeasures.map((m) => this.getMeasure(m)?.name || m),
    };

    return [currentScenario, renovatedScenarioResult];
  }

  private buildBaselineScenario(
    estimation: EstimationResult,
  ): RenovationScenario {
    return {
      id: "current" as ScenarioId,
      label: "Current Status",
      epcClass: estimation.estimatedEPC,
      annualEnergyNeeds: estimation.annualEnergyNeeds,
      annualEnergyCost: estimation.annualEnergyCost,
      heatingCoolingNeeds: estimation.heatingCoolingNeeds,
      flexibilityIndex: estimation.flexibilityIndex,
      comfortIndex: estimation.comfortIndex,
      measures: [],
    };
  }
}
