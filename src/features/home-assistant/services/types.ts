/**
 * Service interfaces for the Home Renovation Assistant.
 * These define the contracts between the UI and data layer (mock or real API).
 */

import type {
  BuildingInfo,
  EstimationResult,
  FinancialResults,
  FinancialScenario,
  FundingOptions,
  MCDARankingResult,
  PackageId,
  RenovationScenario,
  ScenarioId,
} from "../context/types";

// ─────────────────────────────────────────────────────────────────────────────
// Building Service Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface BuildingOptions {
  countries: SelectOption[];
  climateZones: SelectOption[];
  buildingTypes: SelectOption[];
  constructionPeriods: SelectOption[];
  epcClasses: string[];
  heatingTechnologies: SelectOption[];
  coolingTechnologies: SelectOption[];
  hotWaterTechnologies: SelectOption[];
  glazingTechnologies: SelectOption[];
}

export interface IBuildingService {
  /**
   * Get all dropdown options for building inputs
   */
  getOptions(): BuildingOptions;

  /**
   * Get default building values for a specific country
   */
  getDefaultsForCountry(country: string): Partial<BuildingInfo>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy Service Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IEnergyService {
  /**
   * Estimate EPC and energy consumption based on building characteristics.
   * Returns a promise to allow for async API calls in the future.
   */
  estimateEPC(building: BuildingInfo): Promise<EstimationResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renovation Service Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RenovationIntervention {
  id: string;
  name: string;
  description: string;
  costPerSqm: number;
  energySavingsPercent: number;
  epcImpact: number; // Improvement in EPC "steps" (e.g., 0.5 = half a class)
  defaultSelected: boolean;
}

export interface RenovationPackage {
  id: PackageId;
  name: string;
  description: string;
  maxCostPerSqm: number;
  defaultCostPerSqm: number;
  interventions: RenovationIntervention[];
}

export interface IRenovationService {
  /**
   * Get all available renovation packages
   */
  getPackages(): RenovationPackage[];

  /**
   * Get a specific package by ID
   */
  getPackage(packageId: PackageId): RenovationPackage | undefined;

  /**
   * Calculate the total cost for a package with selected interventions
   */
  calculateCost(
    packageId: PackageId,
    selectedInterventionIds: string[],
    floorArea: number,
  ): number;

  /**
   * Get the default interventions for a package (those with defaultSelected: true)
   */
  getDefaultInterventions(packageId: PackageId): string[];

  /**
   * Evaluate renovation scenarios based on current building and selections.
   * Returns scenarios with projected improvements.
   */
  evaluateScenarios(
    building: BuildingInfo,
    estimation: EstimationResult,
    selectedPackages: PackageId[],
    interventions: Record<PackageId, string[]>,
    costs: Record<PackageId, number>,
  ): Promise<RenovationScenario[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial Service Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialCalculationInput {
  renovationCost: number; // Total cost in EUR
  annualEnergySavings: number; // EUR/year
  fundingOptions: FundingOptions;
  scenario: FinancialScenario;
  floorArea: number;
  currentEPC: string;
  targetEPC: string;
}

export interface IFinancialService {
  /**
   * Calculate financial indicators for a renovation scenario
   */
  calculate(input: FinancialCalculationInput): Promise<FinancialResults>;

  /**
   * Calculate financial results for all scenarios
   */
  calculateForAllScenarios(
    scenarios: RenovationScenario[],
    fundingOptions: FundingOptions,
    floorArea: number,
    currentEstimation: EstimationResult,
    financialScenario: FinancialScenario,
    costs: Record<PackageId, number>,
  ): Promise<Record<ScenarioId, FinancialResults>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MCDA Service Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MCDAPersona {
  id: string;
  name: string;
  description: string;
  weights: {
    energyEfficiency: number;
    resIntegration: number;
    sustainability: number;
    userComfort: number;
    financial: number;
  };
}

export interface IMCDAService {
  /**
   * Get all available MCDA personas
   */
  getPersonas(): MCDAPersona[];

  /**
   * Get a specific persona by ID
   */
  getPersona(personaId: string): MCDAPersona | undefined;

  /**
   * Rank scenarios using TOPSIS algorithm with persona weights.
   * Returns rankings sorted by rank (1 = best).
   */
  rank(
    scenarios: RenovationScenario[],
    financialResults: Record<ScenarioId, FinancialResults>,
    personaId: string,
  ): Promise<MCDARankingResult[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated Service Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IHomeAssistantServices {
  building: IBuildingService;
  energy: IEnergyService;
  renovation: IRenovationService;
  financial: IFinancialService;
  mcda: IMCDAService;
}
