import { describe, expect, test, vi } from "vitest";

import {
  createRSEForecastingCacheService,
  normalizeEntry,
  RSEForecastingCacheServiceError,
} from "../../../../../src/features/strategy-explorer/services/rseForecastingCacheService";
import type { RSEForecastingCacheEntry } from "../../../../../src/features/strategy-explorer/types";
import type { ArchetypeDetails } from "../../../../../src/types/archetype";

const archetype = {
  country: "IT",
  category: "Residential",
  name: "Detached 1980",
};

const generatedAt = "2026-05-12T10:05:00.000Z";

function makeDetails(floorArea = 100): ArchetypeDetails {
  return {
    ...archetype,
    floorArea,
    numberOfFloors: 1,
    floorHeight: 3,
    totalWindowArea: 20,
    thermalProperties: {
      wallUValue: 0.8,
      roofUValue: 0.6,
      windowUValue: 2.8,
    },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 16,
      coolingSetpoint: 26,
      coolingSetback: 28,
    },
    location: { lat: 41.9, lng: 12.5 },
    bui: {} as ArchetypeDetails["bui"],
    system: {} as ArchetypeDetails["system"],
  };
}

function makeEntry(
  overrides?: Partial<{
    packageId: RSEForecastingCacheEntry["key"]["packageId"];
    baselineAnnualEnergyKwh: number;
    renovatedAnnualEnergyKwh: number;
    baselineTon: number;
    renovatedTon: number;
  }>,
): RSEForecastingCacheEntry {
  const packageId = overrides?.packageId ?? "envelope";
  const baselineAnnualEnergyKwh = overrides?.baselineAnnualEnergyKwh ?? 12_000;
  const renovatedAnnualEnergyKwh = overrides?.renovatedAnnualEnergyKwh ?? 8_000;
  const baselineTon = overrides?.baselineTon ?? 2.4;
  const renovatedTon = overrides?.renovatedTon ?? 1.6;

  return {
    key: {
      cacheVersion: "1.test.abc1234",
      archetype,
      packageId,
    },
    payloadSchemaVersion: 1,
    baseline: {
      annualEnergyKwh: baselineAnnualEnergyKwh,
      displayEpcClass: "G",
      primaryEnergyUni11300Summary: {},
      co2Inputs: [],
      co2: {
        annualConsumptionKwh: baselineAnnualEnergyKwh,
        annualEmissionsKgCo2eq: baselineTon * 1_000,
        annualEmissionsTonCo2eq: baselineTon,
        weightedEmissionFactorKgPerKwh: 0.2,
        equivalentTrees: 120,
        equivalentKmCar: 12_000,
        sourceBreakdownKwh: {
          naturalGas: baselineAnnualEnergyKwh,
          gridElectricity: 0,
          solarPv: 0,
        },
        thermalEmissionSource: "natural_gas",
      },
    },
    renovated: {
      annualEnergyKwh: renovatedAnnualEnergyKwh,
      displayEpcClass: "G",
      primaryEnergyUni11300Summary: {},
      co2Inputs: [],
      co2: {
        annualConsumptionKwh: renovatedAnnualEnergyKwh,
        annualEmissionsKgCo2eq: renovatedTon * 1_000,
        annualEmissionsTonCo2eq: renovatedTon,
        weightedEmissionFactorKgPerKwh: 0.2,
        equivalentTrees: 80,
        equivalentKmCar: 8_000,
        sourceBreakdownKwh: {
          naturalGas: renovatedAnnualEnergyKwh,
          gridElectricity: 0,
          solarPv: 0,
        },
        thermalEmissionSource: "natural_gas",
      },
    },
    co2Comparison: {
      baselineAnnualEmissionsKgCo2eq: baselineTon * 1_000,
      renovatedAnnualEmissionsKgCo2eq: renovatedTon * 1_000,
      savings: {
        absoluteKgCo2eq: (baselineTon - renovatedTon) * 1_000,
        absoluteTonCo2eq: baselineTon - renovatedTon,
        percentage: ((baselineTon - renovatedTon) / baselineTon) * 100,
      },
    },
    generatedAt,
    provenance: {
      source: "manual-seed",
      co2ComputedAt: "2026-05-12T10:04:00.000Z",
      co2Method: "forecasting-carrier-split-final-energy-gas-thermal-mvp",
      emissionFactorCountry: "IT",
    },
  };
}

