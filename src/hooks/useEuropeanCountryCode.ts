import { useMemo } from "react";
import type { SupportedEUCountryCode } from "../utils/geo/eu27CountryPolygons";
import {
  detectEuropeanCountry,
  type Coordinates,
} from "../utils/geo/europeanCountryDetector";

export interface UseEuropeanCountryCodeResult {
  countryCode: SupportedEUCountryCode | null;
  countryName: string | null;
}

export function useEuropeanCountryCode(
  lat: number | null,
  lng: number | null,
): UseEuropeanCountryCodeResult {
  return useMemo(() => {
    if (typeof lat !== "number" || typeof lng !== "number") {
      return {
        countryCode: null,
        countryName: null,
      };
    }

    const coords: Coordinates = { lat, lng };
    const result = detectEuropeanCountry(coords);

    return {
      countryCode: result.countryCode,
      countryName: result.countryName,
    };
  }, [lat, lng]);
}
