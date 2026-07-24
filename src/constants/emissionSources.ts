/**
 * Forecasting-service emission energy-source keys.
 *
 * Verbatim `energy_source` identifiers from the Forecasting service
 * `EMISSION_FACTORS` tables (`co2_reduction.py`); an unknown key silently
 * falls back to `grid_electricity` server-side, so pass these unchanged.
 *
 * Shared by the RSE CO₂ mapping and the HRA/PRA operational-emissions
 * calculation (`carrierSavingsService`). This module must stay free of
 * internal imports: it is consumed from both `src/services/` and
 * `src/features/`, and any dependency here risks an ESM import cycle.
 */

/** Delivered thermal energy valued as natural gas (MVP carrier assumption). */
export const MVP_THERMAL_EMISSION_SOURCE = "natural_gas";
export const GRID_ELECTRICITY_EMISSION_SOURCE = "grid_electricity";
export const PV_SELF_CONSUMPTION_EMISSION_SOURCE = "solar_pv";
