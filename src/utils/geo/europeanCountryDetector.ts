import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { getCountryDisplayNameByCode } from "../countries";
import {
  EU27_COUNTRY_POLYGONS,
  type SupportedEUCountryCode,
} from "./eu27CountryPolygons";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface EuropeanCountryDetection {
  countryCode: SupportedEUCountryCode | null;
  countryName: string | null;
}

export interface CountryDetectionBenchmarkResult {
  iterations: number;
  sampleCount: number;
  totalQueries: number;
  averageQueryTimeMs: number;
  p95QueryTimeMs: number;
  maxQueryTimeMs: number;
  detectedQueries: number;
}

function isValidCoordinate(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function isValidCoordinates(coords: Coordinates): boolean {
  return (
    isValidCoordinate(coords.lat, -90, 90) &&
    isValidCoordinate(coords.lng, -180, 180)
  );
}

function matchesBoundingBox(
  coords: Coordinates,
  bbox: readonly [number, number, number, number],
): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  return (
    coords.lng >= minLng &&
    coords.lng <= maxLng &&
    coords.lat >= minLat &&
    coords.lat <= maxLat
  );
}

export function detectEuropeanCountryCode(
  coords: Coordinates,
): SupportedEUCountryCode | null {
  if (!isValidCoordinates(coords)) {
    return null;
  }

  const point: [number, number] = [coords.lng, coords.lat];

  for (const feature of EU27_COUNTRY_POLYGONS) {
    if (!matchesBoundingBox(coords, feature.bbox)) {
      continue;
    }

    if (booleanPointInPolygon(point, feature)) {
      return feature.properties.iso2;
    }
  }

  return null;
}

export function detectEuropeanCountry(
  coords: Coordinates,
): EuropeanCountryDetection {
  const countryCode = detectEuropeanCountryCode(coords);

  return {
    countryCode,
    countryName: getCountryDisplayNameByCode(countryCode) ?? null,
  };
}

export function benchmarkEuropeanCountryDetector(
  samples: readonly Coordinates[],
  iterations = 1_000,
): CountryDetectionBenchmarkResult {
  const timings: number[] = [];
  let detectedQueries = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const sample of samples) {
      const startedAt = performance.now();
      const countryCode = detectEuropeanCountryCode(sample);
      const elapsedMs = performance.now() - startedAt;

      timings.push(elapsedMs);
      if (countryCode) {
        detectedQueries += 1;
      }
    }
  }

  const totalQueries = timings.length;
  const sorted = [...timings].sort((left, right) => left - right);
  const totalMs = timings.reduce((sum, value) => sum + value, 0);
  const p95Index = Math.min(
    sorted.length - 1,
    Math.floor(sorted.length * 0.95),
  );

  return {
    iterations,
    sampleCount: samples.length,
    totalQueries,
    averageQueryTimeMs: totalQueries === 0 ? 0 : totalMs / totalQueries,
    p95QueryTimeMs: sorted[p95Index] ?? 0,
    maxQueryTimeMs: sorted[sorted.length - 1] ?? 0,
    detectedQueries,
  };
}
