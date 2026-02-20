/**
 * Test fixtures
 *
 * Minimal realistic payloads derived from OpenAPI spec examples.
 * These are known-good values that should work with the actual services.
 */

/**
 * Fallback archetype when discovering from /building/available
 */
export const FALLBACK_ARCHETYPE = {
  category: "Single Family House",
  country: "Greece",
  name: "SFH_Greece_1961_1980",
};

/**
 * ARV request fixture (from financial.json OpenAPI examples)
 */
export const ARV_REQUEST = {
  lat: 37.981,
  lng: 23.728,
  floor_area: 85.0,
  construction_year: 1985,
  floor_number: 2,
  number_of_floors: 5,
  property_type: "Apartment",
  energy_class: "Β", // Greek label (post-renovation B class)
  renovated_last_5_years: true,
};

/**
 * Risk assessment request base (HRA — private output level)
 * annual_energy_savings will be computed at test time from baseline vs renovated
 */
export const RISK_ASSESSMENT_BASE_PRIVATE = {
  project_lifetime: 20,
  output_level: "private",
  capex: 10000, // Required parameter (dataset lookup not yet implemented)
  annual_maintenance_cost: 200, // Required parameter (dataset lookup not yet implemented)
  loan_amount: 0,
  loan_term: 0,
};

/**
 * Risk assessment request base (PRA — professional output level)
 */
export const RISK_ASSESSMENT_BASE_PROFESSIONAL = {
  project_lifetime: 20,
  output_level: "professional",
  capex: 10000, // Required parameter (dataset lookup not yet implemented)
  annual_maintenance_cost: 200, // Required parameter (dataset lookup not yet implemented)
  loan_amount: 0,
  loan_term: 0,
};

/**
 * ECM parameters (wall insulation only for minimal test)
 */
export const ECM_PARAMS = {
  scenario_elements: "wall",
  u_wall: 0.25, // W/m²K target
};

/**
 * ECM parameters (floor insulation only)
 */
export const ECM_PARAMS_FLOOR = {
  scenario_elements: "slab",
  u_slab: 0.25,
};

/**
 * ECM parameters (envelope: wall + floor combined with heat pump)
 * Envelope improvement guarantees Q_HC reduction, making the assertion safe.
 */
export const ECM_PARAMS_ENVELOPE_HEAT_PUMP = {
  scenario_elements: "wall,slab",
  u_wall: 0.25,
  u_slab: 0.25,
  // String values because they're passed directly as URL query params via URLSearchParams (not via typed API wrapper)
  use_heat_pump: "true",
  heat_pump_cop: "3.2",
};

/**
 * Weather source (consistent with app code)
 */
export const WEATHER_SOURCE = "pvgis";
