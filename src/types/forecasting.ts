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

// ============================================================================
// Results & EPC
// ============================================================================

export interface EPCResponse {
  [key: string]: unknown;
}
