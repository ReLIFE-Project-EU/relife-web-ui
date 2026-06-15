// Financial Service API Types
// Align with relife-financial-service request/response models (verify in repo).

// ============================================================================
// Enums
// ============================================================================

/**
 * Output detail level for risk assessment response.
 * Determined by which frontend tool is being used:
 * - private: Individual homeowners - basic metrics plus intuitive summaries
 * - professional: Energy consultants - detailed analysis
 * - public: Public institutions - comprehensive reports
 * - complete: Special cases - includes base64 visualizations
 */
export type OutputLevel = "private" | "professional" | "public" | "complete";

/**
 * Property type classifications for ARV prediction.
 * English labels mapped internally to Greek labels by the API.
 */
export type PropertyType =
  | "Loft"
  | "Studio / Bedsit"
  | "Villa"
  | "Apartment"
  | "Building"
  | "Other"
  | "Maisonette"
  | "Detached House"
  | "Apartment Complex";

// ============================================================================
// Risk Assessment (Monte Carlo Simulation)
//
// The endpoint evaluates one or more financing schemes in a single call and
// returns per-scheme results keyed by scheme_type. The frontend currently
// emits a single scheme per analysis (equity or bank_loan) and reads back the
// matching entry; see src/services/riskAssessmentAdapter.ts.
// ============================================================================

/** Self-financed scheme: client pays the (post-incentive) CAPEX upfront. */
export interface EquitySchemeInput {
  scheme_type: "equity";
}

/** Standard amortising bank loan. Interest rate is modeled by the service. */
export interface BankLoanSchemeInput {
  scheme_type: "bank_loan";
  /** Loan principal in euros (> 0). */
  loan_amount: number;
  /** Repayment term in years (>= 1). */
  term_years: number;
}

/**
 * One financing scheme. The backend supports 12 scheme types across 4 families;
 * the frontend emits only these two today (others are declared upstream).
 */
export type SchemeInput = EquitySchemeInput | BankLoanSchemeInput;

/**
 * Canonical renovation work types accepted by the CAPEX/OPEX lookup. Must match
 * the backend `RenovationAction.action` names exactly (relife-financial-service
 * `models/risk_assessment.py`). Area-based actions need `area_m2`; capacity-based
 * actions need `capacity_kw`.
 */
export type RenovationActionName =
  | "Wall insulation"
  | "Wall insulation - additional"
  | "Roof insulation - Accessible"
  | "Roof insulation - Makeover"
  | "Floor insulation"
  | "Windows"
  | "Air-water Heat Pump"
  | "Condensing boiler"
  | "PV"
  | "Solar thermal panels";

/**
 * A single renovation measure used for the optional CAPEX/OPEX lookup. The
 * backend resolves unit prices and O&M costs from `country` + these actions when
 * `capex` and/or `annual_maintenance_cost` are omitted from the request.
 */
export interface RenovationAction {
  /** Renovation work type (one of the 10 canonical names). */
  action: RenovationActionName;

  /** Surface area in m² — required for insulation and windows actions. */
  area_m2?: number;

  /** Installed capacity in kW — required for HVAC, PV, and solar actions. */
  capacity_kw?: number;

  /** Optional material variant; if omitted, the average across variants is used. */
  material?: string;
}

/**
 * Request model for multi-scheme Monte Carlo risk assessment.
 * Runs 10,000 scenarios per scheme to assess financial risk and returns.
 */
export interface RiskAssessmentRequest {
  /**
   * Total capital expenditure in euros (> 0). Upfront incentives are folded in
   * client-side. Optional: omit to have it computed server-side from
   * `country` + `renovation_actions`.
   */
  capex?: number;

  /** Electricity-equivalent annual savings in kWh (> 0) for the current scalar API contract. */
  annual_energy_savings: number;

  /**
   * Annual maintenance/operational cost in euros (>= 0). Optional: omit to have
   * it computed server-side from `country` + `renovation_actions`.
   */
  annual_maintenance_cost?: number;

  /** Project evaluation horizon in years (1-30). */
  project_lifetime: number;

  /** Financing schemes to evaluate. At least one required. */
  schemes: SchemeInput[];

  /** Output detail level. Determines response complexity. */
  output_level: OutputLevel;

  /** Which financial indicators to include. Default: all (IRR, NPV, PBP, DPP, ROI). */
  indicators?: string[];

  /**
   * EU country name (full English name, e.g. "Italy"). Required when `capex`
   * or `annual_maintenance_cost` is omitted (CAPEX/OPEX lookup).
   */
  country?: string;

  /**
   * Renovation package used to look up unit prices and O&M costs. Required when
   * `capex` or `annual_maintenance_cost` is omitted (CAPEX/OPEX lookup).
   */
  renovation_actions?: RenovationAction[];
}

