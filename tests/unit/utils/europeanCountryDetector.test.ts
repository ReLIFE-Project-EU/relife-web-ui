import { describe, expect, test } from "vitest";
import {
  benchmarkEuropeanCountryDetector,
  detectEuropeanCountry,
  detectEuropeanCountryCode,
} from "../../../src/utils/geo/europeanCountryDetector";

describe("europeanCountryDetector", () => {
  test("detects representative EU-27 locations", () => {
    expect(detectEuropeanCountryCode({ lat: 40.4168, lng: -3.7038 })).toBe(
      "ES",
    );
    expect(detectEuropeanCountryCode({ lat: 48.2082, lng: 16.3738 })).toBe(
      "AT",
    );
    expect(detectEuropeanCountryCode({ lat: 35.1856, lng: 33.3823 })).toBe(
      "CY",
    );
    expect(detectEuropeanCountryCode({ lat: 35.8989, lng: 14.5146 })).toBe(
      "MT",
    );
    expect(detectEuropeanCountryCode({ lat: 37.9838, lng: 23.7275 })).toBe(
      "GR",
    );
  });

  test("returns null for out-of-scope or non-land coordinates", () => {
    expect(detectEuropeanCountryCode({ lat: 47.3769, lng: 8.5417 })).toBeNull();
    expect(detectEuropeanCountryCode({ lat: 56.2, lng: 3.1 })).toBeNull();
  });

  test("returns ISO2 and display name together", () => {
    expect(detectEuropeanCountry({ lat: 59.437, lng: 24.7536 })).toEqual({
      countryCode: "EE",
      countryName: "Estonia",
    });
  });

  test("benchmark stays under the 5ms query target on average", () => {
    const benchmark = benchmarkEuropeanCountryDetector(
      [
        { lat: 40.4168, lng: -3.7038 },
        { lat: 48.2082, lng: 16.3738 },
        { lat: 35.1856, lng: 33.3823 },
        { lat: 35.8989, lng: 14.5146 },
        { lat: 59.437, lng: 24.7536 },
        { lat: 47.3769, lng: 8.5417 },
      ],
      1_000,
    );

    expect(benchmark.totalQueries).toBe(6_000);
    expect(benchmark.averageQueryTimeMs).toBeLessThan(5);
    expect(benchmark.p95QueryTimeMs).toBeLessThan(5);
  });
});
