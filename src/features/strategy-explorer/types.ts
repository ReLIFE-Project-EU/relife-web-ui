import type {
  RenovationMeasureId,
  RiskAssessmentPercentiles,
} from "../../types/renovation";
import type { ArchetypeDetails } from "../../types/archetype";
import type {
  RSE_CACHE_PAYLOAD_SCHEMA_VERSION,
  RSE_COST_BASIS,
  RSE_FINANCIAL_DEFAULTS,
  RSE_MVP_THERMAL_EMISSION_SOURCE,
} from "./constants";
import type {
  RSECacheSource,
  RSECo2Method,
  RSECostSource,
  RSEEmissionEnergySource,
  RSEPackageId,
  RSEUnavailableReason,
} from "./constants";

export type {
  RSECacheSource,
  RSECacheStatus,
  RSECo2Method,
  RSECostBasisKind,
  RSECostSource,
  RSEEmissionEnergySource,
  RSEPackageId,
  RSESupportedEmissionFactorCountry,
  RSEUnavailableReason,
} from "./constants";

export interface RSEArchetypeRef {
  country: string;
  category: string;
  name: string;
}

export interface RSEArchetypeSelection {
  archetype: RSEArchetypeRef;
  buildingCount: number;
}

export interface RSEPortfolioDefinition {
  selections: RSEArchetypeSelection[];
}

export interface RSEExpandedPortfolioSelection extends RSEArchetypeSelection {
  details: ArchetypeDetails;
}

export type RSERenovationGoal =
  | { kind: "financial"; maxBudgetEur: number }
  | { kind: "energy" }
  | { kind: "emission" };

export type RSECostBasis =
  | { kind: typeof RSE_COST_BASIS.floorArea; value: number }
  | {
      kind: typeof RSE_COST_BASIS.surfaceArea;
      value: number;
      surface: "wall" | "roof" | "floor" | "window";
    }
  | { kind: typeof RSE_COST_BASIS.building; value: number }
  | { kind: typeof RSE_COST_BASIS.pvCapacity; value: number };

export interface RSEMeasureCostAssumption {
  measureId: RenovationMeasureId;
  capex: RSECostBasis;
  annualMaintenance: RSECostBasis;
  source: RSECostSource;
  sourceNote: string;
}

export interface RSEPackageDefinition {
  id: RSEPackageId;
  label: string;
  measureIds: RenovationMeasureId[];
  costAssumptions: RSEMeasureCostAssumption[];
}

export interface RSEForecastingCacheKey {
  archetype: RSEArchetypeRef;
  packageId: RSEPackageId;
  cacheVersion: string;
}

export interface RSEForecastingCacheEntry {
  key: RSEForecastingCacheKey;
  payloadSchemaVersion: typeof RSE_CACHE_PAYLOAD_SCHEMA_VERSION;
  baseline: RSEForecastingScenarioSnapshot;
  renovated: RSEForecastingScenarioSnapshot;
  co2Comparison: RSEEmissionComparisonSnapshot;
  generatedAt: string;
  provenance: RSECacheEntryProvenance;
}

export interface RSEForecastingScenarioSnapshot {
  annualEnergyKwh: number;
  /** Low-confidence frontend display convenience only. Not a legal EPC. */
  displayEpcClass: string;
  primaryEnergyUni11300Summary: Record<string, unknown>;
  pvHpSummary?: Record<string, unknown>;
  co2Inputs: RSEEmissionScenarioInput[];
  co2Components?: RSEEmissionResult[];
  co2: RSEScenarioCo2Summary;
}

export interface RSEScenarioCo2Summary {
  annualConsumptionKwh: number;
  annualEmissionsKgCo2eq: number;
  annualEmissionsTonCo2eq: number;
  weightedEmissionFactorKgPerKwh: number;
  equivalentTrees: number;
  equivalentKmCar: number;
  sourceBreakdownKwh: {
    naturalGas: number;
    gridElectricity: number;
    solarPv: number;
  };
  thermalEmissionSource: typeof RSE_MVP_THERMAL_EMISSION_SOURCE;
}

export interface RSEEmissionComparisonSnapshot {
  baselineAnnualEmissionsKgCo2eq: number;
  renovatedAnnualEmissionsKgCo2eq: number;
  savings: {
    absoluteKgCo2eq: number;
    absoluteTonCo2eq: number;
    percentage: number;
  };
}

export interface RSECacheEntryProvenance {
  source: RSECacheSource;
  forecastingServiceVersion?: string;
  co2ComputedAt: string;
  co2Method: RSECo2Method;
  emissionFactorCountry: string;
  notes?: string;
}

