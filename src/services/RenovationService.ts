/**
 * Renovation Service - Forecasting API implementation for HRA/PRA package
 * evaluation. The current comparison workflow is envelope-only.
 */

import { forecasting } from "../api";
import type {
  ECMApplicationParams,
  ECMArchetypeParams,
  ECMScenario,
  ECMCustomBuildingParams,
} from "../types/forecasting";
import type {
  BuildingInfo,
  EstimationResult,
  RenovationMeasureId,
  RenovationPackage,
  RenovationScenario,
} from "../types/renovation";
import {
  DEFAULT_FLOOR_AREA,
  calculateAnnualTotals,
  estimateAnnualHvacEnergyCost,
  extractUniTotals,
  getEPCClass,
  transformColumnarToRowFormat,
} from "./energyUtils";
import {
  MEASURE_CATEGORIES,
  RENOVATION_MEASURES,
} from "./mock/data/renovationMeasures";
import type { IRenovationService, RenovationMeasure } from "./types";

const U_VALUE_TARGETS: Partial<Record<RenovationMeasureId, number>> = {
  "wall-insulation": 0.25,
  "roof-insulation": 0.2,
  "floor-insulation": 0.25,
  windows: 1.4,
};

const MEASURE_TO_ELEMENT: Partial<Record<RenovationMeasureId, string>> = {
  "wall-insulation": "wall",
  "roof-insulation": "roof",
  "floor-insulation": "slab",
  windows: "window",
};

const RANKABLE_MEASURE_PRIORITY: RenovationMeasureId[] = [
  "wall-insulation",
  "roof-insulation",
  "windows",
  "floor-insulation",
];

const MAX_SUGGESTED_PACKAGES = 5;
const DIRECT_SYSTEM_SCENARIOS: RenovationMeasureId[] = ["condensing-boiler"];

export class RenovationService implements IRenovationService {
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

  getRankableMeasures(): RenovationMeasure[] {
    return RANKABLE_MEASURE_PRIORITY.map((id) => this.getMeasure(id)).filter(
      (measure): measure is RenovationMeasure => measure !== undefined,
    );
  }

  getCategories() {
    return MEASURE_CATEGORIES;
  }

  suggestPackages(
    selectedMeasures: RenovationMeasureId[],
  ): RenovationPackage[] {
    const selectedRankableMeasures = RANKABLE_MEASURE_PRIORITY.filter((id) =>
      selectedMeasures.includes(id),
    );

    const packages: RenovationPackage[] = [];

    for (const measureId of selectedRankableMeasures) {
      packages.push(this.createPackage([measureId]));
    }

    if (selectedRankableMeasures.length >= 2) {
      packages.push(this.createPackage(selectedRankableMeasures));
    }

    for (const measureId of DIRECT_SYSTEM_SCENARIOS) {
      if (selectedMeasures.includes(measureId)) {
        packages.push(this.createDirectScenario(measureId));
      }
    }

    return dedupePackages(packages).slice(0, MAX_SUGGESTED_PACKAGES);
  }

  async evaluateScenarios(
    building: BuildingInfo,
    estimation: EstimationResult,
    packages: RenovationPackage[],
  ): Promise<RenovationScenario[]> {
    const baselineScenario = this.buildBaselineScenario(estimation);

    if (packages.length === 0) {
      return [baselineScenario];
    }

    if (!estimation.archetype) {
      throw new Error("Missing archetype on baseline estimation result");
    }

    const packageScenarios = await Promise.all(
      packages.map((pkg) =>
        this.evaluatePackageScenario(building, estimation, pkg),
      ),
    );

    return [baselineScenario, ...packageScenarios];
  }

  private createPackage(measureIds: RenovationMeasureId[]): RenovationPackage {
    const sortedMeasureIds = RANKABLE_MEASURE_PRIORITY.filter((id) =>
      measureIds.includes(id),
    );

    return {
      id: `package-${sortedMeasureIds.join("-")}`,
      label:
        sortedMeasureIds.length === 1
          ? (this.getMeasure(sortedMeasureIds[0])?.name ?? sortedMeasureIds[0])
          : "Envelope package",
      measureIds: sortedMeasureIds,
    };
  }

  private createDirectScenario(measureId: RenovationMeasureId): RenovationPackage {
    return {
      id: `scenario-${measureId}`,
      label: this.getMeasure(measureId)?.name ?? measureId,
      measureIds: [measureId],
    };
  }

