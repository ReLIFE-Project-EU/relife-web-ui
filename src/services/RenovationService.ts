/**
 * Renovation Service - Forecasting API implementation for HRA/PRA package
 * evaluation. HRA supports envelope, system-only, and selected mixed
 * envelope + system comparisons. Ranking eligibility is based on available
 * MCDA inputs, not measure category.
 */

import { forecasting } from "../api";
import type { ECMScenario, EmissionFactorResponse } from "../types/forecasting";
import type {
  BuildingInfo,
  EstimationResult,
  RenovationMeasureId,
  RenovationPackage,
  RenovationScenario,
  ScenarioId,
} from "../types/renovation";
import { computeOperationalEmissionsTonCo2e } from "./carrierSavingsService";
import { getCountryCode } from "../utils/countries";
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
import { reduceEcmRun, type ScenarioEnergy } from "./scenarioEnergy";
import {
  simulatedFloorArea,
  type SimulatedBuilding,
} from "./simulatedBuilding";
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
const DALY_THRESHOLD_PAIR = "COMFORT_PAIR_26_20" as const;
const DALY_POPULATION_PERSONS = 1;
const DALY_EXPOSURE_DAYS = 365;

export class RenovationService implements IRenovationService {
  /**
   * Emission-factor fetches keyed by requested country. Factor tables are
   * static per country, and PRA shares one service instance across a
   * concurrent portfolio run, so caching the in-flight promise collapses N
   * identical requests into one. Rejections are evicted so a transient
   * failure on one building does not disable emissions for the rest.
   */
  private emissionFactorsByCountry = new Map<
    string,
    Promise<EmissionFactorResponse>
  >();

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
        baselineDeliveredTotal: estimation.baseline.deliveredTotal,
        archetype: {
          ...estimation.simulated.archetype,
          matchStrategy: estimation.matchStrategy,
        },
      },
      auditCtx,
    );

    // The baseline and the packages must come from the same engine, or
    // low-impact measures produce spurious negative savings.
    const baseline = this.buildBaselineScenario(estimation, auditCtx);
    const baselineDaly = await this.tryCalculateAnnualThermalDaly(
      estimation.baseline.dailyMeanOperativeTemperatures,
      auditCtx?.child({ scenarioId: "current" }),
    );
    if (baselineDaly !== undefined) {
      baseline.annualThermalDalyPerPerson = baselineDaly;
    }

    const packageScenarios = await mapWithConcurrencyLimit(
      packages,
      FORECASTING_SCENARIO_CONCURRENCY_LIMIT,
      (pkg) =>
        this.evaluatePackageScenario(estimation, pkg, baselineDaly, auditCtx),
    );

    const scenarios = [baseline, ...packageScenarios];

    await this.annotateScenarioEmissions(building, scenarios, auditCtx);

    auditLog.info(
      "renovation",
      "renovation.evaluate.end",
      { scenarios: scenarios.map((s) => s.id) },
      auditCtx,
    );

    return scenarios;
  }

  /**
   * Attach operational CO₂e emissions (t CO₂e/year) to each scenario with a
   * carrier breakdown, using Forecasting emission factors fetched once per
   * run. Heat-pump scenarios carry all consumption as grid electricity, so
   * they are valued at the grid factor rather than `heat_pump_electric`,
   * consistent with the RSE carrier mapping. Emissions are optional: any
   * failure leaves the scenarios unannotated instead of failing the run.
   */
  private async annotateScenarioEmissions(
    building: BuildingInfo,
    scenarios: RenovationScenario[],
    auditCtx?: AuditCtx,
  ): Promise<void> {
    try {
      // building.country holds a display name ("Italy"); the emission-factor
      // endpoint expects an ISO code, with unsupported codes resolved to the
      // default factor country by the API wrapper.
      const country = getCountryCode(building.country) ?? building.country;
      const factors = await this.getEmissionFactorsCached(country);

      auditLog.debug(
        "renovation",
        "renovation.emissions.factors",
        { requestedCountry: country, response: factors },
        auditCtx,
      );

      for (const scenario of scenarios) {
        if (!scenario.carrierBreakdown) {
          continue;
        }

        scenario.annualEmissionsTonCo2e = computeOperationalEmissionsTonCo2e(
          scenario.carrierBreakdown,
          factors.emission_factors_kg_co2eq_per_kwh,
          scenario.pvSelfConsumption,
        );
      }

      auditLog.info(
        "renovation",
        "renovation.emissions.end",
        {
          factorCountry: factors.country,
          emissionsTonCo2eById: Object.fromEntries(
            scenarios.map((s) => [s.id, s.annualEmissionsTonCo2e]),
          ),
        },
        auditCtx,
      );
    } catch (error) {
      auditLog.warn(
        "renovation",
        "renovation.emissions.unavailable",
        { error: error instanceof Error ? error.message : String(error) },
        auditCtx,
      );
    }
  }

  private getEmissionFactorsCached(
    country: string,
  ): Promise<EmissionFactorResponse> {
    const cached = this.emissionFactorsByCountry.get(country);
    if (cached) {
      return cached;
    }

    const pending = forecasting.getEmissionFactors(country);
    this.emissionFactorsByCountry.set(country, pending);
    pending.catch(() => {
      this.emissionFactorsByCountry.delete(country);
    });

    return pending;
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
    estimation: EstimationResult,
    renovationPackage: RenovationPackage,
    baselineDaly: number | undefined,
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
      estimation.simulated,
    );
    auditLog.debug(
      "renovation",
      "renovation.ecm.params",
      { ecmParams },
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

    const energy = reduceEcmRun(renovatedScenario, estimation.simulated);
    this.logEcmScaling(energy, estimation.simulated, auditCtx);

    const scenario = this.assembleScenario(
      {
        id: renovationPackage.id,
        packageId: renovationPackage.id,
        label: renovationPackage.label,
        measureIds: renovationPackage.measureIds,
        measures: renovationPackage.measureIds.map(
          (measureId) => this.getMeasure(measureId)?.name ?? measureId,
        ),
        // Comfort from the simulated hourly operative temperature (share of
        // hours in the comfort band); falls back to the estimation scorecard
        // only when the simulation returned no usable T_op series.
        comfortIndex: energy.comfortBandIndex ?? estimation.comfortIndex,
        flexibilityIndex: estimation.flexibilityIndex,
      },
      energy,
    );

    if (baselineDaly !== undefined) {
      const renovatedDaly = await this.tryCalculateAnnualThermalDaly(
        energy.dailyMeanOperativeTemperatures,
        auditCtx,
      );
      if (renovatedDaly !== undefined) {
        scenario.annualThermalDalyPerPerson = renovatedDaly;
        scenario.avoidedThermalDalyPerPerson = baselineDaly - renovatedDaly;
      }
    }

    auditLog.info(
      "renovation",
      "renovation.scenario.end",
      {
        packageId: renovationPackage.id,
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
        annualThermalDalyPerPerson: scenario.annualThermalDalyPerPerson,
        avoidedThermalDalyPerPerson: scenario.avoidedThermalDalyPerPerson,
      },
      auditCtx,
    );

    return scenario;
  }

  private async tryCalculateAnnualThermalDaly(
    temperatures: number[] | undefined,
    auditCtx?: AuditCtx,
  ): Promise<number | undefined> {
    auditLog.info(
      "renovation",
      "renovation.daly.start",
      {
        thresholdPair: DALY_THRESHOLD_PAIR,
        populationPersons: DALY_POPULATION_PERSONS,
        exposureDays: DALY_EXPOSURE_DAYS,
      },
      auditCtx,
    );

    if (temperatures === undefined) {
      auditLog.warn(
        "renovation",
        "renovation.daly.unavailable",
        { reason: "invalid-temperature-profile" },
        auditCtx,
      );
      auditLog.info(
        "renovation",
        "renovation.daly.end",
        { available: false, reason: "invalid-temperature-profile" },
        auditCtx,
      );
      return undefined;
    }

    const request = {
      temperatures_c: temperatures,
      selected_threshold_pair: DALY_THRESHOLD_PAIR,
      population_persons: DALY_POPULATION_PERSONS,
      exposure_days_for_period: DALY_EXPOSURE_DAYS,
    };

    auditLog.debug(
      "renovation",
      "renovation.daly.request",
      { request },
      auditCtx,
    );

    try {
      const response = await forecasting.calculateHeatColdDaly(request);
      auditLog.debug(
        "renovation",
        "renovation.daly.response",
        { response },
        auditCtx,
      );

      const annualDaly = response.annual_period_total_harm_for_population;
      if (typeof annualDaly !== "number" || !Number.isFinite(annualDaly)) {
        auditLog.warn(
          "renovation",
          "renovation.daly.unavailable",
          { reason: "invalid-api-response", annualDaly },
          auditCtx,
        );
        auditLog.info(
          "renovation",
          "renovation.daly.end",
          { available: false, reason: "invalid-api-response" },
          auditCtx,
        );
        return undefined;
      }

      auditLog.info(
        "renovation",
        "renovation.daly.end",
        { available: true, annualDalyPerPerson: annualDaly },
        auditCtx,
      );
      return annualDaly;
    } catch (error) {
      auditLog.error(
        "renovation",
        "renovation.daly.failed",
        { error: error instanceof Error ? error.message : String(error) },
        auditCtx,
      );
      auditLog.info(
        "renovation",
        "renovation.daly.end",
        { available: false, reason: "api-failure" },
        auditCtx,
      );
      return undefined;
    }
  }

  /**
   * The "current" scenario from the estimate's baseline, which came from the
   * same ECM engine as the renovated packages.
   */
  private buildBaselineScenario(
    estimation: EstimationResult,
    parentCtx?: AuditCtx,
  ): RenovationScenario {
    const auditCtx = parentCtx?.child({ scenarioId: "current" });

    auditLog.info(
      "renovation",
      "renovation.scenario.start",
      { packageId: "current", packageLabel: "Current Status", measureIds: [] },
      auditCtx,
    );

    const energy = estimation.baseline;
    this.logEcmScaling(energy, estimation.simulated, auditCtx);

    const scenario = this.assembleScenario(
      {
        id: "current",
        packageId: null,
        label: "Current Status",
        measureIds: [],
        measures: [],
        // Same simulated comfort-band basis as the renovated scenarios, so the
        // baseline and packages are compared on a like-for-like metric.
        comfortIndex: energy.comfortBandIndex ?? estimation.comfortIndex,
        flexibilityIndex: estimation.flexibilityIndex,
      },
      energy,
    );

    auditLog.info(
      "renovation",
      "renovation.scenario.end",
      {
        packageId: "current",
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

  /** Emits the `renovation.ecm.scaling` debug trace for one scenario. */
  private logEcmScaling(
    energy: ScenarioEnergy,
    simulated: SimulatedBuilding,
    auditCtx?: AuditCtx,
  ): void {
    const { raw, scaled } = energy.trace;
    auditLog.debug(
      "renovation",
      "renovation.ecm.scaling",
      {
        userArea: simulated.modeledFloorArea,
        archetypeFloorArea: simulatedFloorArea(simulated),
        areaScaleFactor: energy.trace.areaScaleFactor,
        raw: {
          hvacTotal: raw.hvac,
          deliveredTotal: raw.deliveredTotal,
          carrierBreakdown: raw.carrierBreakdown,
          primaryEnergy: raw.primaryEnergy,
          pvGeneration: raw.pvGeneration,
          pvSelfConsumption: raw.pvSelfConsumption,
        },
        scaled: {
          hvacTotal: scaled.hvac,
          deliveredTotal: scaled.deliveredTotal,
          carrierBreakdown: scaled.carrierBreakdown,
          primaryEnergy: scaled.primaryEnergy,
          pvGeneration: scaled.pvGeneration,
          pvSelfConsumption: scaled.pvSelfConsumption,
          pvGridExport: scaled.pvGridExport,
        },
        renovatedIntensity: energy.trace.epcIntensity,
        uniTotalsAvailable: raw.deliveredTotal !== undefined,
        uniSummary: energy.trace.uniSummary,
        pvSelfConsumptionApplied: scaled.pvSelfConsumption !== undefined,
      },
      auditCtx,
    );
  }

  /**
   * Assemble a `RenovationScenario` from scenario metadata and its scenario
   * energy. Shared by the baseline and package paths.
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
    energy: ScenarioEnergy,
  ): RenovationScenario {
    return {
      id: meta.id,
      packageId: meta.packageId,
      label: meta.label,
      annualEnergyNeeds: energy.thermalNeed,
      heatingCoolingNeeds: energy.thermalNeed,
      deliveredTotal: energy.deliveredTotal,
      carrierBreakdown: energy.carrierBreakdown,
      primaryEnergy: energy.primaryEnergy,
      heatingPrimaryEnergy: energy.heatingPrimaryEnergy,
      coolingPrimaryEnergy: energy.coolingPrimaryEnergy,
      heatPumpCop: energy.heatPumpCop,
      pvGeneration: energy.pvGeneration,
      pvSelfConsumption: energy.pvSelfConsumption,
      pvGridExport: energy.pvGridExport,
      pvSelfConsumptionRate: energy.pvSelfConsumptionRate,
      pvSelfSufficiencyRate: energy.pvSelfSufficiencyRate,
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
