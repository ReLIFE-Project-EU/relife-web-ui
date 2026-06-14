/**
 * Renovation Service - Forecasting API implementation for HRA/PRA package
 * evaluation. HRA supports envelope, system-only, and selected mixed
 * envelope + system comparisons. Ranking eligibility is based on available
 * MCDA inputs, not measure category.
 */

import { forecasting } from "../api";
import type { ECMScenario } from "../types/forecasting";
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
  extractUniTotals,
  getEPCClass,
  resolveEpcRatingIntensity,
  transformColumnarToRowFormat,
} from "./energyUtils";
import {
  extractUniCarrierBreakdown,
  scaleCarrierBreakdown,
  totalCarrierEnergyKwh,
} from "./carrierSavingsService";
import {
  MEASURE_CATEGORIES,
  RENOVATION_MEASURES,
} from "./mock/data/renovationMeasures";
import { normalizeSystemSelection } from "./measureNormalization";
import {
  buildECMParams,
  MEASURE_TO_ELEMENT,
  PV_MEASURE_ID,
} from "./renovationEcmParams";
import type { IRenovationService, RenovationMeasure } from "./types";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import { mapWithConcurrencyLimit } from "../utils/concurrency";

const ENVELOPE_PACKAGE_MEASURE_PRIORITY: RenovationMeasureId[] = [
  "wall-insulation",
  "roof-insulation",
  "windows",
  "floor-insulation",
];

