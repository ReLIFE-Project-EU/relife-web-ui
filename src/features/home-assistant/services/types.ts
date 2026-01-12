/**
 * Service interfaces for the Home Renovation Assistant.
 * These define the contracts between the UI and data layer (mock or real API).
 *
 * TBD INTEGRATION NOTES
 * =====================
 * Financial API types are aligned with api-specs/20260108-125427/financial.json
 * Pending integrations:
 * - [ ] Forecasting API: Project-based workflow (see IEnergyService)
 * - [ ] Technical API: 5 pillar endpoints (see IMCDAService)
 *
 * Reference: api-specs/20260108-125427/
 */

import type {
  ARVResult,
  BuildingInfo,
  EstimationResult,
  FinancialResults,
  FinancialScenario,
  FundingOptions,
  MCDARankingResult,
  PackageId,
  RenovationScenario,
  RiskAssessmentMetadata,
  RiskAssessmentPointForecasts,
  ScenarioId,
} from "../context/types";
import type { APIEnergyClass, APIPropertyType, OutputLevel } from "../utils";

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
  heatingTechnologies: SelectOption[];
  coolingTechnologies: SelectOption[];
  hotWaterTechnologies: SelectOption[];
  glazingTechnologies: SelectOption[];
  // Note: EPC classes are NOT included here as EPC is not a user input.
  // EPC is calculated by the Forecasting API based on building characteristics.
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
// TBD: Forecasting API uses project-based workflow:
//   POST /project -> PUT /building -> PUT /plant -> POST /simulate -> GET /epc
// ─────────────────────────────────────────────────────────────────────────────

export interface IEnergyService {
  /**
   * Estimate EPC and energy consumption based on building characteristics.
   * Returns a promise to allow for async API calls in the future.
   *
   * TBD: When Forecasting API integration is ready, this should:
   * 1. Create a project (POST /project)
   * 2. Upload building data (PUT /project/{id}/building)
   * 3. Upload plant data (PUT /project/{id}/plant)
   * 4. Run simulation (POST /project/{id}/simulate) - requires EPW weather file
   * 5. Get EPC result (GET /project/{id}/epc)
   *
   * The mock implementation derives values from building characteristics.
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
// Aligned with api-specs/20260108-125427/financial.json
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request for POST /arv endpoint
 * Calculates After Renovation Value based on property characteristics
 */
export interface ARVRequest {
  lat: number; // -90 to 90
  lng: number; // -180 to 180
  floor_area: number; // m², > 0
  construction_year: number; // 1800-2030
  floor_number?: number | null; // Optional, for apartments (0 = ground floor)
  number_of_floors: number; // 1-100
  property_type: APIPropertyType; // API enum value
  energy_class: APIEnergyClass; // Greek EPC label (after renovation)
  renovated_last_5_years?: boolean; // Default: true
}

/**
 * Request for POST /risk-assessment endpoint
 * Monte Carlo simulation for financial risk analysis
 */
export interface RiskAssessmentRequest {
  annual_energy_savings: number; // kWh/year, from Forecasting API
  project_lifetime: number; // 1-30 years
  output_level: OutputLevel; // "private" for HRA tool
  indicators?: string[]; // Default: ["IRR", "NPV", "PBP", "DPP", "ROI"]
  loan_amount?: number; // Default: 0
  loan_term?: number; // Default: 0 (years)
  // capex and annual_maintenance_cost are optional
  // API retrieves from internal dataset if not provided
  capex?: number;
  annual_maintenance_cost?: number;
  include_visualizations?: boolean; // Override for visualizations
}

/**
 * Response from POST /risk-assessment for output_level: "private"
 */
export interface RiskAssessmentResponse {
  pointForecasts: RiskAssessmentPointForecasts;
  metadata: RiskAssessmentMetadata;
  cashFlowVisualization?: string; // base64 PNG
}

export interface IFinancialService {
  /**
   * Calculate After Renovation Value (ARV)
   * Maps to POST /arv endpoint
   */
  calculateARV(request: ARVRequest): Promise<ARVResult>;

  /**
   * Perform risk assessment with Monte Carlo simulation
   * Maps to POST /risk-assessment endpoint
   */
  assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResponse>;

  /**
   * Calculate financial results for all scenarios
   * Uses calculateARV and assessRisk internally
   */
  calculateForAllScenarios(
    scenarios: RenovationScenario[],
    fundingOptions: FundingOptions,
    floorArea: number,
    currentEstimation: EstimationResult,
    financialScenario: FinancialScenario,
    costs: Record<PackageId, number>,
    building: BuildingInfo,
  ): Promise<Record<ScenarioId, FinancialResults>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MCDA Service Types
// TBD: Technical API provides 5 separate pillar endpoints:
//   POST /technical/ee  - Energy Efficiency
//   POST /financial/rei - Renewable Energy Integration
//   POST /technical/sei - Sustainability & Environmental Impact
//   POST /technical/uc  - User Comfort
//   POST /technical/fv  - Financial Viability
// Current mock implements TOPSIS locally; future: call API endpoints
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

/**
 * TBD: Technical API pillar request structure
 * Each pillar endpoint expects KPI values with min/max bounds and a profile
 */
export interface TechnicalPillarRequest {
  profile: string; // Persona ID
  // Each pillar has specific KPI fields with _kpi, _min, _max suffixes
  // See api-specs/20260108-125427/technical.json for full schemas
}

/**
 * TBD: Technical API pillar response structure
 */
export interface TechnicalPillarResponse {
  kpiWeight: number; // Normalized weight for this pillar
  // Plus individual normalized values for each criterion
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
   *
   * TBD: When Technical API integration is ready, this should:
   * 1. Extract KPIs from scenarios and financial results
   * 2. Call each pillar endpoint (/ee, /rei, /sei, /uc, /fv)
   * 3. Aggregate pillar weights into final ranking
   *
   * Current mock implements TOPSIS algorithm locally.
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
