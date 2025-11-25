// Technical Service API Types
// Based on OpenAPI specs from api-specs/20251125-145112/technical.json

// ============================================================================
// EE (Energy Efficiency)
// ============================================================================

export interface EERequest {
  envelope_kpi: number;
  envelope_min: number;
  envelope_max: number;
  window_kpi: number;
  window_min: number;
  window_max: number;
  heating_system_kpi: number;
  heating_system_min: number;
  heating_system_max: number;
  cooling_system_kpi: number;
  cooling_system_min: number;
  cooling_system_max: number;
  profile: string;
}

export interface EEResponse {
  ee_kpi_weight: number;
  envelope_normalized: number;
  window_normalized: number;
  heating_system_normalized: number;
  cooling_system_normalized: number;
  input: EERequest;
}

// ============================================================================
// REI (Renewable Energy Integration)
// ============================================================================

export interface REIRequest {
  st_coverage_kpi: number;
  st_coverage_min: number;
  st_coverage_max: number;
  onsite_res_kpi: number;
  onsite_res_min: number;
  onsite_res_max: number;
  net_energy_export_kpi: number;
  net_energy_export_min: number;
  net_energy_export_max: number;
  profile: string;
}

export interface REIResponse {
  rei_kpi_weight: number;
  st_coverage_normalized: number;
  onsite_res_normalized: number;
  net_energy_normalized: number;
  input: REIRequest;
}

// ============================================================================
// SEI (Sustainability Environmental Impact)
// ============================================================================

export interface SEIRequest {
  embodied_carbon_kpi: number;
  embodied_carbon_min: number;
  embodied_carbon_max: number;
  gwp_kpi: number;
  gwp_min: number;
  gwp_max: number;
  profile: string;
}

export interface SEIResponse {
  sei_kpi_weight: number;
  embodied_carbon_normalized: number;
  gwp_normalized: number;
  input: SEIRequest;
}

// ============================================================================
// UC (User Comfort)
// ============================================================================

export interface UCRequest {
  thermal_comfort_air_temp_kpi: number;
  thermal_comfort_air_temp_min: number;
  thermal_comfort_air_temp_max: number;
  thermal_comfort_humidity_kpi: number;
  thermal_comfort_humidity_min: number;
  thermal_comfort_humidity_max: number;
  profile: string;
}

export interface UCResponse {
  uc_kpi_weight: number;
  thermal_comfort_air_temp_normalized: number;
  thermal_comfort_humidity_normalized: number;
  input: UCRequest;
}

// ============================================================================
// FV (Financial Viability)
// ============================================================================

export interface FVRequest {
  ii_kpi: number;
  ii_min: number;
  ii_max: number;
  aoc_kpi: number;
  aoc_min: number;
  aoc_max: number;
  irr_kpi: number;
  irr_min: number;
  irr_max: number;
  npv_kpi: number;
  npv_min: number;
  npv_max: number;
  profile: string;
}

export interface FVResponse {
  fv_kpi_weight: number;
  ii_normalized: number;
  aoc_normalized: number;
  irr_normalized: number;
  npv_normalized: number;
  input: FVRequest;
}
