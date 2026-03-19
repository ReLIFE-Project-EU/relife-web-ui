/**
 * Shared service interfaces for renovation tools.
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
  CashFlowData,
  EstimationResult,
  FinancialResults,
  FundingOptions,
  MCDARankingResult,
  PackageFinancialInputsById,
  RenovationPackage,
  RenovationMeasureId,
  RenovationScenario,
  RiskAssessmentMetadata,
  RiskAssessmentPercentiles,
  RiskAssessmentPointForecasts,
  ScenarioId,
} from "../types/renovation";
import type {
  APIEnergyClass,
  APIPropertyType,
  OutputLevel,
} from "../utils/apiMappings";

// ─────────────────────────────────────────────────────────────────────────────
// Building Service Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export type PeriodAvailabilityScope = "local" | "fallback";

export type PeriodAvailabilityReason =
  | "normalized-country-alias"
  | "no-local-archetypes"
  | "no-local-periods"
  | null;

export interface PeriodAvailabilityResult {
  periods: string[];
  recommendedPeriod: string | null;
  detectedCountry: string | null;
  sourceCountry: string | null;
  scope: PeriodAvailabilityScope;
  reason: PeriodAvailabilityReason;
}

export interface BuildingOptions {
  countries: SelectOption[];
  buildingTypes: SelectOption[];
  constructionPeriods: SelectOption[];
  // Deprecated fields (kept for backward compatibility, return empty arrays)
  climateZones: SelectOption[];
  heatingTechnologies: SelectOption[];
  coolingTechnologies: SelectOption[];
  hotWaterTechnologies: SelectOption[];
  glazingTechnologies: SelectOption[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Archetype Matching Types
// ─────────────────────────────────────────────────────────────────────────────

export type MatchQuality = "excellent" | "good" | "approximate";

export interface ArchetypeScoreBreakdown {
  countryScore: number;
  periodScore: number;
  geoScore: number;
  total: number;
}

export interface ArchetypeMatchAlternative {
  archetype: import("../types/forecasting").ArchetypeInfo;
  matchQuality: MatchQuality;
  score: number;
}

/**
 * Rich result from archetype matching, providing transparency
 * about why a particular archetype was selected.
 */
export interface ArchetypeMatchResult {
  archetype: import("../types/forecasting").ArchetypeInfo;
  detectedCountry: string | null;
  matchQuality: MatchQuality;
  periodRelaxed: boolean;
  score: number;
  scoreBreakdown: ArchetypeScoreBreakdown;
  alternatives: ArchetypeMatchAlternative[];
}

export interface IBuildingService {
  /**
   * Get all dropdown options for building inputs
   * Now async since options are derived from API archetypes
   */
  getOptions(): Promise<BuildingOptions>;

  /**
   * Get available archetypes (optionally filtered)
   */
  getArchetypes(
    country?: string,
    category?: string,
  ): Promise<import("../types/forecasting").ArchetypeInfo[]>;

  /**
   * Find best matching archetype based on user selections.
   * Returns rich match result with score breakdown and alternatives.
   */
  findMatchingArchetype(
    category: string,
    period?: string | null,
    coords?: { lat: number; lng: number } | null,
  ): Promise<ArchetypeMatchResult | null>;

  /**
   * Get available building categories based on coordinates
   */
  getAvailableCategories(
    coords?: { lat: number; lng: number } | null,
  ): Promise<string[]>;

  /**
   * Get available construction periods for a category.
   * When country is provided, returns only periods available in that country.
   */
  getAvailablePeriods(
    category: string,
    country?: string,
  ): Promise<PeriodAvailabilityResult>;

  /**
   * Count matching archetypes for given criteria
   */
  countMatchingArchetypes(
    category?: string,
    period?: string,
    country?: string,
  ): Promise<number>;

  /**
   * Get full archetype details including BUI and System payloads
   */
  getArchetypeDetails(
    archetype: import("../types/forecasting").ArchetypeInfo,
  ): Promise<import("../types/archetype").ArchetypeDetails>;

  /**
   * Legacy helper for country defaults used by older forms.
   * Accepts an ISO country code or display name.
   */
  getDefaultsForCountry(country: string): Partial<BuildingInfo>;

