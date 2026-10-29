/**
 * Shared renovation domain types used across tools (HRA, PRA, etc.)
 *
 * TBD INTEGRATION NOTES
 * =====================
 * The following integrations are pending finalization (verify shapes against service repos):
 * - [ ] Forecasting API: BuildingInfo -> BuildingPayload mapping
 * - [ ] Technical API: MCDA pillar endpoint integration
 */

import type { DeliveredEnergyCarrierBreakdown } from "./energy";

// ─────────────────────────────────────────────────────────────────────────────
// Building Information Types (Screen 1)
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildingInfo {
  // Location and basic identification
  country: string;
  lat: number | null; // Required for PVGIS weather and archetype matching, range: -90 to 90
  lng: number | null; // Required for PVGIS weather and archetype matching, range: -180 to 180

  // Building category (from archetype)
  buildingType: string; // Maps to archetype category (e.g., "Single Family House")

  // Construction period (from archetype)
  constructionPeriod: string; // e.g., "1946-1969", extracted from archetype name

  // Archetype selection tracking
  selectedArchetype?: {
    name: string;
    category: string;
    country: string;
  };
  tentativeArchetype?: {
    name: string;
    category: string;
    country: string;
  };

  // User-modifiable parameters (Optional - for modified archetype workflow)
  isModified: boolean; // Whether user has modified archetype defaults
  modifications?: import("./archetype").BuildingModifications; // Modifications to apply to archetype
  floorArea: number | null; // m² - can be modified by user
  numberOfFloors: number | null; // 1-100 - can be modified by user
  apartmentLocation?: "bottom" | "middle" | "top";

  // Deprecated fields (kept for backward compatibility with Financial API)
  // These are now derived from archetype or removed from user input
  climateZone: string; // Deprecated - not user input
  heatingTechnology: string; // Deprecated - fixed in archetype
  coolingTechnology: string; // Deprecated - fixed in archetype
  hotWaterTechnology: string; // Deprecated - fixed in archetype
  numberOfOpenings: number | null; // Deprecated - derived from archetype
  glazingTechnology: string; // Deprecated - fixed in archetype

  // Fields for Financial API (/arv endpoint)
  constructionYear: number | null; // Integer 1800-2030, derived from constructionPeriod
  floorNumber: number | null; // Optional, for apartments (0 = ground floor)

  // Fields for Financial API (/risk-assessment endpoint)
  projectLifetime: number; // Required, 1-30 years, default: 20

  // Note: EPC (Energy Performance Certificate) is NOT a user input.
  // The Financial ARV model resolves a national class from simulated energy intensity.
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy Estimation Types (Screen 1 -> Screen 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface EstimationResult {
  /** The modeled home today; the "current" scenario reuses it. */
  baseline: import("../services/scenarioEnergy").ScenarioEnergy;
  flexibilityIndex: number; // 0-100
  comfortIndex: number; // 0-100

  /**
   * Notices returned during validation of a modified archetype.
   * These do not block the simulation, but they should be shown to the user.
   */
  validationNotes?: string[];

  /** The unmodified archetype's baseline, present for an adjusted archetype. */
  referenceBaseline?: import("../services/scenarioEnergy").ScenarioEnergy;

  /** The building Forecasting ran and the modeled home it stands for. */
  simulated: import("../services/simulatedBuilding").SimulatedBuilding;

  /** How EnergyService selected the archetype; feeds the audit log and `validateEstimation`. */
  matchStrategy: import("../services/archetypeMatching").ArchetypeMatchStrategy;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renovation Selection Types (Screen 2)
// Eight individual renovation measures that users can multi-select
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Individual renovation measure IDs available in the application.
 * Users can select multiple measures to include in their renovation plan.
 */
export type RenovationMeasureId =
  | "wall-insulation"
  | "roof-insulation"
  | "floor-insulation"
  | "windows"
  | "air-water-heat-pump"
  | "condensing-boiler"
  | "pv"
  | "solar-thermal";

export interface RenovationSelections {
  /** Selected renovation measure IDs */
  selectedMeasures: RenovationMeasureId[];
  /** Optional user-provided CAPEX override (EUR). If null, API fetches from database. */
  estimatedCapex: number | null;
  /** Optional user-provided annual maintenance cost (EUR/year). If null, API fetches from database. */
  estimatedMaintenanceCost: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funding Options Types (Screen 2)
// Per design doc: Only two financing types - Self-funded (Equity) or Loan
// ─────────────────────────────────────────────────────────────────────────────

export type FinancingType = "self-funded" | "loan";

export interface LoanDetails {
  /**
   * Loan amount as a percentage of renovation cost (0–100 scale, e.g., 70 means 70%).
   * Note: uses 0-100 convention — divided by 100 in financialCalculations.applyFundingReduction().
   */
  percentage: number;
  /** Loan duration in years */
  duration: number;
}

/** How an upfront subsidy is expressed by the user. */
export type IncentiveMode = "percentage" | "amount";

export interface IncentiveDetails {
  /** Which of the two values below is applied. */
  mode: IncentiveMode;
  /** Upfront subsidy as a percentage of CAPEX (0-100). Used when mode is "percentage". */
  upfrontPercentage: number;
  /**
   * Upfront subsidy as an absolute amount in EUR. Used when mode is "amount",
   * and applied per package (HRA) / per building (PRA), not portfolio-wide.
   */
  upfrontAmount: number;
}

export interface FundingOptions {
  /** The chosen financing type */
  financingType: FinancingType;
  /** Loan details (only relevant when financingType is "loan") */
  loan: LoanDetails;
  /** Backend-native incentive inputs shared across tools. */
  incentives: IncentiveDetails;
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Types (Screen 3)
// ─────────────────────────────────────────────────────────────────────────────

export interface RenovationPackage {
  id: string;
  label: string;
  measureIds: RenovationMeasureId[];
}

export interface PackageFinancialInput {
  capex: number | null;
  annualMaintenanceCost: number | null;
  /** True while capex still holds the EU reference-data estimate (cleared on manual edit). */
  capexAutoEstimated?: boolean;
  /** True while maintenance still holds the EU reference-data estimate (cleared on manual edit). */
  opexAutoEstimated?: boolean;
}

export type PackageFinancialInputsById = Record<string, PackageFinancialInput>;

/**
 * Scenario IDs for comparison.
 * - "current": Baseline before renovation
 * - dynamic package IDs for evaluated renovation options
 */
export type ScenarioId = string;

export interface RenovationScenario {
  id: ScenarioId;
  label: string;
  annualEnergyNeeds: number; // kWh/year (HVAC demand, API-derived)
  heatingCoolingNeeds: number; // kWh/year (HVAC demand, API-derived)
  deliveredTotal?: number; // kWh/year (UNI/TS 11300 delivered energy, when available)
  carrierBreakdown?: DeliveredEnergyCarrierBreakdown; // kWh/year carrier split, when available
  primaryEnergy?: number; // kWh/year (UNI/TS 11300 primary energy, when available)
  heatingPrimaryEnergy?: number; // kWh/year (UNI/TS 11300 primary energy for heating, when available)
  coolingPrimaryEnergy?: number; // kWh/year (UNI/TS 11300 primary energy for cooling, when available)
  heatPumpCop?: number; // COP used by Forecasting for heat-pump scenarios, when available
  pvGeneration?: number; // kWh/year PV generation, when available
  pvSelfConsumption?: number; // kWh/year PV self-consumption, when available
  pvGridExport?: number; // kWh/year PV grid export, when available
  pvSelfConsumptionRate?: number; // 0-1 PV self-consumption rate, when available
  pvSelfSufficiencyRate?: number; // 0-1 PV self-sufficiency rate, when available
  annualEmissionsTonCo2e?: number; // t CO₂e/year operational HVAC emissions from the carrier split, when available
  embodiedCarbonKgCo2e?: number; // kg CO₂e one-off material carbon of the package's measures, when available
  /** Annual per-person health harm from indoor heat and cold, measured in DALYs. */
  annualThermalDalyPerPerson?: number;
  /** Annual per-person thermal DALYs avoided versus the current building. */
  avoidedThermalDalyPerPerson?: number;
  flexibilityIndex: number;
  comfortIndex: number;
  packageId: string | null;
  measureIds: RenovationMeasureId[];
  measures: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial API Response Types
// Align with relife-financial-service (verify in repo).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ARV (After Renovation Value) result from POST /arv
 */
export interface ARVResult {
  pricePerSqm: number; // EUR/m²
  totalPrice: number; // EUR
  floorArea: number; // Echo of input
  energyClass: string; // Resolved Greek EPC label
  // Value uplift over the pre-renovation state, already scaled to percent by
  // the Financial API. Absent when the request carried no before-consumption.
  priceIncreasePct?: number; // %
  metadata?: Record<string, unknown>;
}

/**
 * Point forecasts from risk assessment (P50/median values)
 * For output_level: "private" (HRA tool), this is the main output
 */
export interface RiskAssessmentPointForecasts {
  NPV: number; // Net Present Value (EUR)
  IRR: number | null; // Internal Rate of Return (decimal, e.g., 0.057 = 5.7%); null when not applicable
  ROI: number | null; // Return on Investment (decimal); null when not applicable
  PBP: number; // Payback Period (years)
  DPP: number; // Discounted Payback Period (years)
  MonthlyAvgSavings: number; // EUR/month
  SuccessRate: number; // Probability of positive outcome (0-1)
}

/**
 * Metadata from risk assessment simulation
 */
export interface RiskAssessmentMetadata {
  n_sims?: number; // Number of Monte Carlo simulations (optional - only show if API returns it)
  project_lifetime: number;
  capex: number; // Used CAPEX value returned by the Financial API metadata
  annual_maintenance_cost?: number;
  output_level: string;
  cash_flow_data?: CashFlowData;
  chart_metadata?: Partial<
    Record<FinancialRiskIndicator, FinancialChartMetadata>
  >;
  [key: string]: unknown;
}

export type FinancialRiskIndicator = "NPV" | "IRR" | "ROI" | "PBP" | "DPP";

export interface FinancialChartBinData {
  centers: number[];
  counts: number[];
  edges: number[];
}

export interface FinancialChartStatistics {
  mean: number;
  std: number;
  P10: number;
  P50: number;
  P90: number;
}

export interface FinancialChartConfig {
  xlabel?: string;
  ylabel?: string;
  title?: string;
}

export interface FinancialChartMetadata {
  bins: FinancialChartBinData;
  statistics: FinancialChartStatistics;
  chart_config?: FinancialChartConfig;
}

export interface CashFlowData {
  years: number[]; // Year indices [0, 1, 2, ..., n]
  initial_investment?: number; // EUR — out-of-pocket investment at Year 0
  annual_inflows: number[]; // EUR — energy savings revenue per year
  annual_outflows: number[]; // EUR — maintenance + loan payments per year
  annual_net_cash_flow?: number[]; // EUR — inflows minus outflows per year
  cumulative_cash_flow?: number[]; // EUR — running cumulative net cash flow
  breakeven_year?: number | null; // Year index when cumulative turns positive
  loan_term?: number | null; // Years — loan repayment duration
}

/**
 * Percentile data for a single financial metric
 * P10 = pessimistic (10th percentile), P90 = optimistic (90th percentile)
 */
export interface PercentileData {
  P10: number;
  P20?: number;
  P30?: number;
  P40?: number;
  P50: number;
  P60?: number;
  P70?: number;
  P80?: number;
  P90: number;
}

/**
 * Percentiles for all financial indicators
 * Available when output_level is higher than "private"
 */
export interface RiskAssessmentPercentiles {
  NPV?: PercentileData;
  PBP?: PercentileData;
  ROI?: PercentileData;
  IRR?: PercentileData;
  DPP?: PercentileData;
}

/**
 * Complete financial results combining ARV and Risk Assessment
 */
export type ArvUnavailableReason =
  | "unsupported-country"
  | "invalid-request"
  | "api-error";

/**
 * Why a package appraisal was not requested. The Financial endpoint requires
 * positive energy savings and positive capex, so these cases never reach it.
 */
export type AppraisalSkipReason =
  | "fully-subsidized"
  | "non-positive-savings"
  | "missing-carrier-breakdown";

/** A package appraisal the Financial service calculated (POST /risk-assessment). */
export interface AppraisedPackage {
  kind: "appraised";
  pointForecasts: RiskAssessmentPointForecasts;
  metadata: RiskAssessmentMetadata;
  probabilities?: Record<string, number>; // Pr(*) success metrics (professional+ output levels)
  percentiles?: RiskAssessmentPercentiles; // Available when output_level > "private"
  cashFlowData?: CashFlowData;
}

/** A skipped appraisal carries its reason and no figures. */
export type PackageAppraisal =
  | AppraisedPackage
  | { kind: "skipped"; reason: AppraisalSkipReason };

/** Financial results for one renovation package; the baseline has none. */
export interface FinancialResults {
  // From POST /arv
  arv: ARVResult | null;
  arvUnavailableReason?: ArvUnavailableReason;

  appraisal: PackageAppraisal;

  capitalExpenditure: number; // Post-subsidy CAPEX, EUR
  annualMaintenanceCost?: number; // EUR/year, from request or Financial API metadata
  afterRenovationValue: number | null; // From arv.totalPrice; null when ARV is unavailable (e.g. unsupported country)
}

export type FinancialScenario = "baseline" | "optimistic" | "pessimistic";

export interface MCDARankingResult {
  scenarioId: ScenarioId;
  rank: number;
  score: number;
}