/** Percentiles for a single KPI. P5/P10/P50/P90/P95 always present; quartiles optional. */
export interface SchemePercentiles {
  P5?: number;
  P10: number;
  P25?: number;
  P50: number;
  P75?: number;
  P90: number;
  P95?: number;
}

/** Per-year percentile bands (keys "P5".."P95", each an array of length project_lifetime + 1). */
export type CashflowFanBands = Record<string, number[]>;

/** Feasible/infeasible histogram for one KPI (professional output and above). */
export interface SchemeKpiHistogram {
  /** 31 bin-edge values delimiting 30 bins. */
  bin_edges: number[];
  /** 30 counts of feasible scenarios per bin. */
  feasible_counts: number[];
  /** 30 counts of infeasible scenarios per bin. */
  infeasible_counts: number[];
  p10: number;
  p50: number;
  p90: number;
  /** Threshold used to split feasible/infeasible (PBP/DPP); null otherwise. */
  project_lifetime: number | null;
}

/** Result for a single financing scheme. */
export interface SchemeResult {
  scheme_id: number;
  scheme_family: string;
  summary: {
    percentiles: Record<string, SchemePercentiles>;
    probabilities: Record<string, number>;
    disc_target_used: number;
    n_sims: number;
  };
  cashflow_distributions: {
    years: number[];
    cash_flows: CashflowFanBands;
    inflows: CashflowFanBands;
    outflows: CashflowFanBands;
  };
  kpi_histograms?: Record<string, SchemeKpiHistogram>;
}

/**
 * Response `metadata` block. Typed for the keys the frontend reads; kept open
 * via an index signature so other keys (and unknown consumers) stay safe.
 */
export interface RiskAssessmentResponseMetadata {
  /** CAPEX used in the simulation (supplied value, or the lookup result). */
  capex?: number;
  /** True when `capex` was resolved from the reference data, not supplied. */
  capex_from_lookup?: boolean;
  /** Annual O&M cost used in the simulation (supplied value, or lookup result). */
  annual_maintenance_cost?: number;
  /** True when `annual_maintenance_cost` was resolved from the reference data. */
  opex_from_lookup?: boolean;
  project_lifetime?: number;
  n_sims?: number;
  [key: string]: unknown;
}

/**
 * Response model for multi-scheme risk assessment.
 * `results` is keyed by the same `scheme_type` strings sent in the request.
 */
export interface RiskAssessmentResponse {
  results: Record<string, SchemeResult>;
  metadata: RiskAssessmentResponseMetadata;
}

// ============================================================================
// ARV (After Renovation Value)
// ============================================================================

/**
 * Request model for After Renovation Value prediction.
 * Uses trained LightGBM model on property market data.
 */
export interface ARVRequest {
  /** Latitude of the property location in decimal degrees. */
  lat: number;

  /** Longitude of the property location in decimal degrees. */
  lng: number;

  /** Usable floor area in square meters (m²). */
  floor_area: number;

  /** Year the building was originally constructed (1800-2030). */
  construction_year: number;

  /** Floor number where property is located (0=ground). Can be null for houses. */
  floor_number?: number | null;

  /** Total number of floors in the building (1-100). */
  number_of_floors: number;

  /** Type of property. */
  property_type: PropertyType;

  /** Country whose national EPC scale should be used. */
  target_country: string;

  /** Pre-renovation consumption in kWh/m²/year, when available. */
  energy_consumption_before?: number | null;

  /** Post-renovation/current consumption in kWh/m²/year. */
  energy_consumption_after: number;

  /** Whether property has been renovated within last 5 years. Default true. */
  renovated_last_5_years?: boolean;
}

export interface ARVValueSnapshot {
  /** Predicted price per square meter in euros. */
  price_per_sqm: number;

  /** Total predicted property value in euros. */
  total_price: number;

  /** Resolved Greek EPC class used as model input. */
  greek_epc_class: string;

  /** EPC mapping chain details, when available. */
  epc_resolution?: Record<string, unknown>;
}

export interface ARVUplift {
  /** Absolute increase in total property value in euros. */
  price_increase: number;

  /** Percentage increase in total property value. */
  price_increase_pct: number;
}

/**
 * Response model for After Renovation Value prediction.
 */
export interface ARVResponse {
  /** Predicted value at post-renovation/current energy consumption. */
  after: ARVValueSnapshot;

  /** Predicted value at pre-renovation energy consumption, when requested. */
  before?: ARVValueSnapshot | null;

  /** Value increase from before to after renovation, when requested. */
  uplift?: ARVUplift | null;

  /** Floor area used in calculation (m²). */
  floor_area: number;

  /** Additional metadata about the prediction (model version, timestamp, etc.). */
  metadata?: Record<string, unknown>;
}