  /**
   * Detect country from coordinates using bundled offline EU polygons.
   */
  detectCountryFromCoords(coords: { lat: number; lng: number }): string | null;
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
// D3.2 defines individual renovation measures that users can multi-select
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categories for grouping renovation measures in the UI
 */
export type MeasureCategory = "envelope" | "systems" | "renewable";

/**
 * Display metadata for measure categories
 */
export interface MeasureCategoryInfo {
  id: MeasureCategory;
  label: string;
  description: string;
}

/**
 * Individual renovation measure definition
 * Each measure can be independently selected by users
 *
 * NOTE: Cost and energy savings data are NOT included here.
 * Per D3.2 design document:
 * - CAPEX/costs: Retrieved from ReLIFE Database or Financial API
 * - Energy savings: Calculated by Forecasting API through building simulation
 */
export interface RenovationMeasure {
  id: RenovationMeasureId;
  name: string;
  description: string;
  /**
   * Technical description for professional users (e.g. PRA).
   * Includes API parameter targets and simulation assumptions.
   * Falls back to `description` when not set.
   */
  technicalDescription?: string;
  category: MeasureCategory;
  /**
   * Estimated energy savings range (percentage)
   * Used for UI hints before simulation
   */
  estimatedSavings?: {
    min: number;
    max: number;
  };
  /**
   * Whether this measure is currently supported by the API
   */
  isSupported: boolean;
}

export interface IRenovationService {
  /**
   * Get all available renovation measures
   */
  getMeasures(): RenovationMeasure[];

  /**
   * Get a specific measure by ID
   */
  getMeasure(measureId: RenovationMeasureId): RenovationMeasure | undefined;

  /**
   * Get all measures in a specific category
   */
  getMeasuresByCategory(category: MeasureCategory): RenovationMeasure[];

  /**
   * Get all measures that are currently supported by the backend
   */
  getSupportedMeasures(): RenovationMeasure[];

  /**
   * Get all measures that can currently participate in ranked packages.
   */
  getRankableMeasures(): RenovationMeasure[];

  /**
   * Get all measure categories with display info
   */
  getCategories(): MeasureCategoryInfo[];

  /**
   * Build package suggestions from the selected measures.
   */
  suggestPackages(selectedMeasures: RenovationMeasureId[]): RenovationPackage[];

  /**
   * Evaluate baseline + package scenarios.
   */
  evaluateScenarios(
    building: BuildingInfo,
    estimation: EstimationResult,
    packages: RenovationPackage[],
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
  upfront_incentive_percentage?: number; // 0-100
  lifetime_incentive_amount?: number; // EUR/year
  lifetime_incentive_years?: number; // years
  // Backend fallback is planned but not currently available in the live service.
  // HRA supplies these explicitly for now.
  capex?: number;
  annual_maintenance_cost?: number;
  include_visualizations?: boolean; // Override for visualizations
}

/**
 * Response from POST /risk-assessment
 * Fields populated based on output_level (per API spec):
 * - private: point_forecasts, metadata (+ cash_flow_timeline viz)
 * - professional+: adds probabilities, percentiles (P10-P90)
 * - public+: adds broader percentiles (P5-P95)
 * - complete: adds all visualizations
 */
export interface RiskAssessmentResponse {
  pointForecasts: RiskAssessmentPointForecasts;
  metadata: RiskAssessmentMetadata;
  probabilities?: Record<string, number>; // Pr(*) success metrics (professional+ output levels)
  percentiles?: RiskAssessmentPercentiles; // Full P10-P90 breakdown (public+ or when API returns it)
  cashFlowVisualization?: string; // base64 PNG
  cashFlowData?: CashFlowData;
}

export interface CalculateFinancialScenariosRequest {
  scenarios: RenovationScenario[];
  fundingOptions: FundingOptions;
  floorArea: number;
  currentEstimation: EstimationResult;
  packageFinancialInputs: PackageFinancialInputsById;
  building: BuildingInfo;
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
    request: CalculateFinancialScenariosRequest,
  ): Promise<Record<ScenarioId, FinancialResults>>;
  calculateForAllScenarios(
    scenarios: RenovationScenario[],
    fundingOptions: FundingOptions,
    floorArea: number,
    currentEstimation: EstimationResult,
    packageFinancialInputs: PackageFinancialInputsById,
    building: BuildingInfo,
  ): Promise<Record<ScenarioId, FinancialResults>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MCDA Service Types
// Technical API integration for renovation-package ranking.
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
 * @deprecated Kept only for backward-compatible type exports.
 */
export interface TechnicalPillarRequest {
  profile: string; // Persona ID
}

/**
 * @deprecated Kept only for backward-compatible type exports.
 */
export interface TechnicalPillarResponse {
  kpiWeight: number;
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
   * Rank renovation scenarios using the Technical API.
   * Returns rankings sorted by rank (1 = best).
   */
  rank(
    scenarios: RenovationScenario[],
    financialResults: Record<ScenarioId, FinancialResults>,
    personaId: string,
  ): Promise<MCDARankingResult[]>;
}