const SUPPORTED_SYSTEM_SCENARIOS: RenovationMeasureId[] = [
  "condensing-boiler",
  "air-water-heat-pump",
];
const ANALYSIS_ELIGIBLE_MEASURES: RenovationMeasureId[] = [
  ...ENVELOPE_PACKAGE_MEASURE_PRIORITY,
  ...SUPPORTED_SYSTEM_SCENARIOS,
  PV_MEASURE_ID,
];
const MAX_SUGGESTED_PACKAGES = 14;
const FORECASTING_SCENARIO_CONCURRENCY_LIMIT = 2;

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

  getEnvelopePackageMeasures(): RenovationMeasure[] {
    return ENVELOPE_PACKAGE_MEASURE_PRIORITY.map((id) =>
      this.getMeasure(id),
    ).filter((measure): measure is RenovationMeasure => measure !== undefined);
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
    const selectedEnvelopeMeasures = ENVELOPE_PACKAGE_MEASURE_PRIORITY.filter(
      (id) => normalizedMeasures.includes(id),
    );
    const selectedSystemMeasures = SUPPORTED_SYSTEM_SCENARIOS.filter((id) =>
      normalizedMeasures.includes(id),
    );
    const hasPv = normalizedMeasures.includes(PV_MEASURE_ID);

    const packages: RenovationPackage[] = [];

    for (const measureId of selectedEnvelopeMeasures) {
      packages.push(this.createPackage([measureId]));
    }

    if (selectedEnvelopeMeasures.length >= 2) {
      packages.push(this.createPackage(selectedEnvelopeMeasures));
    }

    for (const measureId of selectedSystemMeasures) {
      packages.push(this.createDirectScenario(measureId));
    }

    if (hasPv) {
      packages.push(this.createDirectScenario(PV_MEASURE_ID));
    }

    if (hasPv && selectedEnvelopeMeasures.length > 0) {
      packages.push(
        this.createCombinedPackage([
          ...selectedEnvelopeMeasures,
          PV_MEASURE_ID,
        ]),
      );
    }

    if (selectedEnvelopeMeasures.length > 0) {
      for (const systemMeasureId of selectedSystemMeasures) {
        packages.push(
          this.createMixedPackage(selectedEnvelopeMeasures, systemMeasureId),
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

    if (hasPv && selectedEnvelopeMeasures.length > 0) {
      for (const systemMeasureId of selectedSystemMeasures) {
        packages.push(
          this.createCombinedPackage([
            ...selectedEnvelopeMeasures,
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
    auditCtx?: AuditCtx,
  ): Promise<RenovationScenario[]> {
    const baselineScenario = this.buildBaselineScenario(estimation);

    auditLog.info(
      "renovation",
      "renovation.evaluate.start",
      {
        packageCount: packages.length,
        packageIds: packages.map((p) => p.id),
        baselineEPC: estimation.estimatedEPC,
        baselineDeliveredTotal: estimation.deliveredTotal,
        archetype: estimation.archetype,
      },
      auditCtx,
    );

    if (packages.length === 0) {
      auditLog.info(
        "renovation",
        "renovation.evaluate.end",
        { scenarios: [baselineScenario.id], reason: "no-packages" },
        auditCtx,
      );
      return [baselineScenario];
    }

    if (!estimation.archetype) {
      throw new Error("Missing archetype on baseline estimation result");
    }

    const packageScenarios = await mapWithConcurrencyLimit(
      packages,
      FORECASTING_SCENARIO_CONCURRENCY_LIMIT,
      (pkg) =>
        this.evaluatePackageScenario(building, estimation, pkg, auditCtx),
    );

    auditLog.info(
      "renovation",
      "renovation.evaluate.end",
      {
        scenarios: [baselineScenario.id, ...packageScenarios.map((s) => s.id)],
      },
      auditCtx,
    );

    return [baselineScenario, ...packageScenarios];
  }

  private createPackage(measureIds: RenovationMeasureId[]): RenovationPackage {
    const sortedMeasureIds = ENVELOPE_PACKAGE_MEASURE_PRIORITY.filter((id) =>
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
    const orderedEnvelopeMeasureIds = ENVELOPE_PACKAGE_MEASURE_PRIORITY.filter(
      (id) => envelopeMeasureIds.includes(id),
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
    parentCtx?: AuditCtx,
  ): Promise<RenovationScenario> {
    const auditCtx = parentCtx?.child({ scenarioId: renovationPackage.id });

    auditLog.info(
      "renovation",
      "renovation.scenario.start",
      {
        packageId: renovationPackage.id,
        packageLabel: renovationPackage.label,
        measureIds: renovationPackage.measureIds,
      },
      auditCtx,
    );

    const ecmParams = buildECMParams(
      renovationPackage.measureIds,
      estimation.modifiedBui
        ? {
            kind: "custom",
            modifiedBui: estimation.modifiedBui,
            modifiedSystem: estimation.modifiedSystem,
            floorArea: estimation.archetypeFloorArea ?? null,
          }
        : {
            kind: "archetype",
            archetype: {
              category: estimation.archetype!.category,
              country: estimation.archetype!.country,
              name: estimation.archetype!.name,
            },
            floorArea: estimation.archetypeFloorArea ?? null,
          },
    );
    auditLog.debug(
      "renovation",
      "renovation.ecm.params",
      { ecmParams: ecmParams as unknown as Record<string, unknown> },
      auditCtx,
    );
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
    const pvAnnual = renovatedScenario.results.pv_hp?.summary?.annual_kwh;
    const pvIndicators = renovatedScenario.results.pv_hp?.summary?.indicators;
    const hasPv = renovationPackage.measureIds.includes(PV_MEASURE_ID);
    const allowHeatPump = renovationPackage.measureIds.includes(
      "air-water-heat-pump",
    );
    const uniTotals = extractUniTotals(
      renovatedScenario.results.primary_energy_uni11300,
      {
        allowHeatPump,
      },
    );
    const carrierBreakdown = scaleCarrierBreakdown(
      extractUniCarrierBreakdown(
        renovatedScenario.results.primary_energy_uni11300,
        {
          allowHeatPump,
          pvSelfConsumptionKwh: hasPv ? pvAnnual?.self_consumption : undefined,
        },
      ),
      areaScaleFactor,
    );
    let scaledDeliveredTotal =
      totalCarrierEnergyKwh(carrierBreakdown) ??
      (uniTotals !== undefined
        ? uniTotals.deliveredTotal * areaScaleFactor
        : undefined);
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
      hasPv &&
      carrierBreakdown === undefined &&
      scaledDeliveredTotal !== undefined
    ) {
      scaledDeliveredTotal = Math.max(
        0,
        scaledDeliveredTotal - scaledPvSelfConsumption,
      );
      // TODO(pv-primary): apply electricity primary factor before reducing primary energy.
    }
    // Rate the renovated scenario on primary energy (falling back to delivered,
    // then thermal demand) so system measures move the class, consistent with
    // the baseline estimation and the ARV energy basis.
    const epcRating = resolveEpcRatingIntensity(
      {
        primaryEnergy: scaledPrimaryEnergy,
        deliveredTotal: scaledDeliveredTotal,
        annualEnergyNeeds: scaledRenovatedHvac,
      },
      userArea,
    );
    const renovatedIntensity = epcRating.intensity;

    auditLog.debug(
      "renovation",
      "renovation.ecm.scaling",
      {
        userArea,
        archetypeFloorArea: estimation.archetypeFloorArea,
        areaScaleFactor,
        raw: {
          hvacTotal: renovatedHvacEnergy,
          deliveredTotal: uniTotals?.deliveredTotal,
          carrierBreakdown: extractUniCarrierBreakdown(
            renovatedScenario.results.primary_energy_uni11300,
            {
              allowHeatPump,
              pvSelfConsumptionKwh: hasPv
                ? pvAnnual?.self_consumption
                : undefined,
            },
          ),
          primaryEnergy: uniTotals?.primaryEnergy,
          pvGeneration: pvAnnual?.pv_generation,
          pvSelfConsumption: pvAnnual?.self_consumption,
        },
        scaled: {
          hvacTotal: scaledRenovatedHvac,
          deliveredTotal: scaledDeliveredTotal,
          carrierBreakdown,
          primaryEnergy: scaledPrimaryEnergy,
          pvGeneration: scaledPvGeneration,
          pvSelfConsumption: scaledPvSelfConsumption,
          pvGridExport: scaledPvGridExport,
        },
        renovatedIntensity,
        uniTotalsAvailable: uniTotals !== undefined,
        pvSelfConsumptionApplied:
          scaledPvSelfConsumption !== undefined &&
          renovationPackage.measureIds.includes(PV_MEASURE_ID),
      },
      auditCtx,
    );

    const scenario: RenovationScenario = {
      id: renovationPackage.id,
      packageId: renovationPackage.id,
      label: renovationPackage.label,
      epcClass: getEPCClass(renovatedIntensity),
      annualEnergyNeeds: Math.round(scaledRenovatedHvac),
      heatingCoolingNeeds: Math.round(scaledRenovatedHvac),
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
      epcEnergyIntensity: Math.round(renovatedIntensity),
      epcEnergyBasis: epcRating.basis,
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

    auditLog.info(
      "renovation",
      "renovation.scenario.end",
      {
        packageId: renovationPackage.id,
        epcClass: scenario.epcClass,
        annualEnergyNeeds: scenario.annualEnergyNeeds,
        deliveredTotal: scenario.deliveredTotal,
        primaryEnergy: scenario.primaryEnergy,
        heatingPrimaryEnergy: scenario.heatingPrimaryEnergy,
        coolingPrimaryEnergy: scenario.coolingPrimaryEnergy,
        heatPumpCop: scenario.heatPumpCop,
        pvGeneration: scenario.pvGeneration,
        pvSelfConsumption: scenario.pvSelfConsumption,
        pvSelfConsumptionRate: scenario.pvSelfConsumptionRate,
        pvSelfSufficiencyRate: scenario.pvSelfSufficiencyRate,
      },
      auditCtx,
    );

    return scenario;
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
      heatingCoolingNeeds: estimation.heatingCoolingNeeds,
      deliveredTotal: estimation.deliveredTotal,
      carrierBreakdown: estimation.carrierBreakdown,
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
