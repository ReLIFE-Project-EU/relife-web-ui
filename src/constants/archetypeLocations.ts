import {
  CANONICAL_COUNTRY_REFERENCE_LOCATIONS,
  getCountryDisplayNameByCode,
  getCountryReferenceLocation,
} from "../utils/countries";
import { detectEuropeanCountryCode } from "../utils/geo/europeanCountryDetector";

/**
 * Reference locations for archetype countries (capital cities).
 *
 * WORKAROUND: The Forecasting API BUI data has incorrect coordinates
 * (all archetypes share Greece coords). This mapping provides correct
 * reference locations for distance-based matching.
 *
 * Covers all 27 EU member states for future archetype additions.
 *
 * TODO: Remove this when backend fixes BUI coordinates or adds lat/lng
 * to the /building/available response.
 */
export const ARCHETYPE_REFERENCE_LOCATIONS: Record<
  string,
  { lat: number; lng: number }
> = CANONICAL_COUNTRY_REFERENCE_LOCATIONS;

/**
 * Maximum distance between any two EU capitals (approx. Helsinki to Lisbon).
 * Used to normalize geographic distance scores to [0, 1].
 */
export const MAX_EU_DISTANCE_KM = 4000;

/**
 * Detect the most likely EU-27 country for given coordinates using
 * bundled offline polygons. Returns canonical display names to keep
 * existing archetype-matching callers backward-compatible.
 */
export function detectCountry(
  coords: { lat: number; lng: number },
  _calculateDistance: (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => number,
): string | null {
  void _calculateDistance;
  const countryCode = detectEuropeanCountryCode(coords);
  return getCountryDisplayNameByCode(countryCode) ?? null;
}

export function getReferenceLocationForCountry(
  country: string,
): { lat: number; lng: number } | undefined {
  return getCountryReferenceLocation(country);
}
