// Forecasting Service API Types
// Based on OpenAPI specs from api-specs/20260116-111114/forecasting.json

// ============================================================================
// Archetype Types (GET /building/available)
// ============================================================================

/**
 * Archetype metadata from GET /building/available
 */
export interface ArchetypeInfo {
  category: string; // "Single Family House", "Multi family House", "office"
  country: string; // "Italy", "Greece", etc.
  name: string; // Specific archetype identifier
}

// ============================================================================
// Direct Simulation Types (POST /simulate with archetype=true)
// ============================================================================

/**
 * Parameters for direct simulation with archetype mode
 */
export interface SimulateDirectParams {
  category: string; // Building category
  country: string; // Country
  name: string; // Archetype name
  weatherSource?: "pvgis" | "epw"; // Weather source, default: "pvgis"
}

/**
 * Hourly building data record from simulation
 */
export interface HourlyBuildingRecord {
  timestamp: string; // ISO timestamp e.g. "2009-12-01 00:00:00"
  T_op?: number; // Operative temperature (°C)
  T_ext?: number; // Exterior temperature (°C)
  Q_H?: number; // Heating load (kWh)
  Q_C?: number; // Cooling load (kWh)
  Q_HC?: number; // Total heating/cooling load (kWh)
  [key: string]: unknown; // Additional fields
}

/**
 * Validation messages from the simulation
 */
export interface SimulationValidation {
  bui_issues: string[];
  system_messages: string[];
}

/**
 * Results container from simulation
 */
export interface SimulationResults {
  hourly_building: HourlyBuildingRecord[];
}

/**
 * Response from POST /simulate endpoint
 *
 * Note: The API returns hourly data nested under `results.hourly_building`.
 * Annual totals must be calculated by summing hourly values.
 */
export interface SimulateDirectResponse {
  source: string; // "archetype" or "custom"
  name: string; // Archetype name
  category: string; // Building category
  country: string; // Country
  weather_source: string; // "pvgis" or "epw"
  validation?: SimulationValidation;
  results: SimulationResults;
  [key: string]: unknown; // Additional fields the API may return
}

// ============================================================================
// Project Creation (Legacy project-based workflow)
// ============================================================================

export interface CreateProjectResponse {
  [key: string]: string;
}

// ============================================================================
// Building Upload
// ============================================================================

export interface BuildingPayload {
  data: {
    area_m2?: number;
    volume_m3?: number;
    U_envelope_W_m2K?: number;
    infiltration_ach?: number;
    internal_gains_W?: number;
    thermal_capacity_kJ_K?: number;
    [key: string]: unknown;
  };
}

export interface BuildingUploadResponse {
  [key: string]: unknown;
}

// ============================================================================
// Plant Template & Upload
// ============================================================================

export interface PlantPayload {
  data: {
    heat_setpoint_C?: number;
    cool_setpoint_C?: number;
    heat_power_max_W?: number;
    cool_power_max_W?: number;
    heat_efficiency?: number;
    cool_efficiency?: number;
    [key: string]: unknown;
  };
}

export interface PlantUploadResponse {
  [key: string]: unknown;
}

export interface PlantTemplateResponse {
  [key: string]: unknown;
}

// ============================================================================
// Simulation
// ============================================================================

export interface SimulateResponse {
  [key: string]: unknown;
}

export interface EPCResponse {
  [key: string]: unknown;
}

// ============================================================================
// ECM Application Types (POST /ecm_application)
// ============================================================================

/**
 * Single scenario result from ECM simulation
 */
export interface ECMScenario {
  /** Scenario identifier, e.g., "wall", "wall+window" */
  scenario_id: string;
  /** Human-readable description */
  description: string;
  /** Elements applied in this scenario */
  elements: ("wall" | "roof" | "window")[];
  /** U-values applied (null if element not included) */
  u_values: {
    roof: number | null;
    wall: number | null;
    window: number | null;
  };
  /** Simulation results */
  results: {
    /** Hourly energy data for the year */
    hourly_building: HourlyBuildingRecord[];
    /** Annual aggregated results */
    annual_building: Record<string, unknown>[];
  };
}

/**
 * Response from POST /ecm_application endpoint
 */
export interface ECMApplicationResponse {
  /** Source of building data: "archetype" or "custom" */
  source: "archetype" | "custom";
  /** Archetype name (if source is archetype) */
  name: string | null;
  /** Building category */
  category: string | null;
  /** Country */
  country: string | null;
  /** Weather data source */
  weather_source: "pvgis" | "epw";
  /** U-values requested in the API call */
  u_values_requested: {
    roof: number | null;
    wall: number | null;
    window: number | null;
  };
  /** Single-scenario mode parameters */
  single_scenario_mode: {
    baseline_only: boolean;
    scenario_id: string | null;
    scenario_elements: string | null;
  };
  /** Number of scenarios returned */
  n_scenarios: number;
  /** Array of scenario results */
  scenarios: ECMScenario[];
}

/**
 * Parameters for simulateECM API call
 */
export interface ECMApplicationParams {
  /** Building category (required for archetype mode) */
  category: string;
  /** Country (required for archetype mode) */
  country: string;
  /** Archetype name (required for archetype mode) */
  name: string;
  /** Weather source, defaults to 'pvgis' */
  weatherSource?: "pvgis" | "epw";
  /** Elements to simulate, comma-separated (e.g., "wall,window") */
  scenario_elements: string;
  /** Wall U-value in W/m²K */
  u_wall?: number;
  /** Roof U-value in W/m²K */
  u_roof?: number;
  /** Window U-value in W/m²K */
  u_window?: number;
  /** Include baseline scenario in response (omit/false for single-scenario mode) */
  include_baseline?: boolean;
}
