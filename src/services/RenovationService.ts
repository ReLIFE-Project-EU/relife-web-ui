/**
 * Renovation Service - Forecasting API implementation for HRA/PRA package
 * evaluation. HRA supports envelope, system-only, and selected mixed
 * envelope + system comparisons. Ranking eligibility is based on available
 * MCDA inputs, not measure category.
 */

import { forecasting } from "../api";
import type { ECMApplicationParams, ECMScenario } from "../types/forecasting";
import type { EpcEnergyBasis } from "../types/energy";
import type {
  BuildingInfo,
  EstimationResult,
  RenovationMeasureId,
  RenovationPackage,
  RenovationScenario,
  ScenarioId,
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
  type DeliveredEnergyCarrierBreakdown,
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
  type BuildECMParamsContext,
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

/**
 * Area-scaled energy figures extracted from a single ECM scenario result.
 * Shared by the baseline ("current") and the renovated package scenarios so
 * both are derived through the same ECM engine and stay comparable.
 */
interface EcmScenarioEnergy {
  scaledHvac: number;
  deliveredTotal?: number;
  carrierBreakdown?: DeliveredEnergyCarrierBreakdown;
  primaryEnergy?: number;
  heatingPrimaryEnergy?: number;
  coolingPrimaryEnergy?: number;
  heatPumpCop?: number;
  pvGeneration?: number;
  pvSelfConsumption?: number;
  pvGridExport?: number;
  pvSelfConsumptionRate?: number;
  pvSelfSufficiencyRate?: number;
  intensity: number;
  epcBasis: EpcEnergyBasis;
  epcClass: string;
}

/** One unit of work in the forecasting batch: the baseline or a package. */
type ScenarioEvaluationUnit =
  | { kind: "baseline" }
  | { kind: "package"; package: RenovationPackage };

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

    if (!estimation.archetype) {
      throw new Error("Missing archetype on baseline estimation result");
    }

    // Re-simulate the baseline through the ECM engine instead of reusing the
    // energy-estimation result. The estimation comes from a different
    // forecasting endpoint, so comparing it against ECM-simulated packages
    // mixed two engines and produced spurious savings for low-impact measures
    // (delivered energy could rise even as thermal demand fell). Running the
    // baseline as one more unit of the same concurrency-limited batch keeps the
    // whole comparison on one engine while bounding forecasting load.
    const units: ScenarioEvaluationUnit[] = [
      { kind: "baseline" },
      ...packages.map(
        (pkg): ScenarioEvaluationUnit => ({ kind: "package", package: pkg }),
      ),
    ];

    const scenarios = await mapWithConcurrencyLimit(
      units,
      FORECASTING_SCENARIO_CONCURRENCY_LIMIT,
      (unit) =>
        unit.kind === "baseline"
          ? this.evaluateBaselineScenario(building, estimation, auditCtx)
          : this.evaluatePackageScenario(
              building,
              estimation,
              unit.package,
              auditCtx,
            ),
    );

    auditLog.info(
      "renovation",
      "renovation.evaluate.end",
      { scenarios: scenarios.map((s) => s.id) },
      auditCtx,
    );

    return scenarios;
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
      this.buildEcmContext(estimation),
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

    const energy = this.extractEcmScenarioEnergy(renovatedScenario, {
      userArea: building.floorArea || DEFAULT_FLOOR_AREA,
      archetypeFloorArea: estimation.archetypeFloorArea,
      allowHeatPump: renovationPackage.measureIds.includes(
        "air-water-heat-pump",
      ),
      hasPv: renovationPackage.measureIds.includes(PV_MEASURE_ID),
      auditCtx,
    });

    const scenario = this.assembleScenario(
      {
        id: renovationPackage.id,
        packageId: renovationPackage.id,
        label: renovationPackage.label,
        measureIds: renovationPackage.measureIds,
        measures: renovationPackage.measureIds.map(
          (measureId) => this.getMeasure(measureId)?.name ?? measureId,
        ),
        comfortIndex: Math.min(
          100,
          estimation.comfortIndex + renovationPackage.measureIds.length * 2,
        ),
        flexibilityIndex: estimation.flexibilityIndex,
      },
      energy,
    );

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

  /**
   * Re-simulate the unchanged building through the ECM engine (baseline_only)
   * so the "current" scenario shares an engine with the renovated packages.
   * Uses the same custom/archetype context resolution as the package
   * scenarios, keeping the modified-BUI and default-archetype paths consistent.
   */
  private async evaluateBaselineScenario(
    building: BuildingInfo,
    estimation: EstimationResult,
    parentCtx?: AuditCtx,
  ): Promise<RenovationScenario> {
    const auditCtx = parentCtx?.child({ scenarioId: "current" });

    auditLog.info(
      "renovation",
      "renovation.scenario.start",
      { packageId: "current", packageLabel: "Current Status", measureIds: [] },
      auditCtx,
    );

    const ecmParams: ECMApplicationParams = {
      ...buildECMParams([], this.buildEcmContext(estimation)),
      baseline_only: true,
    };
    auditLog.debug(
      "renovation",
      "renovation.ecm.params",
      { ecmParams: ecmParams as unknown as Record<string, unknown> },
      auditCtx,
    );

    const ecmResponse = await forecasting.simulateECM(ecmParams);
    const baselineScenario =
      ecmResponse.scenarios.find(
        (scenario) => scenario.scenario_id === "baseline",
      ) ?? ecmResponse.scenarios[0];

    if (!baselineScenario?.results?.hourly_building) {
      throw new Error("ECM API did not return a valid baseline scenario");
    }

    const energy = this.extractEcmScenarioEnergy(baselineScenario, {
      userArea: building.floorArea || DEFAULT_FLOOR_AREA,
      archetypeFloorArea: estimation.archetypeFloorArea,
      allowHeatPump: false,
      hasPv: false,
      auditCtx,
    });

    const scenario = this.assembleScenario(
      {
        id: "current",
        packageId: null,
        label: "Current Status",
        measureIds: [],
        measures: [],
        comfortIndex: estimation.comfortIndex,
        flexibilityIndex: estimation.flexibilityIndex,
      },
      energy,
    );

    auditLog.info(
      "renovation",
      "renovation.scenario.end",
      {
        packageId: "current",
        epcClass: scenario.epcClass,
        annualEnergyNeeds: scenario.annualEnergyNeeds,
        deliveredTotal: scenario.deliveredTotal,
        primaryEnergy: scenario.primaryEnergy,
        heatingPrimaryEnergy: scenario.heatingPrimaryEnergy,
        coolingPrimaryEnergy: scenario.coolingPrimaryEnergy,
      },
      auditCtx,
    );

    return scenario;
  }

  /**
   * Resolve the ECM simulation context (custom modified BUI vs. archetype) from
   * the estimation. Shared by the baseline and package paths so both run the
   * same building through the ECM engine.
   */
  private buildEcmContext(estimation: EstimationResult): BuildECMParamsContext {
    return estimation.modifiedBui
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
        };
  }

  /**
   * Extract and area-scale the energy figures from a single ECM scenario
   * result (baseline or renovated). Emits the `renovation.ecm.scaling` debug
   * trace. Throws if the archetype floor area is unusable for scaling.
   */
  private extractEcmScenarioEnergy(
    ecmScenario: ECMScenario,
    options: {
      userArea: number;
      archetypeFloorArea: number;
      allowHeatPump: boolean;
      hasPv: boolean;
      auditCtx?: AuditCtx;
    },
  ): EcmScenarioEnergy {
    const { userArea, archetypeFloorArea, allowHeatPump, hasPv, auditCtx } =
      options;

    if (archetypeFloorArea === undefined || archetypeFloorArea <= 0) {
      throw new Error(
        "Archetype floor area not available on estimation result. " +
          `archetypeFloorArea=${archetypeFloorArea}`,
      );
    }

    const hourlyRecords = transformColumnarToRowFormat(
      ecmScenario.results.hourly_building,
    );
    const annualTotals = calculateAnnualTotals(hourlyRecords);
    const areaScaleFactor = userArea / archetypeFloorArea;
    const scaledHvac = annualTotals.Q_HC_total * areaScaleFactor;

    const pvAnnual = ecmScenario.results.pv_hp?.summary?.annual_kwh;
    const pvIndicators = ecmScenario.results.pv_hp?.summary?.indicators;
    const uniTotals = extractUniTotals(
      ecmScenario.results.primary_energy_uni11300,
      { allowHeatPump },
    );
    const rawCarrierBreakdown = extractUniCarrierBreakdown(
      ecmScenario.results.primary_energy_uni11300,
      {
        allowHeatPump,
        pvSelfConsumptionKwh: hasPv ? pvAnnual?.self_consumption : undefined,
      },
    );
    const carrierBreakdown = scaleCarrierBreakdown(
      rawCarrierBreakdown,
      areaScaleFactor,
    );
    let deliveredTotal =
      totalCarrierEnergyKwh(carrierBreakdown) ??
      (uniTotals !== undefined
        ? uniTotals.deliveredTotal * areaScaleFactor
        : undefined);
    const primaryEnergy =
      uniTotals !== undefined
        ? uniTotals.primaryEnergy * areaScaleFactor
        : undefined;
    const heatingPrimaryEnergy =
      uniTotals?.heatingPrimaryEnergy !== undefined
        ? uniTotals.heatingPrimaryEnergy * areaScaleFactor
        : undefined;
    const coolingPrimaryEnergy =
      uniTotals?.coolingPrimaryEnergy !== undefined
        ? uniTotals.coolingPrimaryEnergy * areaScaleFactor
        : undefined;
    const pvGeneration =
      pvAnnual?.pv_generation !== undefined
        ? pvAnnual.pv_generation * areaScaleFactor
        : undefined;
    const pvSelfConsumption =
      pvAnnual?.self_consumption !== undefined
        ? pvAnnual.self_consumption * areaScaleFactor
        : undefined;
    const pvGridExport =
      pvAnnual?.grid_export !== undefined
        ? pvAnnual.grid_export * areaScaleFactor
        : undefined;
    if (
      pvSelfConsumption !== undefined &&
      hasPv &&
      carrierBreakdown === undefined &&
      deliveredTotal !== undefined
    ) {
      deliveredTotal = Math.max(0, deliveredTotal - pvSelfConsumption);
      // TODO(pv-primary): apply electricity primary factor before reducing primary energy.
    }

    // Rate on primary energy (falling back to delivered, then thermal demand)
    // so system measures move the class, consistent with the ARV energy basis.
    const epcRating = resolveEpcRatingIntensity(
      {
        primaryEnergy,
        deliveredTotal,
        annualEnergyNeeds: scaledHvac,
      },
      userArea,
    );

    auditLog.debug(
      "renovation",
      "renovation.ecm.scaling",
      {
        userArea,
        archetypeFloorArea,
        areaScaleFactor,
        raw: {
          hvacTotal: annualTotals.Q_HC_total,
          deliveredTotal: uniTotals?.deliveredTotal,
          carrierBreakdown: rawCarrierBreakdown,
          primaryEnergy: uniTotals?.primaryEnergy,
          pvGeneration: pvAnnual?.pv_generation,
          pvSelfConsumption: pvAnnual?.self_consumption,
        },
        scaled: {
          hvacTotal: scaledHvac,
          deliveredTotal,
          carrierBreakdown,
          primaryEnergy,
          pvGeneration,
          pvSelfConsumption,
          pvGridExport,
        },
        renovatedIntensity: epcRating.intensity,
        uniTotalsAvailable: uniTotals !== undefined,
        pvSelfConsumptionApplied: pvSelfConsumption !== undefined && hasPv,
      },
      auditCtx,
    );

    return {
      scaledHvac,
      deliveredTotal,
      carrierBreakdown,
      primaryEnergy,
      heatingPrimaryEnergy,
      coolingPrimaryEnergy,
      heatPumpCop: uniTotals?.heatPumpCop,
      pvGeneration,
      pvSelfConsumption,
      pvGridExport,
      pvSelfConsumptionRate: pvIndicators?.self_consumption_rate,
      pvSelfSufficiencyRate: pvIndicators?.self_sufficiency_rate,
      intensity: epcRating.intensity,
      epcBasis: epcRating.basis,
      epcClass: getEPCClass(epcRating.intensity),
    };
  }

  /**
   * Assemble a `RenovationScenario` from scenario metadata and area-scaled
   * energy figures. Optional energy fields are omitted when undefined. Shared
   * by the baseline and package paths.
   */
  private assembleScenario(
    meta: {
      id: ScenarioId;
      packageId: string | null;
      label: string;
      measureIds: RenovationMeasureId[];
      measures: string[];
      comfortIndex: number;
      flexibilityIndex: number;
    },
    energy: EcmScenarioEnergy,
  ): RenovationScenario {
    return {
      id: meta.id,
      packageId: meta.packageId,
      label: meta.label,
      epcClass: energy.epcClass,
      annualEnergyNeeds: Math.round(energy.scaledHvac),
      heatingCoolingNeeds: Math.round(energy.scaledHvac),
      ...(energy.deliveredTotal !== undefined
        ? {
            deliveredTotal: Math.round(energy.deliveredTotal),
            ...(energy.carrierBreakdown !== undefined
              ? {
                  carrierBreakdown: {
                    naturalGasKwh: Math.round(
                      energy.carrierBreakdown.naturalGasKwh,
                    ),
                    gridElectricityKwh: Math.round(
                      energy.carrierBreakdown.gridElectricityKwh,
                    ),
                  },
                }
              : {}),
          }
        : {}),
      ...(energy.primaryEnergy !== undefined
        ? { primaryEnergy: Math.round(energy.primaryEnergy) }
        : {}),
      epcEnergyIntensity: Math.round(energy.intensity),
      epcEnergyBasis: energy.epcBasis,
      ...(energy.heatingPrimaryEnergy !== undefined
        ? { heatingPrimaryEnergy: Math.round(energy.heatingPrimaryEnergy) }
        : {}),
      ...(energy.coolingPrimaryEnergy !== undefined
        ? { coolingPrimaryEnergy: Math.round(energy.coolingPrimaryEnergy) }
        : {}),
      ...(energy.heatPumpCop !== undefined
        ? { heatPumpCop: energy.heatPumpCop }
        : {}),
      ...(energy.pvGeneration !== undefined
        ? { pvGeneration: Math.round(energy.pvGeneration) }
        : {}),
      ...(energy.pvSelfConsumption !== undefined
        ? { pvSelfConsumption: Math.round(energy.pvSelfConsumption) }
        : {}),
      ...(energy.pvGridExport !== undefined
        ? { pvGridExport: Math.round(energy.pvGridExport) }
        : {}),
      ...(energy.pvSelfConsumptionRate !== undefined
        ? { pvSelfConsumptionRate: energy.pvSelfConsumptionRate }
        : {}),
      ...(energy.pvSelfSufficiencyRate !== undefined
        ? { pvSelfSufficiencyRate: energy.pvSelfSufficiencyRate }
        : {}),
      comfortIndex: meta.comfortIndex,
      flexibilityIndex: meta.flexibilityIndex,
      measureIds: meta.measureIds,
      measures: meta.measures,
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
