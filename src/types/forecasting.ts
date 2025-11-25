// Forecasting Service API Types
// Based on OpenAPI specs from api-specs/20251125-145112/forecasting.json

// ============================================================================
// Project Creation
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