  private async evaluatePackageScenario(
    building: BuildingInfo,
    estimation: EstimationResult,
    renovationPackage: RenovationPackage,
  ): Promise<RenovationScenario> {
    const ecmParams = this.buildECMParams(estimation, renovationPackage);
    const ecmResponse = await forecasting.simulateECM(ecmParams);
    const renovatedScenario = this.selectScenarioForPackage(
      ecmResponse.scenarios,
      renovationPackage,
    );

    if (!renovatedScenario?.results?.hourly_building) {
      throw new Error("ECM API did not return a valid renovated scenario");
    }

    const hourlyRecords = transformColumnarToRowFormat(
      renovatedScenario.results.hourly_building,
    );
    const renovatedTotals = calculateAnnualTotals(hourlyRecords);
    const renovatedHvacEnergy = renovatedTotals.Q_HC_total;

    const userArea = building.floorArea || DEFAULT_FLOOR_AREA;
    if (
      estimation.archetypeFloorArea === undefined ||
      estimation.archetypeFloorArea <= 0
    ) {
      throw new Error(
        "Archetype floor area not available on estimation result. " +
          `archetypeFloorArea=${estimation.archetypeFloorArea}`,
      );
    }

    const areaScaleFactor = userArea / estimation.archetypeFloorArea;
    const scaledRenovatedHvac = renovatedHvacEnergy * areaScaleFactor;
    const uniTotals = extractUniTotals(
      renovatedScenario.results.primary_energy_uni11300,
    );
    const scaledDeliveredTotal =
      uniTotals !== undefined
        ? uniTotals.deliveredTotal * areaScaleFactor
        : undefined;
    const scaledPrimaryEnergy =
      uniTotals !== undefined
        ? uniTotals.primaryEnergy * areaScaleFactor
        : undefined;
    const renovatedIntensity = scaledRenovatedHvac / userArea;

    return {
      id: renovationPackage.id,
      packageId: renovationPackage.id,
      label: renovationPackage.label,
      epcClass: getEPCClass(renovatedIntensity),
      annualEnergyNeeds: Math.round(scaledRenovatedHvac),
      annualEnergyCost: Math.round(
        estimateAnnualHvacEnergyCost(scaledRenovatedHvac),
      ),
      heatingCoolingNeeds: Math.round(scaledRenovatedHvac),
      ...(scaledDeliveredTotal !== undefined
        ? {
            deliveredTotal: Math.round(scaledDeliveredTotal),
            deliveredEnergyCost: Math.round(
              estimateAnnualHvacEnergyCost(scaledDeliveredTotal),
            ),
          }
        : {}),
      ...(scaledPrimaryEnergy !== undefined
        ? { primaryEnergy: Math.round(scaledPrimaryEnergy) }
        : {}),
      comfortIndex: Math.min(
        100,
        estimation.comfortIndex + renovationPackage.measureIds.length * 2,
      ),
      flexibilityIndex: estimation.flexibilityIndex,
      measureIds: renovationPackage.measureIds,
      measures: renovationPackage.measureIds.map(
        (measureId) => this.getMeasure(measureId)?.name ?? measureId,
      ),
    };
  }

  private buildECMParams(
    estimation: EstimationResult,
    renovationPackage: RenovationPackage,
  ): ECMApplicationParams {
    const elements = renovationPackage.measureIds
      .map((measureId) => MEASURE_TO_ELEMENT[measureId])
      .filter((element): element is string => element !== undefined)
      .join(",");

    const commonParams: Partial<ECMCustomBuildingParams & ECMArchetypeParams> =
      {};

    if (elements) {
      commonParams.scenario_elements = elements;
    }

    for (const measureId of renovationPackage.measureIds) {
      if (measureId === "condensing-boiler") {
        commonParams.uni_generation_mode = "condensing_boiler";
        commonParams.include_baseline = true;
      }

      const target = U_VALUE_TARGETS[measureId];
      if (target === undefined) {
        continue;
      }

      if (measureId === "wall-insulation") {
        commonParams.u_wall = target;
      }
      if (measureId === "roof-insulation") {
        commonParams.u_roof = target;
      }
      if (measureId === "floor-insulation") {
        commonParams.u_slab = target;
      }
      if (measureId === "windows") {
        commonParams.u_window = target;
      }
    }

    return estimation.modifiedBui
      ? ({
          bui: estimation.modifiedBui,
          system: estimation.modifiedSystem,
          ...commonParams,
        } as ECMCustomBuildingParams)
      : ({
          category: estimation.archetype?.category,
          country: estimation.archetype?.country,
          name: estimation.archetype?.name,
          ...commonParams,
        } as ECMArchetypeParams);
  }

  private buildBaselineScenario(
    estimation: EstimationResult,
  ): RenovationScenario {
    return {
      id: "current",
      packageId: null,
      label: "Current Status",
      epcClass: estimation.estimatedEPC,
      annualEnergyNeeds: estimation.annualEnergyNeeds,
      annualEnergyCost: estimation.annualEnergyCost,
      heatingCoolingNeeds: estimation.heatingCoolingNeeds,
      deliveredTotal: estimation.deliveredTotal,
      deliveredEnergyCost: estimation.deliveredEnergyCost,
      primaryEnergy: estimation.primaryEnergy,
      flexibilityIndex: estimation.flexibilityIndex,
      comfortIndex: estimation.comfortIndex,
      measureIds: [],
      measures: [],
    };
  }

  private selectScenarioForPackage(
    scenarios: ECMScenario[],
    renovationPackage: RenovationPackage,
  ): ECMScenario | undefined {
    if (scenarios.length === 0) {
      return undefined;
    }

    if (scenarios.length === 1) {
      return scenarios[0];
    }

    const expectedElements = new Set(
      renovationPackage.measureIds
        .map((measureId) => MEASURE_TO_ELEMENT[measureId])
        .filter(
          (element): element is NonNullable<ECMScenario["elements"]>[number] =>
            element !== undefined,
        ),
    );

    if (expectedElements.size > 0) {
      const exactElementMatch = scenarios.find((scenario) => {
        const scenarioElements = new Set(scenario.elements ?? []);
        if (scenarioElements.size !== expectedElements.size) {
          return false;
        }

        return [...expectedElements].every((element) =>
          scenarioElements.has(element),
        );
      });

      if (exactElementMatch) {
        return exactElementMatch;
      }
    }

    const nonBaselineScenario = scenarios.find(
      (scenario) => scenario.scenario_id !== "baseline",
    );

    return nonBaselineScenario ?? scenarios[scenarios.length - 1];
  }
}

function dedupePackages(packages: RenovationPackage[]): RenovationPackage[] {
  const seen = new Set<string>();

  return packages.filter((pkg) => {
    if (seen.has(pkg.id)) {
      return false;
    }

    seen.add(pkg.id);
    return true;
  });
}
