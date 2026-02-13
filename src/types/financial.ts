// Financial Service API Types
// Based on OpenAPI specs from api-specs/20260108-125427/financial.json

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

/**
 * Energy Performance Certificate (EPC) classes.
 * Greek labels ordered from worst (Η) to best (Α+).
 */
export type EnergyClass = "Η" | "Ζ" | "Ε" | "Δ" | "Γ" | "Β" | "Β+" | "Α" | "Α+";

// ============================================================================
// Risk Assessment (Monte Carlo Simulation)
// ============================================================================

/**
 * Request model for Monte Carlo risk assessment.
 * Runs 10,000 scenarios to assess financial risk and returns.
 */
export interface RiskAssessmentRequest {
  /** Capital expenditure in euros. Optional - falls back to dataset if not provided. */
  capex?: number;

  /** Annual maintenance/operational cost in euros. Optional - falls back to dataset if not provided. */
  annual_maintenance_cost?: number;

  /** Expected annual energy savings in kWh. Required - provided by energy simulation. */
  annual_energy_savings: number;

  /** Project evaluation horizon in years (1-30). Required. */
  project_lifetime: number;

  /** Loan amount in euros. Default 0 for all-equity financing. */
  loan_amount?: number;

  /** Loan repayment term in years. Required if loan_amount > 0. */
  loan_term?: number;

  /** Output detail level. Determines response complexity. */
  output_level: OutputLevel;

  /** Which financial indicators to include. Default: all (IRR, NPV, PBP, DPP, ROI). */
  indicators?: string[];

  /** Override to explicitly include/exclude visualizations. */
  include_visualizations?: boolean;
}

/**
 * Response model for risk assessment endpoint.
 * Structure varies based on output_level.
 */
export interface RiskAssessmentResponse {
  /** Median (P50) value for each indicator. Always included. */
  point_forecasts: Record<string, number>;

  /** Simulation metadata: n_sims, project_lifetime, loan info, etc. */
  metadata: Record<string, unknown>;

  /** Success probability metrics. Included in 'professional' and above. */
  probabilities?: Record<string, number>;

  /** Percentile breakdown for each indicator. Included in 'professional' and above
   *  (P10-P90 for professional; P5-P95 for public/complete). */
  percentiles?: Record<string, Record<string, number>>;

  /** Base64-encoded PNG chart images. Only in 'complete' output_level. */
  visualizations?: Record<string, string>;
}

// ============================================================================
// ARV (After Renovation Value)
// ============================================================================

/**
 * Request model for After Renovation Value prediction.
 * Uses trained LightGBM model on Greek property market data.
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

  /** Energy class after renovation (EPC label from energy analysis). */
  energy_class: EnergyClass;

  /** Whether property has been renovated within last 5 years. Default true. */
  renovated_last_5_years?: boolean;
}

/**
 * Response model for After Renovation Value prediction.
 */
export interface ARVResponse {
  /** Predicted price per square meter in euros. */
  price_per_sqm: number;

  /** Total predicted property value in euros. */
  total_price: number;

  /** Floor area used in calculation (m²). */
  floor_area: number;

  /** Energy class used in prediction. */
  energy_class: string;

  /** Additional metadata about the prediction (model version, timestamp, etc.). */
  metadata?: Record<string, unknown>;
}
