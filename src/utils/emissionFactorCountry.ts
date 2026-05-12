import {
  RSE_DEFAULT_EMISSION_FACTOR_COUNTRY,
  RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES,
} from "../features/strategy-explorer/constants.ts";

/**
 * Fall back to the default emission-factor country when the requested country
 * is not supported by the Forecasting service.
 */
export function resolveEmissionFactorCountry(country: string): string {
  return RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES.includes(
    country as (typeof RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES)[number],
  )
    ? country
    : RSE_DEFAULT_EMISSION_FACTOR_COUNTRY;
}
