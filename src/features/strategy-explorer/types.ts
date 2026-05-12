import type { RenovationMeasureId } from "../../types/renovation";
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
  lifetimeIncentiveAmountEur: number;
  lifetimeIncentiveYears: number;
}

export interface RSEFinancialResult {
  archetype: RSEArchetypeRef;
  packageId: RSEPackageId;
  capexEur: number;
  annualMaintenanceEur: number;
  annualEnergySavingsKwh: number;
  status: "available" | "unavailable";
  unavailableReason?: "non-positive-energy-savings";
  unavailableMessage?: string;
  pointForecasts: {
    NPV?: number;
    IRR?: number;
    ROI?: number;
    PBP?: number;
    DPP?: number;
  };
  percentiles?: Record<string, Record<string, number>>;
  probabilities?: Record<string, number>;
}

export interface RSEPackageAggregate {
  packageId: RSEPackageId;
  totalBuildings: number;
  renovatableBuildingsWithinBudget?: number;
  renovatableBuildingEquivalent?: number;
  totalCapexEur: number;
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
    reason: string;
  }>;
}