describe("rseForecastingCacheService", () => {
  test("resolves an explicit cache matrix and reports no unavailable rows when complete", async () => {
    const entry = makeEntry();
    const api = {
      getPublishedVersion: vi.fn(),
      listEntries: vi.fn().mockResolvedValue([entry]),
    };
    const service = createRSEForecastingCacheService(api);

    const result = await service.resolveCacheMatrix({
      archetypes: [archetype],
      packageIds: ["envelope"],
      cacheVersion: "1.test.abc1234",
    });

    expect(api.getPublishedVersion).not.toHaveBeenCalled();
    expect(api.listEntries).toHaveBeenCalledWith({
      archetypes: [archetype],
      packageIds: ["envelope"],
      cacheVersion: "1.test.abc1234",
    });
    expect(result.cacheVersion).toBe("1.test.abc1234");
    expect(result.entries).toEqual([entry]);
    expect(result.missing).toEqual([]);
  });

  test("resolves the published cache version once when omitted", async () => {
    const api = {
      getPublishedVersion: vi.fn().mockResolvedValue({
        cacheVersion: "1.published",
        generatedAt,
        co2Method: "forecasting-carrier-split-final-energy-gas-thermal-mvp",
      }),
      listEntries: vi.fn().mockResolvedValue([]),
    };
    const service = createRSEForecastingCacheService(api);

    const result = await service.resolveCacheMatrix({
      archetypes: [archetype],
      packageIds: ["envelope"],
    });

    expect(api.getPublishedVersion).toHaveBeenCalledTimes(1);
    expect(api.listEntries).toHaveBeenCalledWith({
      archetypes: [archetype],
      packageIds: ["envelope"],
      cacheVersion: "1.published",
    });
    expect(result.cacheVersion).toBe("1.published");
  });

  test("reports precise missing archetype/package tuples", async () => {
    const entry = makeEntry({ packageId: "envelope" });
    const api = {
      getPublishedVersion: vi.fn(),
      listEntries: vi.fn().mockResolvedValue([entry]),
    };
    const service = createRSEForecastingCacheService(api);

    const result = await service.resolveCacheMatrix({
      archetypes: [archetype],
      packageIds: ["envelope", "combined"],
      cacheVersion: "1.test.abc1234",
    });

    expect(result.available).toEqual([entry.key]);
    expect(result.missing).toEqual([
      {
        archetype,
        packageId: "combined",
        reason: "missing-cache-entry",
      },
    ]);
  });

  test("normalizes cached numeric values and recomputes display-only EPC labels", () => {
    const result = normalizeEntry(makeEntry(), makeDetails(100));

    expect(result).toEqual(
      expect.objectContaining({
        archetype,
        packageId: "envelope",
        cacheVersion: "1.test.abc1234",
        baselineAnnualEnergyKwh: 12_000,
        renovatedAnnualEnergyKwh: 8_000,
        annualEnergySavingsKwh: 4_000,
        baselineAnnualEmissionsTonCo2eq: 2.4,
        renovatedAnnualEmissionsTonCo2eq: 1.6,
        baselineDisplayEpcClass: "C",
        renovatedDisplayEpcClass: "B",
      }),
    );
    expect(result.annualEnergySavingsPercentage).toBeCloseTo(100 / 3);
    expect(result.annualCo2ReductionTon).toBeCloseTo(0.8);
    expect(result.annualCo2ReductionPercentage).toBeCloseTo(100 / 3);
  });

  test("does not treat cached EPC labels as authoritative", () => {
    const entry = makeEntry();

    expect(entry.baseline.displayEpcClass).toBe("G");
    expect(entry.renovated.displayEpcClass).toBe("G");

    const result = normalizeEntry(entry, makeDetails(100));

    expect(result.baselineDisplayEpcClass).toBe("C");
    expect(result.renovatedDisplayEpcClass).toBe("B");
  });

  test("rejects invalid floor area needed for frontend EPC display", () => {
    expect(() => normalizeEntry(makeEntry(), makeDetails(0))).toThrow(
      RSEForecastingCacheServiceError,
    );

    try {
      normalizeEntry(makeEntry(), makeDetails(0));
      expect.fail("Expected normalization to throw");
    } catch (error) {
      expect((error as RSEForecastingCacheServiceError).reason).toBe(
        "invalid-floor-area",
      );
    }
  });

  test("rejects malformed numeric cache values", () => {
    expect(() =>
      normalizeEntry(
        makeEntry({ baselineAnnualEnergyKwh: Number.POSITIVE_INFINITY }),
        makeDetails(),
      ),
    ).toThrow(RSEForecastingCacheServiceError);
  });
});