export interface RSESimulationResult {
  key: RSEForecastingCacheKey;
  archetype: RSEArchetypeRef;
  packageId: RSEPackageId;
  cacheVersion: string;
  baselineAnnualEnergyKwh: number;
  renovatedAnnualEnergyKwh: number;
  annualEnergySavingsKwh: number;
  annualEnergySavingsPercentage: number;
  baselineAnnualEmissionsTonCo2eq: number;
  renovatedAnnualEmissionsTonCo2eq: number;
  annualCo2ReductionTon: number;
  annualCo2ReductionPercentage: number;
  /** Low-confidence frontend display convenience only. Not a legal EPC. */
  baselineDisplayEpcClass: string;
  /** Low-confidence frontend display convenience only. Not a legal EPC. */
  renovatedDisplayEpcClass: string;
  generatedAt: string;
  provenance: RSECacheEntryProvenance;
}

/**
 * Mirrors the Forecasting service ScenarioInput Pydantic model. Keep snake_case.
 */
export interface RSEEmissionScenarioInput {
  name: string;
  energy_source: RSEEmissionEnergySource;
  annual_consumption_kwh: number;
  country: string;
}

/**
 * Mirrors the Forecasting service EmissionResult Pydantic model. Keep snake_case.
 */
export interface RSEEmissionResult {
  name: string;
  energy_source: string;
  annual_consumption_kwh: number;
  emission_factor_kg_per_kwh: number;
  annual_emissions_kg_co2eq: number;
  annual_emissions_ton_co2eq: number;
  equivalent_trees: number;
  equivalent_km_car: number;
}

/**
 * Mirrors the Forecasting service SavingResult Pydantic model. Keep snake_case.
 */
export interface RSEEmissionSavingResult {
  scenario_name: string;
  absolute_kg_co2eq: number;
  absolute_ton_co2eq: number;
  percentage: number;
}

export interface RSEFinancialAssumptions {
  projectLifetimeYears: number;
  financingType: typeof RSE_FINANCIAL_DEFAULTS.financingType;
  upfrontIncentivePercentage: number;
}

export interface RSEFinancialResult {
  archetype: RSEArchetypeRef;
  packageId: RSEPackageId;
  /** Gross per-building CAPEX before incentives (display basis). */
  capexEur: number;
  /**
   * Per-building CAPEX after the upfront incentive — the value actually sent
   * to the Financial API, so the basis of every point forecast below.
   */
  effectiveCapexEur: number;
  annualMaintenanceEur: number;
  annualEnergySavingsKwh: number;
  status: "available" | "unavailable";
  unavailableReason?: RSEUnavailableReason;
  unavailableMessage?: string;
  pointForecasts: {
    NPV?: number;
    IRR?: number;
    ROI?: number;
    PBP?: number;
    DPP?: number;
  };
  percentiles?: RiskAssessmentPercentiles;
  probabilities?: Record<string, number>;
  /**
   * P50 per-building net cash flow by year; index 0 is the negative effective
   * CAPEX. Used to build the pooled package cash-flow series for aggregate
   * payback.
   */
  cashFlow?: {
    years: number[];
    annualNetCashFlowEur: number[];
  };
}

export interface RSEPackageAggregate {
  packageId: RSEPackageId;
  totalBuildings: number;
  renovatableBuildingsWithinBudget?: number;
  renovatableBuildingEquivalent?: number;
  /** Gross investment before incentives (display basis). */
  totalCapexEur: number;
  /** Post-incentive investment; basis of €-ratios, budget fit, and ROI. */
  totalEffectiveCapexEur: number;
  totalAnnualMaintenanceEur: number;
  totalAnnualEnergySavingsKwh: number;
  totalAnnualCo2ReductionTon: number;
  energySavedPerEur: number;
  co2ReducedTonPerEur: number;
  financialIndicators: {
    aggregateNPV?: number;
    aggregateROI?: number;
    aggregatePaybackYears?: number;
    perArchetypeOnly?: {
      IRR?: Record<string, number>;
      PBP?: Record<string, number>;
      DPP?: Record<string, number>;
    };
  };
}

export interface RSERankingResult {
  packageId: RSEPackageId;
  rank: number;
  score: number;
  scoreComponents: Record<string, number>;
  explanation: string;
}

export interface RSEWorkflowRequest {
  portfolio: RSEPortfolioDefinition;
  goal: RSERenovationGoal;
  packageIds: RSEPackageId[];
  financialAssumptions: RSEFinancialAssumptions;
}

export interface RSEWorkflowResult {
  request: RSEWorkflowRequest;
  cacheVersion: string;
  packageAggregates: RSEPackageAggregate[];
  rankings: RSERankingResult[];
  unavailableCombinations: Array<{
    archetype: RSEArchetypeRef;
    packageId: RSEPackageId;
    reason: RSEUnavailableReason;
  }>;
}
