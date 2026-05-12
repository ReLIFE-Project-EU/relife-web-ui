import {
  RSE_DEFAULT_EMISSION_FACTOR_COUNTRY,
  RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES,
} from "../constants";

/**
 * Fall back to the default emission-factor country when the archetype country
 * is not supported by the Forecasting service.
 *
 * The Forecasting service only supports a limited set of countries for
 * emission factors.  This helper centralises the fallback so wrappers and
 * the mapper always send a valid country code.
 */
export function resolveEmissionFactorCountry(country: string): string {
  return RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES.includes(
    country as (typeof RSE_SUPPORTED_EMISSION_FACTOR_COUNTRIES)[number],
  )
    ? country
    : RSE_DEFAULT_EMISSION_FACTOR_COUNTRY;
}
