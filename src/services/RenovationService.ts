/**
 * Renovation Service - Forecasting API implementation for HRA/PRA package
 * evaluation. HRA supports envelope, system-only, and selected mixed
 * envelope + system comparisons while Technical ranking remains envelope-only.
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
import { normalizeSystemSelection } from "./measureNormalization";
import { PV_DEFAULTS, pvKwpFromFloorArea } from "./pvConfig";
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

const SUPPORTED_SYSTEM_SCENARIOS: RenovationMeasureId[] = [
  "condensing-boiler",
  "air-water-heat-pump",
];
const PV_MEASURE_ID: RenovationMeasureId = "pv";
const ANALYSIS_ELIGIBLE_MEASURES: RenovationMeasureId[] = [
  ...RANKABLE_MEASURE_PRIORITY,
  ...SUPPORTED_SYSTEM_SCENARIOS,
  PV_MEASURE_ID,
];
const DEFAULT_HEAT_PUMP_COP = 3.2;
const MAX_SUGGESTED_PACKAGES = 14;
const FORECASTING_SCENARIO_CONCURRENCY_LIMIT = 2;

async function mapWithConcurrencyLimit<TItem, TResult>(
  items: readonly TItem[],
  limit: number,
  mapper: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

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

  getAnalysisEligibleMeasures(): RenovationMeasure[] {
    return ANALYSIS_ELIGIBLE_MEASURES.map((id) => this.getMeasure(id)).filter(
      (measure): measure is RenovationMeasure => measure !== undefined,
    );
  }

  isAnalysisEligibleMeasure(measureId: RenovationMeasureId): boolean {
    return ANALYSIS_ELIGIBLE_MEASURES.includes(measureId);
  }

  getCategories() {
    return MEASURE_CATEGORIES;
  }

  suggestPackages(
    selectedMeasures: RenovationMeasureId[],
  ): RenovationPackage[] {
    const normalizedMeasures = normalizeSystemSelection(selectedMeasures);
    const selectedRankableMeasures = RANKABLE_MEASURE_PRIORITY.filter((id) =>
      normalizedMeasures.includes(id),
    );
    const selectedSystemMeasures = SUPPORTED_SYSTEM_SCENARIOS.filter((id) =>
      normalizedMeasures.includes(id),
    );
    const hasPv = normalizedMeasures.includes(PV_MEASURE_ID);

    const packages: RenovationPackage[] = [];

    for (const measureId of selectedRankableMeasures) {
      packages.push(this.createPackage([measureId]));
    }

    if (selectedRankableMeasures.length >= 2) {
      packages.push(this.createPackage(selectedRankableMeasures));
    }

    for (const measureId of selectedSystemMeasures) {
      packages.push(this.createDirectScenario(measureId));
    }

    if (hasPv) {
      packages.push(this.createDirectScenario(PV_MEASURE_ID));
    }

    if (hasPv && selectedRankableMeasures.length > 0) {
      packages.push(
        this.createCombinedPackage([
          ...selectedRankableMeasures,
          PV_MEASURE_ID,
        ]),
      );
    }

    if (selectedRankableMeasures.length > 0) {
      for (const systemMeasureId of selectedSystemMeasures) {
        packages.push(
          this.createMixedPackage(selectedRankableMeasures, systemMeasureId),
        );
      }
    }

    if (hasPv) {
      for (const systemMeasureId of selectedSystemMeasures) {
        packages.push(
          this.createCombinedPackage([PV_MEASURE_ID, systemMeasureId]),
        );
      }
    }

    if (hasPv && selectedRankableMeasures.length > 0) {
      for (const systemMeasureId of selectedSystemMeasures) {
        packages.push(
          this.createCombinedPackage([
            ...selectedRankableMeasures,
            systemMeasureId,
            PV_MEASURE_ID,
          ]),
        );
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

    const packageScenarios = await mapWithConcurrencyLimit(
      packages,
      FORECASTING_SCENARIO_CONCURRENCY_LIMIT,
      (pkg) => this.evaluatePackageScenario(building, estimation, pkg),
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

  private createDirectScenario(
    measureId: RenovationMeasureId,
  ): RenovationPackage {
    return {
      id: `scenario-${measureId}`,
      label: this.getMeasure(measureId)?.name ?? measureId,
      measureIds: [measureId],
    };
  }

  private createMixedPackage(
    envelopeMeasureIds: RenovationMeasureId[],
    systemMeasureId: RenovationMeasureId,
  ): RenovationPackage {
    const orderedEnvelopeMeasureIds = RANKABLE_MEASURE_PRIORITY.filter((id) =>
      envelopeMeasureIds.includes(id),
    );
    const measureIds = [...orderedEnvelopeMeasureIds, systemMeasureId];
    const envelopeLabel =
      orderedEnvelopeMeasureIds.length === 1
        ? (this.getMeasure(orderedEnvelopeMeasureIds[0])?.name ??
          orderedEnvelopeMeasureIds[0])
        : "Envelope package";
    const systemLabel =
      this.getMeasure(systemMeasureId)?.name ?? systemMeasureId;

    return {
      id: `package-${measureIds.join("-")}`,
      label: `${envelopeLabel} + ${systemLabel}`,
      measureIds,
    };
  }

  private createCombinedPackage(
    measureIds: RenovationMeasureId[],
  ): RenovationPackage {
    return {
      id: `package-${measureIds.join("-")}`,
      label: measureIds
        .map((measureId) => this.getMeasure(measureId)?.name ?? measureId)
        .join(" + "),
      measureIds,
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
      {
        allowHeatPump: renovationPackage.measureIds.includes(
          "air-water-heat-pump",
        ),
      },
    );
    let scaledDeliveredTotal =
      uniTotals !== undefined
        ? uniTotals.deliveredTotal * areaScaleFactor
        : undefined;
    const scaledPrimaryEnergy =
      uniTotals !== undefined
        ? uniTotals.primaryEnergy * areaScaleFactor
        : undefined;
    const scaledHeatingPrimaryEnergy =
      uniTotals?.heatingPrimaryEnergy !== undefined
        ? uniTotals.heatingPrimaryEnergy * areaScaleFactor
        : undefined;
    const scaledCoolingPrimaryEnergy =
      uniTotals?.coolingPrimaryEnergy !== undefined
        ? uniTotals.coolingPrimaryEnergy * areaScaleFactor
        : undefined;
    const pvAnnual = renovatedScenario.results.pv_hp?.summary?.annual_kwh;
    const pvIndicators = renovatedScenario.results.pv_hp?.summary?.indicators;
    const scaledPvGeneration =
      pvAnnual?.pv_generation !== undefined
        ? pvAnnual.pv_generation * areaScaleFactor
        : undefined;
    const scaledPvSelfConsumption =
      pvAnnual?.self_consumption !== undefined
        ? pvAnnual.self_consumption * areaScaleFactor
        : undefined;
    const scaledPvGridExport =
      pvAnnual?.grid_export !== undefined
        ? pvAnnual.grid_export * areaScaleFactor
        : undefined;
    if (
      scaledPvSelfConsumption !== undefined &&
      renovationPackage.measureIds.includes(PV_MEASURE_ID) &&
      scaledDeliveredTotal !== undefined
    ) {
      scaledDeliveredTotal = Math.max(
        0,
        scaledDeliveredTotal - scaledPvSelfConsumption,
      );
      // TODO(pv-primary): apply electricity primary factor before reducing primary energy.
    }
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
      ...(scaledHeatingPrimaryEnergy !== undefined
        ? { heatingPrimaryEnergy: Math.round(scaledHeatingPrimaryEnergy) }
        : {}),
      ...(scaledCoolingPrimaryEnergy !== undefined
        ? { coolingPrimaryEnergy: Math.round(scaledCoolingPrimaryEnergy) }
        : {}),
      ...(uniTotals?.heatPumpCop !== undefined
        ? { heatPumpCop: uniTotals.heatPumpCop }
        : {}),
      ...(scaledPvGeneration !== undefined
        ? { pvGeneration: Math.round(scaledPvGeneration) }
        : {}),
      ...(scaledPvSelfConsumption !== undefined
        ? { pvSelfConsumption: Math.round(scaledPvSelfConsumption) }
        : {}),
      ...(scaledPvGridExport !== undefined
        ? { pvGridExport: Math.round(scaledPvGridExport) }
        : {}),
      ...(pvIndicators?.self_consumption_rate !== undefined
        ? { pvSelfConsumptionRate: pvIndicators.self_consumption_rate }
        : {}),
      ...(pvIndicators?.self_sufficiency_rate !== undefined
        ? { pvSelfSufficiencyRate: pvIndicators.self_sufficiency_rate }
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

    const hasEnvelope = renovationPackage.measureIds.some(
      (measureId) => MEASURE_TO_ELEMENT[measureId] !== undefined,
    );
    const hasPv = renovationPackage.measureIds.includes(PV_MEASURE_ID);
    const hasGenerationChange =
      renovationPackage.measureIds.includes("condensing-boiler") ||
      renovationPackage.measureIds.includes("air-water-heat-pump");

    if (hasPv) {
      const pvKwp = pvKwpFromFloorArea(estimation.archetypeFloorArea);
      if (pvKwp === null) {
        throw new Error(
          "PV measure requires a valid archetype floor area on the estimation",
        );
      }
      commonParams.use_pv = true;
      commonParams.pv_kwp = pvKwp;
      commonParams.pv_tilt_deg = PV_DEFAULTS.tiltDeg;
      commonParams.pv_azimuth_deg = PV_DEFAULTS.azimuthDeg;
      commonParams.pv_use_pvgis = PV_DEFAULTS.usePvgis;
      commonParams.pv_pvgis_loss_percent = PV_DEFAULTS.pvgisLossPercent;
      commonParams.annual_pv_yield_kwh_per_kwp =
        PV_DEFAULTS.annualYieldKwhPerKwp;
    }

    if (hasGenerationChange && !hasEnvelope && !hasPv) {
      commonParams.include_baseline = true;
    }

    for (const measureId of renovationPackage.measureIds) {
      if (measureId === "condensing-boiler") {
        commonParams.uni_generation_mode = "condensing_boiler";
      }
      if (measureId === "air-water-heat-pump") {
        commonParams.use_heat_pump = true;
        commonParams.heat_pump_cop = DEFAULT_HEAT_PUMP_COP;
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
